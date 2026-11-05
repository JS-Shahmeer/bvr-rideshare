// Stripe webhook: records payments that finish (or fail) after the initial
// off-session attempt, e.g. bank-side processing delays.
import { admin, json, stripe } from '../_shared/clients.ts';

Deno.serve(async (req) => {
  const s = stripe();
  let event;
  try {
    event = await s.webhooks.constructEventAsync(await req.text(), req.headers.get('stripe-signature') ?? '', Deno.env.get('STRIPE_WEBHOOK_SECRET')!);
  } catch {
    return json({ error: 'bad signature' }, 400);
  }
  const intent = event.data.object as { id: string; metadata?: { booking_id?: string } };
  const booking = intent.metadata?.booking_id;
  if (!booking) return json({ skipped: true });
  const state = event.type === 'payment_intent.succeeded' ? 'paid' : event.type === 'payment_intent.payment_failed' ? 'failed' : null;
  if (state) await admin().rpc('record_payment', { p_id: booking, p_state: state, p_intent: intent.id });
  return json({ received: true });
});
