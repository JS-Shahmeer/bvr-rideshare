import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text as RNText, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useStore } from '@/state/AppStore';
import { initials } from '@/lib/format';
import { colors, fonts, PAD_X } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

/** Safe-area page with a scrolling body. `header` stays fixed above the scroll area. */
export function Screen({
  header,
  children,
  padded = true,
  ...scroll
}: { header?: React.ReactNode; children: React.ReactNode; padded?: boolean } & ScrollViewProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {header}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[padded && { paddingHorizontal: PAD_X }, { paddingBottom: 28 }]}
        showsVerticalScrollIndicator={false}
        {...scroll}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function BackHeader({ title, trailing, onBack }: { title: string; trailing?: React.ReactNode; onBack?: () => void }) {
  return (
    <View style={styles.backHead}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={8}
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        style={styles.backBtn}>
        <Icon name="left" size={19} />
      </Pressable>
      <Text variant="screenTitle" style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </Text>
      {trailing}
    </View>
  );
}

/** Title block used at the top of most screens. */
export function Hero({ eyebrow, title, sub, style }: { eyebrow?: string; title: string; sub?: string; style?: object }) {
  return (
    <View style={[{ marginTop: 6, marginBottom: 18 }, style]}>
      {eyebrow ? <Text variant="eyebrow">{eyebrow}</Text> : null}
      <Text variant="headline" style={{ marginTop: eyebrow ? 8 : 0, marginBottom: 6 }}>
        {title}
      </Text>
      {sub ? <Text variant="subhead">{sub}</Text> : null}
    </View>
  );
}

function BellButton({ href, unread }: { href: '/notifications' | '/driver/notifications'; unread: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push(href)} style={styles.iconBtn}>
      <Icon name="bell" size={20} />
      {unread ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

function Avatar({ label, onPress, a11y }: { label: string; onPress: () => void; a11y: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress} style={styles.avatar}>
      <RNText style={styles.avatarText}>{label}</RNText>
    </Pressable>
  );
}

export function RiderHeader() {
  const { notifications, sessions } = useStore();
  const unread = notifications.some((n) => n.role === 'rider' && !n.read);
  return (
    <View style={styles.brandHeader}>
      <Image source={require('@/../assets/images/logo.png')} style={styles.logo} contentFit="contain" accessibilityLabel="BVR Rideshare" />
      <View style={styles.actions}>
        <BellButton href="/notifications" unread={unread} />
        <Avatar label={initials(sessions.rider?.name ?? '')} a11y="Account" onPress={() => router.navigate('/profile')} />
      </View>
    </View>
  );
}

export function DriverHeader() {
  const { notifications, sessions } = useStore();
  const unread = notifications.some((n) => n.role === 'driver' && !n.read);
  return (
    <View style={styles.brandHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <View style={styles.carTile}>
          <Icon name="car" size={23} color={colors.primary} />
        </View>
        <View>
          <Text variant="bodyBold">BVR Rideshare</Text>
          <Text variant="tiny">Driver portal</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <BellButton href="/driver/notifications" unread={unread} />
        <Avatar label={initials(sessions.driver?.name ?? 'Robert Burns')} a11y="Driver settings" onPress={() => router.push('/driver/settings')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  backHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: PAD_X, paddingTop: 12, paddingBottom: 14 },
  backBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: '#E8EDF2', alignItems: 'center', justifyContent: 'center' },
  brandHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: PAD_X, paddingTop: 10, paddingBottom: 8 },
  logo: { width: 104, height: 44 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F8FC' },
  badge: { position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.white },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#D3E7FA', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 13, color: '#0C66A7' },
  carTile: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#EDF5FC', alignItems: 'center', justifyContent: 'center' },
});
