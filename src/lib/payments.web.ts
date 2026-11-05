import type { Result } from '@/state/store';

/** Stripe's payment sheet is native only; the web build books cash rides. */
export async function saveCard(_name: string): Promise<Result> {
  return { ok: false, error: 'Card payment is available in the mobile app. Choose cash to book here.' };
}
