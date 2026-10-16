import type { Booking, BookingStatus } from '../data/types.ts';

export function dateNice(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function whenLabel(b: Pick<Booking, 'when' | 'scheduledAt'>): string {
  return b.when === 'now' ? 'Ride now' : dateNice(b.scheduledAt);
}

export type Tone = 'blue' | 'green' | 'orange' | 'red' | 'gray';

export const STATUS_INFO: Record<BookingStatus, { label: string; tone: Tone }> = {
  requested: { label: 'Awaiting driver', tone: 'orange' },
  accepted: { label: 'Confirmed', tone: 'blue' },
  enroute: { label: 'Driver on the way', tone: 'blue' },
  arrived: { label: 'Driver arrived', tone: 'green' },
  inprogress: { label: 'Ride in progress', tone: 'blue' },
  completed: { label: 'Completed', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'red' },
  declined: { label: 'Declined', tone: 'red' },
};

export const ACTIVE_STATUSES: BookingStatus[] = ['accepted', 'enroute', 'arrived', 'inprogress'];
export const OPEN_STATUSES: BookingStatus[] = ['requested', ...ACTIVE_STATUSES];
export const CLOSED_STATUSES: BookingStatus[] = ['completed', 'cancelled', 'declined'];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'BV';
}
