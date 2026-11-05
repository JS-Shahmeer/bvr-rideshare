// Target of two Supabase Database Webhooks (see supabase/README.md):
//   bookings UPDATE      → charge the saved card when a card trip completes or
//                          is cancelled with a fee
//   notifications INSERT → send a push notification to the user's devices
import { chargeFor, type BookingRow } from '../_shared/charges.ts';
import { admin, json, stripe } from '../_shared/clients.ts';
import { pushMessages, type NotificationRow } from '../_shared/push.ts';

type Payload =
  | { type: 'UPDATE'; table: 'bookings'; record: BookingRow; old_record: BookingRow | null }
  | { type: 'INSERT'; table: 'notifications'; record: NotificationRow };

Deno.serve(async (req) => {
  if (req.headers.get('x-events-secret') !== Deno.env.get('EVENTS_SECRET')) return json({ error: 'forbidden' }, 403);
  const event = (await req.json()) as Payload;
  if (event.table === 'bookings') return json(await handleBooking(event.record, event.old_record));
  if (event.table === 'notifications') return json(await handlePush(event.record));
  return json({ skipped: true });
});

async function handleBooking(after: BookingRow, before: BookingRow | null) {
  const charge = chargeFor(before, after);
  if (!charge || !after.rider_id) return { charged: false };
  const db = admin();
  const { data: profile } = await db.from('profiles').select('stripe_customer_id').eq('id', after.rider_id).single();
  const customer = profile?.stripe_customer_id as string | undefined;
  if (!customer) {
    await db.rpc('record_payment', { p_id: after.id, p_state: 'failed', p_intent: null });
    return { charged: false, reason: 'no customer' };
  }

  await db.rpc('record_payment', { p_id: after.id, p_state: 'processing', p_intent: null });
  const s = stripe();
  try {
    const methods = await s.paymentMethods.list({ customer, limit: 1 });
    const method = methods.data[0];
    if (!method) throw new Error('No saved card');
    const intent = await s.paymentIntents.create(
      {
        amount: charge.cents,
        currency: 'aud',
        customer,
        payment_method: method.id,
        off_session: true,
        confirm: true,
        description: charge.description,
        metadata: { booking_id: after.id, kind: charge.kind },
      },
      { idempotencyKey: `${after.id}-${charge.kind}` },
    );
    const state = intent.status === 'succeeded' ? 'paid' : intent.status === 'processing' ? 'processing' : 'failed';
    await db.rpc('record_payment', { p_id: after.id, p_state: state, p_intent: intent.id });
    return { charged: state !== 'failed', intent: intent.id };
  } catch (e) {
    await db.rpc('record_payment', { p_id: after.id, p_state: 'failed', p_intent: null });
    await db.rpc('notify_payment_failed', { p_id: after.id });
    return { charged: false, reason: (e as Error).message };
  }
}

async function handlePush(n: NotificationRow) {
  const db = admin();
  const { data } = await db.from('push_tokens').select('token').eq('user_id', n.user_id);
  const messages = pushMessages(n, (data ?? []).map((r) => r.token as string));
  if (!messages.length) return { sent: 0 };
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  return { sent: messages.length, status: res.status };
}
