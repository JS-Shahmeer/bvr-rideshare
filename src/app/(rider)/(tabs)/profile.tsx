import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';

import { Button } from '@/components/Button';
import { Field, Input } from '@/components/Fields';
import { Icon, type IconName } from '@/components/Icon';
import { Card } from '@/components/Primitives';
import { BackHeader, Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { money } from '@/lib/fare';
import { initials } from '@/lib/format';
import { useStore } from '@/state/AppStore';
import { colors, fonts } from '@/theme';

export default function Account() {
  const { sessions, settings, updateProfile, signOut, setActiveRole } = useStore();
  const toast = useToast();
  const me = sessions.rider;
  const [name, setName] = useState(me?.name ?? '');
  const [phone, setPhone] = useState(me?.phone ?? '');
  const [policy, setPolicy] = useState(false);

  useEffect(() => {
    setName(me?.name ?? '');
    setPhone(me?.phone ?? '');
  }, [me?.name, me?.phone]);

  return (
    <Screen header={<BackHeader title="My account" onBack={() => router.navigate('/home')} />}>
      <View style={styles.who}>
        <View style={styles.avatar}>
          <RNText style={styles.avatarText}>{initials(me?.name ?? '')}</RNText>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{me?.name}</Text>
          <Text variant="small">{me?.email}</Text>
        </View>
      </View>

      <Card>
        <Field label="Full name" style={{ marginTop: 0 }}>
          <Input value={name} onChangeText={setName} autoComplete="name" />
        </Field>
        <Field label="Phone number">
          <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
        </Field>
        <Button
          style={{ marginTop: 17 }}
          label="Save profile"
          onPress={() => {
            updateProfile({ name, phone });
            toast('Profile saved.');
          }}
        />
      </Card>

      <View style={{ marginTop: 14 }}>
        <MenuRow icon="history" label="My ride history" onPress={() => router.navigate('/trips')} />
        <MenuRow icon="bell" label="Notifications" onPress={() => router.navigate('/notifications')} />
        <MenuRow icon="shield" label="Fees & cancellation info" onPress={() => setPolicy(true)} />
        <MenuRow icon="eye" label="Client demo scenarios" onPress={() => router.push('/demo')} />
        <MenuRow
          icon="car"
          label="Switch to driver view"
          onPress={() => {
            setActiveRole('driver');
            router.replace(sessions.driver ? '/driver' : { pathname: '/sign-in', params: { role: 'driver' } });
          }}
        />
      </View>

      <Button
        style={{ marginTop: 20 }}
        variant="danger"
        icon="logout"
        label="Sign out"
        onPress={() => {
          signOut('rider');
          router.replace({ pathname: '/sign-in', params: { role: 'rider' } });
        }}
      />

      <Sheet
        visible={policy}
        onClose={() => setPolicy(false)}
        title="Fees & cancellations"
        description="Every fare is made up of a distance and time charge plus three fixed fees.">
        <Card flat style={{ marginTop: 12 }}>
          <PolicyLine label="Distance rate" value={`${money(settings.kmRate)} / km`} />
          <PolicyLine label="Time rate" value={`${money(settings.minRate)} / min`} />
          <PolicyLine label="NSW point-to-point fee" value="A$1.25" />
          <PolicyLine label="CTP fee" value="A$1.00" />
          <PolicyLine label="Administration fee" value="A$1.00" />
        </Card>
        <Text variant="subhead" style={{ marginTop: 14 }}>
          {settings.cancellationEnabled
            ? `Cancelling after Robert confirms your ride incurs a ${money(settings.cancellationFee)} cancellation fee. Cancelling before confirmation is free.`
            : 'There is currently no cancellation fee.'}
        </Text>
        <Button style={{ marginTop: 18 }} variant="outline" label="Close" onPress={() => setPolicy(false)} />
      </Sheet>
    </Screen>
  );
}

function MenuRow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.menu} accessibilityRole="button">
      <Icon name={icon} size={19} color="#0E76C7" />
      <Text variant="bodyBold" style={{ flex: 1, fontFamily: fonts.bold }}>
        {label}
      </Text>
      <Icon name="chevron" size={16} color="#A8B6C1" />
    </Pressable>
  );
}

function PolicyLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text variant="body" style={{ color: '#6F8090' }}>
        {label}
      </Text>
      <Text variant="bodyBold">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  who: { flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 8, marginBottom: 20 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#D3E7FA', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 20, color: '#0C66A7' },
  name: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.ink, marginBottom: 3 },
  menu: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 4, borderBottomWidth: 1, borderColor: colors.lineSoft },
});
