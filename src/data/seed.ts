import { fareEstimate } from '../lib/fare.ts';
import type { Account, AppNotification, Booking, BookingDraft, FareSettings, Role } from './types.ts';

export const DEFAULT_SETTINGS: FareSettings = {
  kmRate: 1.25,
  minRate: 0.35,
  cancellationEnabled: true,
  cancellationFee: 8,
};

/** Demo logins shown on the sign-in screen until Supabase auth lands in module 2. */
export const DEMO_ACCOUNTS: Record<Role, Account & { password: string }> = {
  rider: { role: 'rider', name: 'Alex Morgan', email: 'rider@bvr.demo', phone: '0400 123 456', password: 'BVRdemo123' },
  driver: { role: 'driver', name: 'Robert Burns', email: 'robert@bvr.demo', phone: '0400 987 654', password: 'BVRdemo123' },
};

export function defaultDraft(name = '', phone = ''): BookingDraft {
  return {
    pickup: 'Newcastle',
    destination: 'Nelson Bay',
    when: 'now',
    scheduledAt: null,
    passengers: 1,
    payment: 'cash',
    name,
    phone,
  };
}

const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

export function seedBookings(): Booking[] {
  return [
    {
      id: 'BVR-1042',
      riderId: null,
      name: 'Emma Wilson',
      phone: '0400 000 001',
      pickup: 'Newcastle',
      destination: 'Medowie',
      when: 'scheduled',
      scheduledAt: inHours(4),
      passengers: 1,
      payment: 'cash',
      status: 'requested',
      createdAt: new Date().toISOString(),
      fare: fareEstimate('Newcastle', 'Medowie', DEFAULT_SETTINGS),
      cancellationCharge: 0,
      rating: 0,
    },
    {
      id: 'BVR-1031',
      riderId: null,
      name: 'Liam Chen',
      phone: '0400 000 002',
      pickup: 'Maitland',
      destination: 'Newcastle',
      when: 'scheduled',
      scheduledAt: inHours(-30),
      passengers: 2,
      payment: 'card',
      status: 'completed',
      createdAt: inHours(-32),
      completedAt: inHours(-29),
      fare: fareEstimate('Maitland', 'Newcastle', DEFAULT_SETTINGS),
      cancellationCharge: 0,
      rating: 5,
    },
  ];
}

export function seedNotifications(): AppNotification[] {
  return [
    {
      id: 'n-seed-1',
      role: 'driver',
      title: 'New ride request',
      message: 'Emma Wilson requested a Newcastle → Medowie ride.',
      createdAt: new Date().toISOString(),
      read: false,
    },
  ];
}
