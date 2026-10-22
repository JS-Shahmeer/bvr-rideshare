/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AREA_COORDS, driverPosition, pointAlong, routeBetween } from './geo.ts';

test('routes run from the first town to the second, in either direction', () => {
  const there = routeBetween('Newcastle', 'Nelson Bay');
  const back = routeBetween('Nelson Bay', 'Newcastle');
  assert.deepEqual(there[0], AREA_COORDS.Newcastle);
  assert.deepEqual(there.at(-1), AREA_COORDS['Nelson Bay']);
  assert.deepEqual(back[0], AREA_COORDS['Nelson Bay']);
  assert.deepEqual(pointAlong(there, 0), AREA_COORDS.Newcastle);
  assert.deepEqual(pointAlong(there, 1), AREA_COORDS['Nelson Bay']);
});

test('driver sits at pickup when arrived and is hidden before acceptance and after drop-off', () => {
  assert.deepEqual(driverPosition('arrived', 'Newcastle', 'Nelson Bay', 0), AREA_COORDS.Newcastle);
  assert.equal(driverPosition('requested', 'Newcastle', 'Nelson Bay', 0), null);
  assert.equal(driverPosition('completed', 'Newcastle', 'Nelson Bay', 0), null);
});
