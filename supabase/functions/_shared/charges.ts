/** Row shapes the database webhooks send for bookings. */
export type BookingRow = {
  id: string;
  rider_id: string | null;
  status: string;
  payment: 'cash' | 'card';
  payment_state: 'none' | 'card_saved' | 'processing' | 'paid' | 'failed';
  fare: { total: number };
  cancellation_charge: number;
};

export type Charge = { kind: 'fare' | 'cancellation'; cents: number; description: string };

/**
 * What to charge the rider's saved card, if anything, when a booking row
 * changes from `before` to `after`. Pure so it can be unit tested.
 */
export function chargeFor(before: BookingRow | null, after: BookingRow): Charge | null {
  if (after.payment !== 'card' || after.payment_state !== 'card_saved') return null;
  if (before?.status === after.status) return null;
  if (after.status === 'completed') {
    return { kind: 'fare', cents: Math.round(Number(after.fare.total) * 100), description: `BVR Rideshare trip ${after.id}` };
  }
  if (after.status === 'cancelled' && Number(after.cancellation_charge) > 0) {
    return { kind: 'cancellation', cents: Math.round(Number(after.cancellation_charge) * 100), description: `BVR Rideshare cancellation fee ${after.id}` };
  }
  return null;
}
