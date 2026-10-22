import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';

import { RouteStops } from '@/components/Booking';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { LiveMap } from '@/components/LiveMap';
import { DemoControls } from '@/components/DemoControls';
import { Card, Divider, EmptyState, StatusPill } from '@/components/Primitives';
import { BackHeader, Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { CancelSheet, ChangeDestinationSheet, TripDetailsSheet } from '@/components/TripSheets';
import type { BookingStatus } from '@/data/types';
import { money } from '@/lib/fare';
import { OPEN_STATUSES, STATUS_INFO, whenLabel } from '@/lib/format';
import { useBooking } from '@/state/AppStore';
import { colors, fonts } from '@/theme';

const ORDER: BookingStatus[] = ['requested', 'accepted', 'enroute', 'arrived', 'inprogress', 'completed'];
const STEPS: [string, BookingStatus][] = [
  ['Requested', 'requested'],
  ['Confirmed', 'accepted'],
  ['En route', 'enroute'],
  ['Riding', 'inprogress'],
];

export default function RideStatus() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const b = useBooking(id);
  const [sheet, setSheet] = useState<'cancel' | 'change' | 'receipt' | null>(null);

  if (!b) {
    return (
      <Screen header={<BackHeader title="Ride status" />}>
        <EmptyState icon="car" title="Ride not found" body="This booking is no longer available." />
      </Screen>
    );
  }

  const at = ORDER.indexOf(b.status);
  const open = OPEN_STATUSES.includes(b.status);

  return (
    <Screen header={<BackHeader title="Your ride" trailing={<StatusPill status={b.status} />} />}>
      <View style={styles.ribbon}>
        <Icon name="car" size={24} color="#0B70B9" />
        <View style={{ flex: 1 }}>
          <Text variant="bodyBold" style={{ color: '#0B70B9' }}>
            {STATUS_INFO[b.status].label}
          </Text>
          <Text variant="tiny" style={{ color: '#668BA8', marginTop: 3 }}>
            Booking {b.id} · {whenLabel(b)}
          </Text>
        </View>
      </View>

      {open || b.status === 'completed' ? (
        <View style={styles.stepper}>
          {STEPS.map(([label, code], i) => {
            const idx = ORDER.indexOf(code);
            const done = at > idx;
            const current = at === idx || (code === 'enroute' && b.status === 'arrived');
            return (
              <View key={code} style={[styles.step, { zIndex: STEPS.length - i }]}>
                {i > 0 ? <View style={[styles.stepLine, (done || current) && { backgroundColor: '#BFE6D6' }]} /> : null}
                <View style={[styles.stepDot, done && styles.stepDone, current && styles.stepActive]}>
                  {done && !current ? (
                    <Icon name="check" size={13} color="#15966D" strokeWidth={2.6} />
                  ) : (
                    <RNText style={[styles.stepNum, current && { color: colors.white }]}>{i + 1}</RNText>
                  )}
                </View>
                <RNText style={[styles.stepLabel, done && { color: '#5D9C86' }, current && { color: '#0768B7' }]}>{label}</RNText>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ height: 16 }} />
      )}

      <LiveMap height={260} label={open ? 'Live trip' : 'Trip route'} pickup={b.pickup} destination={b.destination} status={b.status} />
      <Text variant="tiny" style={{ marginTop: 7, marginBottom: 16 }}>
        Driver position is simulated until live GPS arrives with the backend module.
      </Text>

      <Card>
        <RouteStops pickup={b.pickup} destination={b.destination} />
        <Divider />
        <View style={styles.between}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="clock" size={15} color={colors.muted} />
            <Text variant="bodyBold" style={{ fontSize: 12, color: '#4A6074' }}>
              {b.fare.min} min estimated
            </Text>
          </View>
          <RNText style={styles.total}>{money(b.fare.total)}</RNText>
        </View>
        <Text variant="tiny" style={{ marginTop: 8 }}>
          {b.payment === 'card' ? 'Online payment' : 'Cash to driver'} · {b.passengers} passenger{b.passengers > 1 ? 's' : ''}
        </Text>
      </Card>

      {open ? (
        <View style={styles.actions}>
          <Button style={{ flex: 1 }} variant="outline" icon="edit" label="Change destination" onPress={() => setSheet('change')} />
          <Button style={{ flex: 0.7 }} variant="danger" icon="close" label="Cancel" onPress={() => setSheet('cancel')} />
        </View>
      ) : (
        <Button style={{ marginTop: 13 }} icon="receipt" label={b.status === 'completed' ? 'Receipt & rating' : 'Trip details'} onPress={() => setSheet('receipt')} />
      )}

      <DemoControls booking={b} />

      <CancelSheet booking={b} visible={sheet === 'cancel'} onClose={() => setSheet(null)} onCancelled={() => router.navigate('/trips')} />
      <ChangeDestinationSheet booking={b} visible={sheet === 'change'} onClose={() => setSheet(null)} />
      <TripDetailsSheet booking={b} visible={sheet === 'receipt'} onClose={() => setSheet(null)} canRate />
    </Screen>
  );
}

const styles = StyleSheet.create({
  ribbon: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: '#EAF5FF' },
  stepper: { flexDirection: 'row', paddingVertical: 20 },
  step: { flex: 1, alignItems: 'center' },
  stepLine: { position: 'absolute', top: 14, right: '50%', width: '100%', height: 2, backgroundColor: '#E6EDF3' },
  stepDot: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: '#EAF0F4',
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepDone: { backgroundColor: '#E2F6ED' },
  stepActive: { backgroundColor: colors.primary, borderColor: '#D6ECFD', borderWidth: 4 },
  stepNum: { fontFamily: fonts.extrabold, fontSize: 11, color: '#93A3B2' },
  stepLabel: { fontFamily: fonts.extrabold, fontSize: 10.5, color: '#A1AFBB' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.primary },
  actions: { flexDirection: 'row', gap: 10, marginTop: 13 },
});
