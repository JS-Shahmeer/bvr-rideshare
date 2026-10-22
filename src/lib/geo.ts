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

const p = (latitude: number, longitude: number): LatLng => ({ latitude, longitude });

/**
 * Approximate road corridors between the towns (Pacific Hwy, Nelson Bay Rd,
 * Medowie Rd, New England Hwy), listed from the first town to the second.
 * Module 2 swaps these for the routing provider's polyline.
 */
const VIA: Record<string, LatLng[]> = {
  'Newcastle:Medowie': [p(-32.885, 151.745), p(-32.84, 151.79), p(-32.8, 151.84), p(-32.77, 151.86)],
  'Newcastle:Maitland': [p(-32.9, 151.72), p(-32.845, 151.69), p(-32.8, 151.645), p(-32.76, 151.6)],
  'Newcastle:Nelson Bay': [p(-32.885, 151.745), p(-32.84, 151.79), p(-32.8, 151.84), p(-32.785, 151.915), p(-32.77, 152.02), p(-32.745, 152.095)],
  'Medowie:Maitland': [p(-32.75, 151.8), p(-32.761, 151.744), p(-32.79, 151.68), p(-32.77, 151.62)],
  'Medowie:Nelson Bay': [p(-32.77, 151.89), p(-32.785, 151.915), p(-32.77, 152.02), p(-32.745, 152.095)],
  'Maitland:Nelson Bay': [p(-32.77, 151.62), p(-32.79, 151.68), p(-32.761, 151.744), p(-32.79, 151.83), p(-32.785, 151.915), p(-32.77, 152.02), p(-32.745, 152.095)],
};

/** Smooth path (Catmull-Rom through the corridor points) between two areas. */
export function routeBetween(a: ServiceArea, b: ServiceArea, perLeg = 8): LatLng[] {
  if (a === b) return [AREA_COORDS[a]];
  const fwd = VIA[`${a}:${b}`];
  const via = fwd ?? [...(VIA[`${b}:${a}`] ?? [])].reverse();
  const pts = [AREA_COORDS[a], ...via, AREA_COORDS[b]];
  const out: LatLng[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    for (let s = 0; s < perLeg; s++) {
      const t = s / perLeg;
      const cr = (k: keyof LatLng) =>
        0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t);
      out.push({ latitude: cr('latitude'), longitude: cr('longitude') });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Point a fraction `t` (0..1) of the way along a path, by distance. */
export function pointAlong(path: LatLng[], t: number): LatLng {
  if (path.length < 2) return path[0];
  const seg = path.slice(1).map((q, i) => Math.hypot(q.latitude - path[i].latitude, q.longitude - path[i].longitude));
  let left = Math.min(Math.max(t, 0), 1) * seg.reduce((x, y) => x + y, 0);
  for (let i = 0; i < seg.length; i++) {
    if (left <= seg[i] || i === seg.length - 1) {
      const f = seg[i] ? Math.min(left / seg[i], 1) : 0;
      const a = path[i];
      const b = path[i + 1];
      return { latitude: a.latitude + (b.latitude - a.latitude) * f, longitude: a.longitude + (b.longitude - a.longitude) * f };
    }
    left -= seg[i];
  }
  return path[path.length - 1];
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

/** The driver's simulated approach: the last stretch of road into the pickup. */
export function approachPath(pickup: ServiceArea): LatLng[] {
  const from: ServiceArea = pickup === 'Medowie' ? 'Newcastle' : 'Medowie';
  const road = routeBetween(from, pickup);
  return road.slice(Math.floor(road.length * 0.6));
}

/**
 * Simulated driver position for a ride status. `progress` (0..1) moves the car
 * along the current leg. Module 2 replaces this with the driver's live GPS.
 */
export function driverPosition(status: BookingStatus, pickup: ServiceArea, destination: ServiceArea, progress: number): LatLng | null {
  switch (status) {
    case 'accepted':
      return approachPath(pickup)[0];
    case 'enroute':
      return pointAlong(approachPath(pickup), 0.1 + progress * 0.85);
    case 'arrived':
      return AREA_COORDS[pickup];
    case 'inprogress':
      return pointAlong(routeBetween(pickup, destination), 0.04 + progress * 0.92);
    default:
      return null;
  }
}
