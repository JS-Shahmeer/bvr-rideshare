import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Booking, ServiceArea } from '@/data/types';
import { money } from '@/lib/fare';
import { ACTIVE_STATUSES, STATUS_INFO } from '@/lib/format';
import { useStore } from '@/state/AppStore';
import { colors } from '@/theme';

import { FareBreakdownList, RouteStops } from './Booking';
import { Button } from './Button';
import { Field, LocationField } from './Fields';
import { Icon } from './Icon';
import { Card, Notice } from './Primitives';
import { Sheet } from './Sheet';
import { Text } from './Text';
import { useToast } from './Toast';

export function CancelSheet({ booking, visible, onClose, onCancelled }: { booking: Booking; visible: boolean; onClose: () => void; onCancelled: () => void }) {
  const { settings, cancelRide } = useStore();
  const toast = useToast();
  const fee = settings.cancellationEnabled && ACTIVE_STATUSES.includes(booking.status) ? settings.cancellationFee : 0;
  return (
    <Sheet visible={visible} onClose={onClose} title="Cancel this ride?" description={`Booking ${booking.id} · ${booking.pickup} → ${booking.destination}`}>
      <Notice style={{ marginVertical: 15 }}>
        {fee
          ? `Robert has already confirmed this ride, so a cancellation fee of ${money(fee)} applies.`
          : 'No cancellation fee applies because your driver has not confirmed this ride yet.'}
      </Notice>
      <View style={styles.row}>
        <Button style={{ flex: 1 }} variant="outline" label="Keep ride" onPress={onClose} />
        <Button
          style={{ flex: 1 }}
          variant="danger"
          label="Cancel ride"
          onPress={async () => {
            const r = await cancelRide(booking.id);
            onClose();
            if (!r.ok) return toast(r.error);
            toast('Booking cancelled. Robert has been notified.');
            onCancelled();
          }}
        />
      </View>
    </Sheet>
  );
}

export function ChangeDestinationSheet({ booking, visible, onClose }: { booking: Booking; visible: boolean; onClose: () => void }) {
  const { changeDestination } = useStore();
  const toast = useToast();
  const [dest, setDest] = useState<ServiceArea>(booking.destination);
  useEffect(() => {
    if (visible) setDest(booking.destination);
  }, [visible, booking.destination]);

  return (
    <Sheet visible={visible} onClose={onClose} title="Change destination" description="Choose a different drop-off. Your fare estimate updates automatically.">
      <Field label="New destination">
        <LocationField title="New destination" icon="navigation" value={dest} onChange={setDest} />
      </Field>
      <Notice style={{ marginVertical: 14 }}>Robert will get a notification about the new destination.</Notice>
      <Button
        label="Save new destination"
        onPress={async () => {
          const r = await changeDestination(booking.id, dest);
          if (!r.ok) return toast(r.error);
          onClose();
          if (dest !== booking.destination) toast('Destination updated. Robert has been notified.');
        }}
      />
    </Sheet>
  );
}

/** Trip details with fare receipt; riders can rate completed rides here. */
export function TripDetailsSheet({ booking, visible, onClose, canRate }: { booking: Booking; visible: boolean; onClose: () => void; canRate?: boolean }) {
  const { rateRide } = useStore();
  const toast = useToast();
  const completed = booking.status === 'completed';
  return (
    <Sheet visible={visible} onClose={onClose} title={completed ? 'Trip receipt' : 'Trip details'} description={`${booking.id} · ${STATUS_INFO[booking.status].label}`}>
      <Card flat style={{ marginVertical: 15 }}>
        <RouteStops pickup={booking.pickup} destination={booking.destination} />
      </Card>
      <FareBreakdownList fare={booking.fare} />
      {booking.cancellationCharge ? (
        <Text variant="small" style={{ marginTop: 10, color: '#CE4356' }}>
          Cancellation fee charged: {money(booking.cancellationCharge)}
        </Text>
      ) : null}
      <Text variant="tiny" style={{ marginTop: 10 }}>
        Paid by {booking.payment === 'card' ? 'online payment' : 'cash to driver'} · {booking.passengers} passenger{booking.passengers > 1 ? 's' : ''}
      </Text>
      {booking.payment === 'card' && booking.paymentState && booking.paymentState !== 'none' ? (
        <Text variant="tiny" style={{ marginTop: 4, color: booking.paymentState === 'failed' ? '#CE4356' : colors.muted }}>
          {PAYMENT_LABEL[booking.paymentState]}
        </Text>
      ) : null}
      {completed && canRate ? (
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <Text variant="bodyBold">How was your ride?</Text>
          <View style={{ flexDirection: 'row', gap: 4, marginVertical: 10 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
                onPress={async () => {
                  const r = await rateRide(booking.id, n);
                  toast(r.ok ? 'Thanks for rating your trip!' : r.error);
                }}>
                <Icon name="star" size={30} color={n <= booking.rating ? '#F2A93B' : '#C7D3DE'} fill={n <= booking.rating ? '#F2A93B' : 'none'} />
              </Pressable>
            ))}
          </View>
          <Text variant="tiny">{booking.rating ? 'Thanks for your feedback!' : 'Tap a star to rate your trip.'}</Text>
        </View>
      ) : null}
      <Button style={{ marginTop: 18 }} variant="outline" label="Close" onPress={onClose} />
    </Sheet>
  );
}

const PAYMENT_LABEL = {
  card_saved: 'Card saved. It is charged when the trip ends.',
  processing: 'Card payment processing…',
  paid: 'Card charged.',
  failed: 'Card payment failed. Please pay Robert directly.',
} as const;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
});

