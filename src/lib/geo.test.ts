/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AREA_COORDS, driverPosition, pointAlong, routePath } from './geo.ts';

const { Newcastle, 'Nelson Bay': NelsonBay } = AREA_COORDS;

test('route path starts and ends at the stops', () => {
  const path = routePath(Newcastle, NelsonBay);
  assert.deepEqual(path[0], Newcastle);
  assert.ok(Math.abs(path.at(-1)!.latitude - NelsonBay.latitude) < 1e-9);
  assert.deepEqual(pointAlong(path, 0), Newcastle);
});

test('driver sits at pickup when arrived and is hidden before acceptance', () => {
  assert.deepEqual(driverPosition('arrived', Newcastle, NelsonBay, 0), Newcastle);
  assert.equal(driverPosition('requested', Newcastle, NelsonBay, 0), null);
  assert.deepEqual(driverPosition('completed', Newcastle, NelsonBay, 0), NelsonBay);
});
