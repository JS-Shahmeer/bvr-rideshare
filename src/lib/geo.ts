import type { BookingStatus, ServiceArea } from '../data/types.ts';

export type LatLng = { latitude: number; longitude: number };

/** Town-centre pickup points for each service area. */
export const AREA_COORDS: Record<ServiceArea, LatLng> = {
  Newcastle: { latitude: -32.9267, longitude: 151.7789 },
  Medowie: { latitude: -32.7414, longitude: 151.8676 },
  Maitland: { latitude: -32.7335, longitude: 151.5574 },
  'Nelson Bay': { latitude: -32.7186, longitude: 152.1435 },
};

/** Region that frames all four service areas. */
export const SERVICE_REGION = { latitude: -32.81, longitude: 151.85, latitudeDelta: 0.42, longitudeDelta: 0.72 };

/**
 * Gently curved path between two points, so the route reads as a drive rather
 * than a ruler line. Module 2 swaps this for the routing provider's polyline.
 */
export function routePath(a: LatLng, b: LatLng, steps = 32): LatLng[] {
  const dLat = b.latitude - a.latitude;
  const dLng = b.longitude - a.longitude;
  const bend = 0.18;
  const ctrl = { latitude: a.latitude + dLat / 2 - dLng * bend, longitude: a.longitude + dLng / 2 + dLat * bend };
  const out: LatLng[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push({
      latitude: u * u * a.latitude + 2 * u * t * ctrl.latitude + t * t * b.latitude,
      longitude: u * u * a.longitude + 2 * u * t * ctrl.longitude + t * t * b.longitude,
    });
  }
  return out;
}

/** Point a fraction `t` (0..1) of the way along a path. */
export function pointAlong(path: LatLng[], t: number): LatLng {
  const x = Math.min(Math.max(t, 0), 1) * (path.length - 1);
  const i = Math.floor(x);
  const a = path[i];
  const b = path[Math.min(i + 1, path.length - 1)];
  const f = x - i;
  return { latitude: a.latitude + (b.latitude - a.latitude) * f, longitude: a.longitude + (b.longitude - a.longitude) * f };
}

/** Compass bearing in degrees from a to b, for rotating the car marker. */
export function bearing(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b.longitude - a.longitude)) * Math.cos(toRad(b.latitude));
  const x =
    Math.cos(toRad(a.latitude)) * Math.sin(toRad(b.latitude)) -
    Math.sin(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.cos(toRad(b.longitude - a.longitude));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Where the driver starts the approach: a few km out from the pickup. */
export function approachStart(pickup: LatLng): LatLng {
  return { latitude: pickup.latitude - 0.045, longitude: pickup.longitude - 0.06 };
}

/**
 * Simulated driver position for a ride status. `progress` (0..1) moves the car
 * along the current leg. Module 2 replaces this with the driver's live GPS.
 */
export function driverPosition(status: BookingStatus, pickup: LatLng, destination: LatLng, progress: number): LatLng | null {
  switch (status) {
    case 'accepted':
      return approachStart(pickup);
    case 'enroute':
      return pointAlong(routePath(approachStart(pickup), pickup, 16), 0.15 + progress * 0.8);
    case 'arrived':
      return pickup;
    case 'inprogress':
      return pointAlong(routePath(pickup, destination), 0.05 + progress * 0.9);
    case 'completed':
      return destination;
    default:
      return null;
  }
}
