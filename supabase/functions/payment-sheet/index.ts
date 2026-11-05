// Called by the app before a card booking: returns what Stripe's PaymentSheet
// needs to save the rider's card for an off-session charge after the trip.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { admin, json, stripe } from '../_shared/clients.ts';

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? '';
  const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: user } = await asUser.auth.getUser();
  if (!user.user) return json({ error: 'Please sign in again.' }, 401);

  const db = admin();
  const { data: profile } = await db.from('profiles').select('id, name, email, phone, stripe_customer_id').eq('id', user.user.id).single();
  if (!profile) return json({ error: 'Profile not found.' }, 404);

  const s = stripe();
  let customer = profile.stripe_customer_id as string | null;
  if (!customer) {
    const created = await s.customers.create({ name: profile.name, email: profile.email, phone: profile.phone, metadata: { profile_id: profile.id } });
    customer = created.id;
    await db.from('profiles').update({ stripe_customer_id: customer }).eq('id', profile.id);
  }

  const [ephemeralKey, setupIntent] = await Promise.all([
    s.ephemeralKeys.create({ customer }, { apiVersion: '2024-06-20' }),
    s.setupIntents.create({ customer, usage: 'off_session', automatic_payment_methods: { enabled: true } }),
  ]);

  return json({
    customer,
    ephemeralKey: ephemeralKey.secret,
    setupIntent: setupIntent.client_secret,
    publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
  });
});
