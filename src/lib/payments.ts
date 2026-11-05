import { initPaymentSheet, initStripe, presentPaymentSheet } from '@stripe/stripe-react-native';

import type { Result } from '@/state/store';

import { supabase } from './supabase';

type SheetParams = { customer: string; ephemeralKey: string; setupIntent: string; publishableKey: string };

/**
 * Shows Stripe's payment sheet so the rider saves a card. Nothing is charged
 * now: the server charges the card after the trip (or the cancellation fee).
 */
export async function saveCard(name: string): Promise<Result> {
  const unavailable = { ok: false as const, error: 'Card payments are not available right now. Choose cash or try again later.' };
  if (!supabase) return unavailable;
  const { data, error } = await supabase.functions.invoke<SheetParams>('payment-sheet');
  if (error || !data?.setupIntent || !data.publishableKey) return unavailable;

  await initStripe({ publishableKey: data.publishableKey, merchantIdentifier: 'merchant.au.com.bvrrideshare', urlScheme: 'bvrrideshare' });
  const init = await initPaymentSheet({
    merchantDisplayName: 'BVR Rideshare',
    customerId: data.customer,
    customerEphemeralKeySecret: data.ephemeralKey,
    setupIntentClientSecret: data.setupIntent,
    defaultBillingDetails: { name },
    applePay: { merchantCountryCode: 'AU' },
    googlePay: { merchantCountryCode: 'AU', testEnv: data.publishableKey.startsWith('pk_test') },
    returnURL: 'bvrrideshare://stripe-redirect',
  });
  if (init.error) return { ok: false, error: init.error.message };

  const shown = await presentPaymentSheet();
  if (shown.error) {
    return { ok: false, error: shown.error.code === 'Canceled' ? 'No card was saved, so the ride was not booked.' : shown.error.message };
  }
  return { ok: true };
}
