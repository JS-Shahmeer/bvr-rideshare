/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEMO_RIDE_ID, demoBookings, demoNotifications } from './demo.ts';

test('demo bookings put the demo ride at the requested stage', () => {
  const ride = demoBookings('enroute').find((b) => b.id === DEMO_RIDE_ID);
  assert.equal(ride?.status, 'enroute');
  assert.equal(demoBookings().some((b) => b.id === DEMO_RIDE_ID), false);
});

test('a cancelled demo ride carries the cancellation fee', () => {
  const ride = demoBookings('cancelled').find((b) => b.id === DEMO_RIDE_ID);
  assert.equal(ride?.cancellationCharge, 8);
});

test('rider updates follow the ride up to its stage', () => {
  const titles = demoNotifications('arrived').filter((n) => n.role === 'rider' && n.id.startsWith('demo-') && n.id !== 'demo-old').map((n) => n.title);
  assert.deepEqual(titles, ['Driver arrived', 'Driver on the way', 'Ride confirmed', 'Booking request sent']);
});
