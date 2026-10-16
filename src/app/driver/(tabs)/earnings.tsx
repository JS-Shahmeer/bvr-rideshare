import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';

import { BookingCard } from '@/components/Booking';
import { Icon } from '@/components/Icon';
import { EmptyState, Pill, TitleRow } from '@/components/Primitives';
import { BackHeader, Hero, Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TripDetailsSheet } from '@/components/TripSheets';
import { money } from '@/lib/fare';
import { useStore } from '@/state/AppStore';
import { colors, fonts, shadows } from '@/theme';

export default function Earnings() {
  const { bookings } = useStore();
  const [detailId, setDetailId] = useState<string | null>(null);
  const done = bookings.filter((b) => b.status === 'completed');
  const total = done.reduce((s, b) => s + b.fare.total, 0);
  const cash = done.filter((b) => b.payment === 'cash').reduce((s, b) => s + b.fare.total, 0);
  const fees = bookings.reduce((s, b) => s + b.cancellationCharge, 0);
  const detail = bookings.find((b) => b.id === detailId);

  return (
    <Screen header={<BackHeader title="Earnings & history" onBack={() => router.navigate('/driver')} />}>
      <Hero eyebrow="Your business at a glance" title="Trip performance" sub="Keep track of completed rides and payments." />
      <LinearGradient colors={colors.statGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.big}>
        <View style={styles.bubble} />
        <RNText style={styles.bigLabel}>Total completed-trip value</RNText>
        <RNText style={styles.bigValue}>{money(total)}</RNText>
        <RNText style={styles.bigSub}>
          {done.length} completed {done.length === 1 ? 'ride' : 'rides'}
          {fees ? ` · ${money(fees)} in cancellation fees` : ''}
        </RNText>
      </LinearGradient>
      <View style={styles.grid}>
        <Split icon="cash" label="Cash fares" value={money(cash)} />
        <Split icon="credit" label="Online" value={money(total - cash)} />
      </View>

      <TitleRow title="Completed journeys" right={<Pill label={`${done.length} total`} />} style={{ marginTop: 24, marginBottom: 12 }} />
      {done.length ? (
        [...done].reverse().map((b) => <BookingCard key={b.id} booking={b} onPress={() => setDetailId(b.id)} />)
      ) : (
        <EmptyState icon="wallet" title="No earnings yet" body="Completed trips will be listed here with their fare breakdown." />
      )}
      {detail ? <TripDetailsSheet booking={detail} visible onClose={() => setDetailId(null)} /> : null}
    </Screen>
  );
}

function Split({ icon, label, value }: { icon: 'cash' | 'credit'; label: string; value: string }) {
  return (
    <View style={[styles.metric, shadows.card]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={icon} size={15} color="#7D93A6" />
        <Text variant="small" style={{ fontFamily: fonts.bold }}>
          {label}
        </Text>
      </View>
      <RNText style={styles.metricValue}>{value}</RNText>
    </View>
  );
}

const styles = StyleSheet.create({
  big: { padding: 20, borderRadius: 19, overflow: 'hidden' },
  bubble: { position: 'absolute', right: -45, top: -65, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.09)' },
  bigLabel: { color: '#B7D8F3', fontFamily: fonts.medium, fontSize: 12 },
  bigValue: { color: colors.white, fontFamily: fonts.extrabold, fontSize: 32, letterSpacing: -1.2, marginVertical: 5 },
  bigSub: { color: '#D1E8F8', fontFamily: fonts.medium, fontSize: 12 },
  grid: { flexDirection: 'row', gap: 10, marginTop: 12 },
  metric: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: '#E8EEF3', borderRadius: 15, padding: 15, gap: 8 },
  metricValue: { fontFamily: fonts.extrabold, fontSize: 19, color: '#253B52' },
});
