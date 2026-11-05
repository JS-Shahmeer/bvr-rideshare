/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { chargeFor, type BookingRow } from './charges.ts';
import { pushMessages } from './push.ts';

const base: BookingRow = { id: 'BVR-1', rider_id: 'u', status: 'inprogress', payment: 'card', payment_state: 'card_saved', fare: { total: 101.05 }, cancellation_charge: 0 };

test('a completed card trip charges the fare in cents', () => {
  assert.deepEqual(chargeFor(base, { ...base, status: 'completed' }), { kind: 'fare', cents: 10105, description: 'BVR Rideshare trip BVR-1' });
});

test('a cancellation with a fee charges the fee; a free one charges nothing', () => {
  assert.equal(chargeFor(base, { ...base, status: 'cancelled', cancellation_charge: 8 })?.cents, 800);
  assert.equal(chargeFor(base, { ...base, status: 'cancelled' }), null);
});

test('cash trips, unsaved cards, repeats and paid bookings are never charged', () => {
  assert.equal(chargeFor(base, { ...base, status: 'completed', payment: 'cash' }), null);
  assert.equal(chargeFor(base, { ...base, status: 'completed', payment_state: 'none' }), null);
  assert.equal(chargeFor(base, { ...base, status: 'completed', payment_state: 'paid' }), null);
  const done = { ...base, status: 'completed' };
  assert.equal(chargeFor(done, done), null);
});

test('push messages go only to Expo tokens', () => {
  const n = { id: '1', user_id: 'u', title: 'Ride confirmed', message: 'Robert accepted', booking_id: 'BVR-1', role: 'rider' };
  const out = pushMessages(n, ['ExponentPushToken[abc]', 'not-a-token']);
  assert.equal(out.length, 1);
  assert.equal(out[0].to, 'ExponentPushToken[abc]');
  assert.equal(out[0].data.bookingId, 'BVR-1');
});
