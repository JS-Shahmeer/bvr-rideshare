import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Field, Input } from '@/components/Fields';
import { Icon } from '@/components/Icon';
import { Segmented } from '@/components/Primitives';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { DEMO_ACCOUNTS } from '@/data/seed';
import type { Role } from '@/data/types';
import { useStore } from '@/state/AppStore';
import { colors, fonts, shadows } from '@/theme';

export function AuthScreen({ mode, role: initialRole }: { mode: 'signin' | 'signup'; role: Role }) {
  const store = useStore();
  const toast = useToast();
  const [role, setRole] = useState<Role>(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const owner = role === 'driver';
  const signup = mode === 'signup';

  const switchRole = (r: Role) => {
    setRole(r);
    setError('');
    store.setActiveRole(r);
  };

  const goMode = (m: 'signin' | 'signup') => router.replace({ pathname: m === 'signin' ? '/sign-in' : '/sign-up', params: { role } });

  async function submit() {
    setError('');
    if (signup) {
      if (password !== confirm) return setError('Passwords do not match.');
      if (!agree) return setError('Please accept the terms to continue.');
    }
    setBusy(true);
    const res = signup ? await store.signUp(role, { name, email, phone, password }) : await store.signIn(role, email, password);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast(owner ? 'Welcome back, Robert!' : 'Welcome to BVR Rideshare!');
    router.replace(owner ? '/driver' : '/home');
  }

  const fillDemo = () => {
    setEmail(DEMO_ACCOUNTS[role].email);
    setPassword(DEMO_ACCOUNTS[role].password);
    setError('');
  };

  const heading = signup ? (owner ? 'Set up your owner account' : 'Create your account') : owner ? 'Welcome back, Robert.' : 'Welcome back.';
  const sub = signup
    ? owner
      ? 'Owner access for managing your ride service.'
      : 'A few details and you’re ready to book your first trip.'
    : owner
      ? 'Sign in to see requests and manage your rides.'
      : 'Sign in to book rides and manage your journeys.';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <LinearGradient colors={['#EAF4FE', '#FFFFFF']} style={StyleSheet.absoluteFill} start={{ x: 1, y: 0 }} end={{ x: 0.3, y: 0.5 }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.topline}>
            <View style={styles.smallLogo}>
              <View style={styles.logoTile}>
                <Image source={require('@/../assets/images/logo.png')} style={{ width: 34, height: 22 }} contentFit="contain" />
              </View>
              <RNText style={styles.brand}>BVR RIDESHARE</RNText>
            </View>
            <Segmented
              style={{ width: 170 }}
              value={role}
              onChange={switchRole}
              options={[
                { value: 'rider', label: 'Rider' },
                { value: 'driver', label: 'Driver' },
              ]}
            />
          </View>

          <LinearGradient colors={owner ? ['#0A72B6', '#163F68'] : ['#0783DC', '#0764B8']} style={[styles.symbol, shadows.button]}>
            <Icon name={owner ? 'car' : 'pin'} size={26} color={colors.white} />
          </LinearGradient>
          <Text style={styles.heading}>{heading}</Text>
          <Text variant="subhead" style={{ marginBottom: 20 }}>
            {sub}
          </Text>

          <Segmented
            value={mode}
            onChange={goMode}
            options={[
              { value: 'signin', label: 'Sign in' },
              { value: 'signup', label: owner ? 'Owner setup' : 'Sign up' },
            ]}
          />

          {signup ? (
            <Field label="Full name">
              <Input icon="user" value={name} onChangeText={setName} placeholder={owner ? 'Robert Burns' : 'Your full name'} autoComplete="name" textContentType="name" />
            </Field>
          ) : null}
          <Field label="Email address">
            <Input
              icon="mail"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
            />
          </Field>
          {signup ? (
            <Field label="Mobile number">
              <Input icon="phone" value={phone} onChangeText={setPhone} placeholder="04XX XXX XXX" keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
            </Field>
          ) : null}
          <Field label="Password">
            <Input
              icon="lock"
              value={password}
              onChangeText={setPassword}
              placeholder={signup ? 'At least 8 characters' : 'Enter your password'}
              secureTextEntry={!showPw}
              autoCapitalize="none"
              textContentType={signup ? 'newPassword' : 'password'}
              onSubmitEditing={signup ? undefined : submit}
              right={
                <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={10} accessibilityLabel={showPw ? 'Hide password' : 'Show password'}>
                  <Icon name="eye" size={17} color="#7D93A6" />
                </Pressable>
              }
            />
          </Field>
          {signup ? (
            <Field label="Confirm password">
              <Input icon="lock" value={confirm} onChangeText={setConfirm} placeholder="Repeat your password" secureTextEntry={!showPw} autoCapitalize="none" />
            </Field>
          ) : (
            <Pressable onPress={() => toast('Password reset arrives with secure sign-in in the next module.')} style={styles.forgot}>
              <RNText style={styles.link}>Forgot password?</RNText>
            </Pressable>
          )}

          {signup ? (
            <Pressable onPress={() => setAgree((v) => !v)} style={styles.check} accessibilityRole="checkbox" accessibilityState={{ checked: agree }}>
              <View style={[styles.box, agree && styles.boxOn]}>{agree ? <Icon name="check" size={13} color={colors.white} strokeWidth={3} /> : null}</View>
              <Text variant="small" style={{ flex: 1, lineHeight: 17 }}>
                I agree to the BVR Rideshare terms of service and privacy policy.
              </Text>
            </Pressable>
          ) : null}

          {error ? (
            <Text variant="small" style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <Button
            style={{ marginTop: 18 }}
            variant={owner ? 'owner' : 'primary'}
            label={busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
            trailingIcon="right"
            loading={busy}
            onPress={submit}
          />

          {!signup ? (
            <>
              <View style={styles.divider}>
                <View style={styles.rule} />
                <RNText style={styles.dividerText}>OR PREVIEW THE APP</RNText>
                <View style={styles.rule} />
              </View>
              <Pressable onPress={fillDemo} style={styles.demo} accessibilityRole="button">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="sparkle" size={16} color={colors.primary} />
                  <RNText style={[styles.link, { flex: 1 }]}>Fill demo credentials</RNText>
                  <Icon name="chevron" size={16} color={colors.primary} />
                </View>
                <Text variant="small" style={{ marginTop: 6 }}>
                  {DEMO_ACCOUNTS[role].email} · Password: {DEMO_ACCOUNTS[role].password}
                </Text>
              </Pressable>
            </>
          ) : null}

          <Text variant="tiny" style={styles.disclaimer}>
            {owner ? 'Single-driver owner workspace' : 'Local rides across Newcastle, Medowie, Maitland & Nelson Bay'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 30 },
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 },
  smallLogo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoTile: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  brand: { fontFamily: fonts.extrabold, fontSize: 12, color: colors.ink, letterSpacing: 0.4 },
  symbol: { width: 54, height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  heading: { fontFamily: fonts.extrabold, fontSize: 30, letterSpacing: -1.1, color: colors.ink, marginBottom: 8 },
  forgot: { alignSelf: 'flex-end', paddingVertical: 10 },
  link: { fontFamily: fonts.extrabold, fontSize: 12.5, color: colors.primary },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16 },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: '#BFD0DF', alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  error: { color: '#CE4356', marginTop: 14, fontFamily: fonts.bold },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  rule: { flex: 1, height: 1, backgroundColor: colors.line },
  dividerText: { fontFamily: fonts.extrabold, fontSize: 10, letterSpacing: 1.2, color: '#9AABBA' },
  demo: { borderWidth: 1, borderColor: '#D9E8F5', backgroundColor: '#F3F8FD', borderRadius: 13, padding: 14 },
  disclaimer: { textAlign: 'center', marginTop: 28, lineHeight: 16 },
});
