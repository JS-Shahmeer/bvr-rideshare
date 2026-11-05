import { createContext, useContext } from 'react';

import type { DemoScenario } from '@/data/demo';
import type { Account, AppNotification, Booking, BookingDraft, BookingStatus, DriverLocation, FareSettings, Role, ServiceArea } from '@/data/types';

export type Result = { ok: true } | { ok: false; error: string };
export type ResultOf<T> = ({ ok: true } & T) | { ok: false; error: string };

/**
 * Everything the screens read and do. Two implementations sit behind it:
 * MockStore (on-device demo data) and LiveStore (Supabase). Screens only use
 * this contract, so they work the same in both.
 */
export interface Store {
  /** 'live' when the app talks to Supabase, 'demo' when it runs on mock data. */
  mode: 'live' | 'demo';
  ready: boolean;
  sessions: Partial<Record<Role, Account>>;
  activeRole: Role;
  account: Account | undefined;
  driverOnline: boolean;
  settings: FareSettings;
  bookings: Booking[];
  notifications: AppNotification[];
  draft: BookingDraft;
  driverLocation: DriverLocation | null;
  demoMode: boolean;

  signIn(role: Role, email: string, password: string): Promise<Result>;
  signUp(role: Role, input: { name: string; email: string; phone: string; password: string }): Promise<Result>;
  signOut(role: Role): void;
  /** Emails a password reset link. */
  resetPassword(email: string): Promise<Result>;
  setActiveRole(role: Role): void;
  updateProfile(patch: { name: string; phone: string }): Promise<Result>;
  updateDraft(patch: Partial<BookingDraft>): void;
  validateDraft(): Result;
  submitBooking(): Promise<ResultOf<{ id: string }>>;
  acceptBooking(id: string): Promise<Result>;
  declineBooking(id: string): Promise<Result>;
  advanceRide(id: string): Promise<ResultOf<{ status: BookingStatus }>>;
  cancelRide(id: string): Promise<ResultOf<{ charge: number }>>;
  changeDestination(id: string, destination: ServiceArea): Promise<Result>;
  rateRide(id: string, stars: number): Promise<Result>;
  toggleOnline(): Promise<ResultOf<{ online: boolean }>>;
  updateSettings(patch: Partial<FareSettings>): Promise<Result>;
  markNotificationsRead(role: Role): void;
  resetDemo(): void;
  startDemo(scenario: DemoScenario): void;
  setRideStatus(id: string, status: BookingStatus): void;
}

export const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside AppStoreProvider');
  return s;
}

export function useBooking(id: string | undefined) {
  const { bookings } = useStore();
  return bookings.find((b) => b.id === id);
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/** Checks the booking form; shared by both stores and the booking screen. */
export function checkDraft(d: BookingDraft): Result {
  if (d.pickup === d.destination) return { ok: false, error: 'Pickup and destination must be different.' };
  if (!d.name.trim() || !d.phone.trim()) return { ok: false, error: 'Please enter your name and phone number.' };
  if (d.when === 'scheduled') {
    const t = d.scheduledAt ? new Date(d.scheduledAt).getTime() : NaN;
    if (Number.isNaN(t) || t <= Date.now()) return { ok: false, error: 'Choose a future pickup date and time.' };
  }
  return { ok: true };
}

/** Sign-up form checks shared by both stores. */
export function checkSignUp(input: { name: string; email: string; phone: string; password: string }): Result {
  if (input.name.trim().length < 2) return { ok: false, error: 'Please enter your full name.' };
  if (!isEmail(input.email.trim())) return { ok: false, error: 'Enter a valid email address.' };
  if (input.phone.replace(/\D/g, '').length < 8) return { ok: false, error: 'Please enter a valid mobile number.' };
  if (input.password.length < 8) return { ok: false, error: 'Use a password with at least 8 characters.' };
  return { ok: true };
}
