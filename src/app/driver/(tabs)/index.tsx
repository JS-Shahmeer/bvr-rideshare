import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text as RNText, View } from 'react-native';

import { RouteStops } from '@/components/Booking';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { Card, EmptyState, Pill, TextAction, TitleRow, Toggle } from '@/components/Primitives';
import { DriverHeader, Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { money } from '@/lib/fare';
import { ACTIVE_STATUSES, whenLabel } from '@/lib/format';
import { useRequestActions } from '@/screens/RequestCard';
import { useStore } from '@/state/AppStore';
import { colors, fonts, PAD_X, shadows } from '@/theme';

export default function DriverDashboard() {
  const { bookings, driverOnline, toggleOnline, sessions } = useStore();
  const toast = useToast();
  const actions = useRequestActions();

  const pending = bookings.filter((b) => b.status === 'requested');
  const active = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status));
  const earnings = bookings.filter((b) => b.status === 'completed').reduce((s, b) => s + b.fare.total, 0);
  const first = pending[pending.length - 1];
  const firstName = (sessions.driver?.name ?? 'Robert').split(' ')[0];

  return (
    <Screen header={<DriverHeader />} padded={false}>
      <LinearGradient colors={colors.ownerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
        <View style={styles.ring} />
        <RNText style={styles.greeting}>Good day, {firstName}</RNText>
        <RNText style={styles.h1}>Ready to drive?</RNText>
        <View style={styles.avail}>
          <View style={[styles.dot, { backgroundColor: driverOnline ? '#7FF0B8' : '#FFCA89' }]} />
          <RNText style={styles.availText}>{driverOnline ? 'You’re available' : 'You’re offline'}</RNText>
          <Toggle label="Toggle availability" value={driverOnline} onChange={() => toast(toggleOnline() ? 'You are now available.' : 'Availability switched off.')} />
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: PAD_X, marginTop: -14 }}>
        <View style={styles.grid}>
          <Metric icon="calendar" label="Bookings" value={String(bookings.length)} sub="All trips" />
          <Metric icon="clock" label="New requests" value={String(pending.length)} sub="Awaiting action" />
          <Metric icon="car" label="Active rides" value={String(active.length)} sub="In your schedule" />
          <Metric icon="wallet" label="Earnings" value={money(earnings)} sub="Completed trips" small />
        </View>

        <TitleRow title="Booking requests" right={<TextAction label="View all" onPress={() => router.navigate('/driver/requests')} />} style={{ marginTop: 24 }} />
        <View style={{ marginTop: 10 }}>
          {first ? (
            <Card>
              <View style={styles.reqHead}>
                <Pill label="New request" tone="orange" icon="bell" />
                <Text variant="tiny" style={{ fontFamily: fonts.extrabold }}>
                  {first.id}
                </Text>
              </View>
              <Text variant="bodyBold" style={{ fontSize: 14 }}>
                {first.name}
              </Text>
              <Text variant="tiny" style={{ marginTop: 3, marginBottom: 14 }}>
                {whenLabel(first)} · {money(first.fare.total)}
              </Text>
              <RouteStops pickup={first.pickup} destination={first.destination} />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                <Button style={{ flex: 1 }} variant="success" label="Accept request" onPress={() => actions.accept(first.id)} />
                <Button style={{ flex: 0.8 }} variant="outline" label="Details" onPress={() => router.navigate('/driver/requests')} />
              </View>
            </Card>
          ) : (
            <EmptyState icon="calendar" title="All caught up" body="New booking requests will appear here." />
          )}
        </View>

        <TitleRow title="Quick actions" style={{ marginTop: 24 }} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <Button style={{ flex: 1 }} variant="neutral" icon="navigation" label="Active rides" onPress={() => router.navigate('/driver/navigate')} />
          <Button style={{ flex: 1 }} variant="neutral" icon="settings" label="Fares & settings" onPress={() => router.push('/driver/settings')} />
        </View>
      </View>
    </Screen>
  );
}

function Metric({ icon, label, value, sub, small }: { icon: IconName; label: string; value: string; sub: string; small?: boolean }) {
  return (
    <View style={[styles.metric, shadows.card]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={icon} size={15} color="#7D93A6" />
        <Text variant="small" style={{ fontFamily: fonts.bold }}>
          {label}
        </Text>
      </View>
      <RNText style={[styles.metricValue, small && { fontSize: 20 }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </RNText>
      <Text variant="tiny" style={{ color: '#93A5B2' }}>
        {sub}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { paddingHorizontal: PAD_X, paddingTop: 20, paddingBottom: 34, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: 'hidden' },
  ring: { position: 'absolute', right: -40, top: 20, width: 190, height: 190, borderRadius: 95, borderWidth: 30, borderColor: 'rgba(255,255,255,0.05)' },
  greeting: { color: '#BED7EE', fontFamily: fonts.medium, fontSize: 13 },
  h1: { color: colors.white, fontFamily: fonts.extrabold, fontSize: 27, letterSpacing: -0.9, marginTop: 4, marginBottom: 16 },
  avail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.19)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  availText: { color: colors.white, fontFamily: fonts.extrabold, fontSize: 12.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { width: '48%', flexGrow: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: '#E8EEF3', borderRadius: 15, padding: 15, gap: 8 },
  metricValue: { fontFamily: fonts.extrabold, fontSize: 27, letterSpacing: -1, color: '#253B52' },
  reqHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
});
