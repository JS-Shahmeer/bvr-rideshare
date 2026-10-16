import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, Text as RNText, View } from 'react-native';

import { RouteStops } from '@/components/Booking';
import { Button } from '@/components/Button';
import { Field, SelectField } from '@/components/Fields';
import { Icon } from '@/components/Icon';
import { MapIllustration } from '@/components/MapIllustration';
import { Card, Divider, EmptyState, Pill, StatusPill } from '@/components/Primitives';
import { BackHeader, Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import type { BookingStatus } from '@/data/types';
import { money } from '@/lib/fare';
import { ACTIVE_STATUSES, whenLabel } from '@/lib/format';
import { useStore } from '@/state/AppStore';
import { colors, fonts, PAD_X } from '@/theme';

const NEXT_ACTION: Partial<Record<BookingStatus, string>> = {
  accepted: 'Head to pickup',
  enroute: 'Mark arrived',
  arrived: 'Start trip',
  inprogress: 'Complete ride',
};

const STAGE: Partial<Record<BookingStatus, string>> = {
  accepted: 'Head to pickup',
  enroute: 'Approaching pickup',
  arrived: 'Customer pickup',
  inprogress: 'On the journey',
};

export default function DriverNavigate() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { bookings, advanceRide } = useStore();
  const toast = useToast();
  const [done, setDone] = useState<string | null>(null);

  const rides = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status));
  const b = rides.find((r) => r.id === params.id) ?? rides[0];
  const header = (trailing?: React.ReactNode) => <BackHeader title="Trip navigation" onBack={() => router.navigate('/driver')} trailing={trailing} />;

  if (!b) {
    return (
      <Screen header={header()}>
        <EmptyState
          icon="navigation"
          title="No active journeys"
          body="Accept a booking to start managing a route."
          action={<Button variant="outline" label="View booking requests" trailingIcon="arrow" onPress={() => router.navigate('/driver/requests')} />}
        />
        <Sheet visible={!!done} onClose={() => setDone(null)} title="Trip completed" description={`Booking ${done} is complete and the rider has their receipt.`}>
          <Button style={{ marginTop: 16 }} label="View earnings" onPress={() => (setDone(null), router.navigate('/driver/earnings'))} />
        </Sheet>
      </Screen>
    );
  }

  const advance = () => {
    const next = advanceRide(b.id);
    if (next === 'completed') setDone(b.id);
    else toast('Ride status updated. Rider notified.');
  };

  const openMaps = () => {
    const target = b.status === 'inprogress' ? b.destination : b.pickup;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${target}, NSW`)}`).catch(() => {});
  };

  return (
    <Screen header={header(<StatusPill status={b.status} />)} padded={false}>
      <View style={{ paddingHorizontal: PAD_X }}>
        <View style={styles.pathbar}>
          <Icon name="navigation" size={15} color="#72BAFF" />
          <RNText style={styles.pathText}>{STAGE[b.status]}</RNText>
        </View>
      </View>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <MapIllustration height={260} />
      </View>
      <View style={{ paddingHorizontal: PAD_X }}>
        <Card>
          <RouteStops pickup={b.pickup} destination={b.destination} />
          <Divider />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text variant="tiny">Customer</Text>
              <Text variant="bodyBold" style={{ marginTop: 2 }}>
                {b.name}
              </Text>
              <Text variant="tiny" style={{ marginTop: 2 }}>
                {b.phone}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="tiny">Estimated fare</Text>
              <RNText style={styles.fare}>{money(b.fare.total)}</RNText>
            </View>
          </View>
          <Text variant="tiny" style={{ marginTop: 10 }}>
            {whenLabel(b)} · {b.passengers} passenger{b.passengers > 1 ? 's' : ''} · {b.payment === 'cash' ? 'Cash' : 'Online'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Button style={{ flex: 1 }} variant="neutral" icon="phone" label="Call rider" onPress={() => Linking.openURL(`tel:${b.phone.replace(/\s/g, '')}`).catch(() => {})} />
            <Button style={{ flex: 1 }} variant="neutral" icon="compass" label="Open in Maps" onPress={openMaps} />
          </View>
        </Card>

        <View style={styles.progress}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="bodyBold">Next action</Text>
            <Pill label="Updates the rider" tone="blue" />
          </View>
          <Text variant="small" style={{ lineHeight: 17, marginVertical: 10 }}>
            Each step keeps the rider informed of where you are.
          </Text>
          <Button variant="success" icon="arrow" label={NEXT_ACTION[b.status] ?? 'Trip action'} onPress={advance} />
        </View>

        {rides.length > 1 ? (
          <Field label="Switch active booking" style={{ marginTop: 20 }}>
            <SelectField
              title="Active bookings"
              icon="list"
              value={b.id}
              options={rides.map((r) => r.id)}
              format={(id) => {
                const r = rides.find((x) => x.id === id)!;
                return `${r.id} · ${r.pickup} → ${r.destination}`;
              }}
              onChange={(id) => router.setParams({ id })}
            />
          </Field>
        ) : null}
      </View>
      <Sheet visible={!!done} onClose={() => setDone(null)} title="Trip completed" description={`Booking ${done} is complete and the rider has their receipt.`}>
        <Button style={{ marginTop: 16 }} label="View earnings" onPress={() => (setDone(null), router.navigate('/driver/earnings'))} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pathbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, backgroundColor: '#112A43', borderRadius: 13 },
  pathText: { color: colors.white, fontFamily: fonts.extrabold, fontSize: 12.5 },
  fare: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.primary, marginTop: 2 },
  progress: { marginTop: 12, backgroundColor: '#ECF6FE', borderWidth: 1, borderColor: '#D9EDFA', borderRadius: 15, padding: 15 },
});
