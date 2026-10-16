/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fareEstimate, money, routeMetrics } from './fare.ts';

const rates = { kmRate: 1.25, minRate: 0.35 };

test('route metrics are symmetric', () => {
  assert.deepEqual(routeMetrics('Newcastle', 'Nelson Bay'), routeMetrics('Nelson Bay', 'Newcastle'));
});

test('same pickup and destination has no distance', () => {
  assert.deepEqual(routeMetrics('Maitland', 'Maitland'), { km: 0, min: 0 });
});

test('fare adds distance, time and the three fixed fees', () => {
  const f = fareEstimate('Newcastle', 'Nelson Bay', rates);
  assert.equal(f.distance, 77.5);
  assert.equal(f.time, 20.3);
  assert.equal(f.nsw + f.ctp + f.admin, 3.25);
  assert.equal(f.total, 101.05);
});

test('money formats AUD with two decimals', () => {
  assert.equal(money(8), 'A$8.00');
  assert.equal(money(101.05), 'A$101.05');
});
