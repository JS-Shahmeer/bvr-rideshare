import type { FareBreakdown, FareSettings, ServiceArea } from '../data/types.ts';

export const SERVICE_AREAS: readonly ServiceArea[] = ['Newcastle', 'Medowie', 'Maitland', 'Nelson Bay'];

/** Fixed per-trip fees from the client questionnaire (AUD). */
export const FIXED_FEES = {
  nsw: 1.25, // NSW point-to-point transport levy
  ctp: 1.0, // CTP fee
  admin: 1.0, // Administration fee
} as const;

/**
 * Approximate road distance (km) and drive time (min) between service areas.
 * Placeholder until module 2 swaps in a live routing provider.
 */
const ROUTES: Record<string, [km: number, min: number]> = {
  'Newcastle:Medowie': [35, 35],
  'Newcastle:Maitland': [34, 34],
  'Newcastle:Nelson Bay': [62, 58],
  'Medowie:Maitland': [39, 40],
  'Medowie:Nelson Bay': [37, 36],
  'Maitland:Nelson Bay': [69, 67],
};

export function routeMetrics(a: ServiceArea, b: ServiceArea): { km: number; min: number } {
  if (a === b) return { km: 0, min: 0 };
  const r = ROUTES[`${a}:${b}`] ?? ROUTES[`${b}:${a}`] ?? [42, 42];
  return { km: r[0], min: r[1] };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Distance + time + NSW P2P + CTP + admin. */
export function fareEstimate(a: ServiceArea, b: ServiceArea, settings: Pick<FareSettings, 'kmRate' | 'minRate'>): FareBreakdown {
  const { km, min } = routeMetrics(a, b);
  const distance = round2(km * settings.kmRate);
  const time = round2(min * settings.minRate);
  const total = round2(distance + time + FIXED_FEES.nsw + FIXED_FEES.ctp + FIXED_FEES.admin);
  return { km, min, distance, time, ...FIXED_FEES, total };
}

export const money = (n: number) => `A$${(Number(n) || 0).toFixed(2)}`;
