import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { RouteStops } from '@/components/Booking';
import { Button } from '@/components/Button';
import { Card, Divider, InfoPair, StatusPill } from '@/components/Primitives';
import { Sheet } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { TripDetailsSheet } from '@/components/TripSheets';
import type { Booking } from '@/data/types';
import { money } from '@/lib/fare';
import { ACTIVE_STATUSES, whenLabel } from '@/lib/format';
import { useStore } from '@/state/AppStore';

/** Accept/decline handling shared by the dashboard and the requests list. */
export function useRequestActions() {
  const { acceptBooking, declineBooking } = useStore();
  const toast = useToast();
  return {
    accept(id: string) {
      const r = acceptBooking(id);
      if (!r.ok) return toast(r.error);
      toast('Booking accepted. Rider notified.');
      router.navigate({ pathname: '/driver/navigate', params: { id } });
    },
    decline(id: string) {
      declineBooking(id);
      toast('Request declined.');
    },
  };
}

export function DeclineSheet({ booking, visible, onClose, onConfirm }: { booking: Booking; visible: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Decline request?" description={`${booking.name}’s booking ${booking.id} will be marked declined and they’ll be notified.`}>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <Button style={{ flex: 1 }} variant="outline" label="Go back" onPress={onClose} />
        <Button
          style={{ flex: 1 }}
          variant="danger"
          label="Decline request"
          onPress={() => {
            onClose();
            onConfirm();
          }}
        />
      </View>
    </Sheet>
  );
}

export function RequestCard({ booking: b }: { booking: Booking }) {
  const actions = useRequestActions();
  const [sheet, setSheet] = useState<'decline' | 'details' | null>(null);
  return (
    <Card style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="bodyBold">{b.name}</Text>
        <StatusPill status={b.status} />
      </View>
      <Text variant="tiny" style={{ marginTop: 4 }}>
        {b.id} · {whenLabel(b)}
      </Text>
      <Divider style={{ marginVertical: 12 }} />
      <RouteStops pickup={b.pickup} destination={b.destination} />
      <View style={{ marginTop: 8 }}>
        <InfoPair label="Phone" value={b.phone} />
        <InfoPair label="Passengers" value={String(b.passengers)} />
        <InfoPair label="Payment method" value={b.payment === 'cash' ? 'Cash' : 'Online'} />
        <InfoPair label="Estimated fare" value={money(b.fare.total)} last />
      </View>
      {b.status === 'requested' ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <Button style={{ flex: 1 }} variant="success" icon="check" label="Accept" onPress={() => actions.accept(b.id)} />
          <Button style={{ flex: 1 }} variant="danger" label="Decline" onPress={() => setSheet('decline')} />
        </View>
      ) : (
        <Button
          style={{ marginTop: 14 }}
          variant="outline"
          label="View ride details"
          onPress={() => (ACTIVE_STATUSES.includes(b.status) ? router.navigate({ pathname: '/driver/navigate', params: { id: b.id } }) : setSheet('details'))}
        />
      )}
      <DeclineSheet booking={b} visible={sheet === 'decline'} onClose={() => setSheet(null)} onConfirm={() => actions.decline(b.id)} />
      <TripDetailsSheet booking={b} visible={sheet === 'details'} onClose={() => setSheet(null)} />
    </Card>
  );
}
