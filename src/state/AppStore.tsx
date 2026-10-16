import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { DEFAULT_SETTINGS, DEMO_ACCOUNTS, defaultDraft, seedBookings, seedNotifications } from '@/data/seed';
import type {
  Account,
  AppNotification,
  Booking,
  BookingDraft,
  BookingStatus,
  FareSettings,
  Role,
  ServiceArea,
} from '@/data/types';
import { fareEstimate, money } from '@/lib/fare';
import { ACTIVE_STATUSES, CLOSED_STATUSES, STATUS_INFO } from '@/lib/format';

/**
 * Module 1 keeps all app data on the device so the full UI can be exercised
 * without a server. Every action here maps to a Supabase call in module 2;
 * screens only talk to this store, so swapping the implementation is local.
 */

interface PersistedState {
  sessions: Partial<Record<Role, Account>>;
  activeRole: Role;
  registered: Account[];
  driverOnline: boolean;
  settings: FareSettings;
  bookings: Booking[];
  notifications: AppNotification[];
  draft: BookingDraft;
}

type Result = { ok: true } | { ok: false; error: string };

interface Store extends PersistedState {
  ready: boolean;
  account: Account | undefined;
  signIn(role: Role, email: string, password: string): Promise<Result>;
  signUp(role: Role, input: { name: string; email: string; phone: string; password: string }): Promise<Result>;
  signOut(role: Role): void;
  setActiveRole(role: Role): void;
  updateProfile(patch: { name: string; phone: string }): void;
  updateDraft(patch: Partial<BookingDraft>): void;
  validateDraft(): Result;
  submitBooking(): { ok: true; id: string } | { ok: false; error: string };
  acceptBooking(id: string): Result;
  declineBooking(id: string): void;
  advanceRide(id: string): BookingStatus | null;
  cancelRide(id: string): number;
  changeDestination(id: string, destination: ServiceArea): Result;
  rateRide(id: string, stars: number): void;
  toggleOnline(): boolean;
  updateSettings(patch: Partial<FareSettings>): void;
  markNotificationsRead(role: Role): void;
  resetDemo(): void;
}

const STORAGE_KEY = 'bvr.app-state.v1';

function initialState(): PersistedState {
  return {
    sessions: {},
    activeRole: 'rider',
    registered: [],
    driverOnline: true,
    settings: DEFAULT_SETTINGS,
    bookings: seedBookings(),
    notifications: seedNotifications(),
    draft: defaultDraft(),
  };
}

const NEXT_STATUS: Partial<Record<BookingStatus, BookingStatus>> = {
  accepted: 'enroute',
  enroute: 'arrived',
  arrived: 'inprogress',
  inprogress: 'completed',
};

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const StoreContext = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialState);
  const [ready, setReady] = useState(false);
  // Synchronous mirror so actions can validate against the latest state and return results.
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<PersistedState>;
        if (Array.isArray(saved.bookings)) setState({ ...initialState(), ...saved });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  const commit = useCallback((fn: (s: PersistedState) => PersistedState) => {
    const next = fn(ref.current);
    ref.current = next;
    setState(next);
  }, []);

  const store = useMemo<Store>(() => {
    const notify = (s: PersistedState, role: Role, title: string, message: string): AppNotification[] =>
      [{ id: uid(), role, title, message, createdAt: new Date().toISOString(), read: false }, ...s.notifications].slice(0, 50);

    const patchBooking = (s: PersistedState, id: string, patch: Partial<Booking>) =>
      s.bookings.map((b) => (b.id === id ? { ...b, ...patch } : b));

    const find = (id: string) => ref.current.bookings.find((b) => b.id === id);

    const startSession = (role: Role, account: Account) =>
      commit((s) => ({
        ...s,
        activeRole: role,
        sessions: { ...s.sessions, [role]: account },
        draft: role === 'rider' ? { ...s.draft, name: account.name, phone: account.phone } : s.draft,
      }));

    const validateDraft = (): Result => {
      const d = ref.current.draft;
      if (d.pickup === d.destination) return { ok: false, error: 'Pickup and destination must be different.' };
      if (!d.name.trim() || !d.phone.trim()) return { ok: false, error: 'Please enter your name and phone number.' };
      if (d.when === 'scheduled') {
        const t = d.scheduledAt ? new Date(d.scheduledAt).getTime() : NaN;
        if (Number.isNaN(t) || t <= Date.now()) return { ok: false, error: 'Choose a future pickup date and time.' };
      }
      return { ok: true };
    };

    return {
      ...state,
      ready,
      account: state.sessions[state.activeRole],

      async signIn(role, rawEmail, password) {
        const email = rawEmail.trim().toLowerCase();
        if (!isEmail(email)) return { ok: false, error: 'Enter a valid email address.' };
        if (!password) return { ok: false, error: 'Please enter your password.' };
        const demo = DEMO_ACCOUNTS[role];
        if (email === demo.email && password === demo.password) {
          const { password: _pw, ...account } = demo;
          startSession(role, account);
          return { ok: true };
        }
        const found = ref.current.registered.find((a) => a.role === role && a.email === email);
        // Mock auth: registered accounts accept any password of valid length. Supabase Auth replaces this.
        if (found && password.length >= 8) {
          startSession(role, found);
          return { ok: true };
        }
        return { ok: false, error: `Email or password is incorrect for this ${role === 'rider' ? 'rider' : 'owner'} account.` };
      },

      async signUp(role, input) {
        const email = input.email.trim().toLowerCase();
        const name = input.name.trim();
        if (name.length < 2) return { ok: false, error: 'Please enter your full name.' };
        if (!isEmail(email)) return { ok: false, error: 'Enter a valid email address.' };
        if (input.phone.replace(/\D/g, '').length < 8) return { ok: false, error: 'Please enter a valid mobile number.' };
        if (input.password.length < 8) return { ok: false, error: 'Use a password with at least 8 characters.' };
        const exists =
          email === DEMO_ACCOUNTS[role].email || ref.current.registered.some((a) => a.role === role && a.email === email);
        if (exists) return { ok: false, error: 'An account already exists for this email. Please sign in.' };
        const account: Account = { role, name, email, phone: input.phone.trim() };
        commit((s) => ({ ...s, registered: [...s.registered, account] }));
        startSession(role, account);
        return { ok: true };
      },

      signOut(role) {
        commit((s) => {
          const sessions = { ...s.sessions };
          delete sessions[role];
          return { ...s, sessions };
        });
      },

      setActiveRole(role) {
        commit((s) => ({ ...s, activeRole: role }));
      },

      updateProfile({ name, phone }) {
        commit((s) => {
          const current = s.sessions[s.activeRole];
          if (!current) return s;
          const updated = { ...current, name: name.trim() || current.name, phone: phone.trim() || current.phone };
          return {
            ...s,
            sessions: { ...s.sessions, [s.activeRole]: updated },
            registered: s.registered.map((a) => (a.role === updated.role && a.email === updated.email ? updated : a)),
            draft: s.activeRole === 'rider' ? { ...s.draft, name: updated.name, phone: updated.phone } : s.draft,
          };
        });
      },

      updateDraft(patch) {
        commit((s) => ({ ...s, draft: { ...s.draft, ...patch } }));
      },

      validateDraft,

      submitBooking() {
        const check = validateDraft();
        if (!check.ok) return check;
        const s = ref.current;
        const d = s.draft;
        const booking: Booking = {
          id: `BVR-${String(Date.now()).slice(-6)}`,
          riderId: s.sessions.rider?.email ?? null,
          name: d.name.trim(),
          phone: d.phone.trim(),
          pickup: d.pickup,
          destination: d.destination,
          when: d.when,
          scheduledAt: d.when === 'scheduled' ? d.scheduledAt : null,
          passengers: d.passengers,
          payment: d.payment,
          status: 'requested',
          createdAt: new Date().toISOString(),
          fare: fareEstimate(d.pickup, d.destination, s.settings),
          cancellationCharge: 0,
          rating: 0,
        };
        commit((st) => {
          let notifications = notify(st, 'driver', 'New ride request', `${booking.name} requested ${booking.pickup} → ${booking.destination}.`);
          notifications = notify({ ...st, notifications }, 'rider', 'Booking request sent', `Your request ${booking.id} has been sent to Robert.`);
          return { ...st, bookings: [...st.bookings, booking], notifications };
        });
        return { ok: true, id: booking.id };
      },

      acceptBooking(id) {
        const b = find(id);
        if (!b || b.status !== 'requested') return { ok: false, error: 'This request is no longer available.' };
        if (!ref.current.driverOnline) return { ok: false, error: 'Set yourself available before accepting.' };
        const t = (x: Booking) => new Date(x.when === 'now' ? x.createdAt : x.scheduledAt ?? x.createdAt).getTime();
        const clash = ref.current.bookings.some(
          (x) => x.id !== id && ACTIVE_STATUSES.includes(x.status) && Math.abs(t(x) - t(b)) < 90 * 60_000,
        );
        if (clash) return { ok: false, error: 'Booking conflict: another active trip is within 90 minutes.' };
        commit((s) => ({
          ...s,
          bookings: patchBooking(s, id, { status: 'accepted' }),
          notifications: notify(s, 'rider', 'Ride confirmed', `Robert has accepted booking ${id}.`),
        }));
        return { ok: true };
      },

      declineBooking(id) {
        commit((s) => ({
          ...s,
          bookings: patchBooking(s, id, { status: 'declined' }),
          notifications: notify(s, 'rider', 'Booking unavailable', `Robert could not accept booking ${id}.`),
        }));
      },

      advanceRide(id) {
        const b = find(id);
        const next = b && NEXT_STATUS[b.status];
        if (!next) return null;
        commit((s) => ({
          ...s,
          bookings: patchBooking(s, id, {
            status: next,
            ...(next === 'completed' ? { completedAt: new Date().toISOString() } : {}),
          }),
          notifications: notify(s, 'rider', STATUS_INFO[next].label, `Booking ${id} is now: ${STATUS_INFO[next].label.toLowerCase()}.`),
        }));
        return next;
      },

      cancelRide(id) {
        const b = find(id);
        if (!b || CLOSED_STATUSES.includes(b.status)) return 0;
        const { cancellationEnabled, cancellationFee } = ref.current.settings;
        const charge = cancellationEnabled && ACTIVE_STATUSES.includes(b.status) ? cancellationFee : 0;
        commit((s) => {
          let notifications = notify(s, 'driver', 'Booking cancelled', `${b.name} cancelled ${b.id}${charge ? ` (cancellation fee ${money(charge)})` : ''}.`);
          notifications = notify({ ...s, notifications }, 'rider', 'Ride cancelled', `Booking ${b.id} has been cancelled.`);
          return { ...s, bookings: patchBooking(s, id, { status: 'cancelled', cancellationCharge: charge }), notifications };
        });
        return charge;
      },

      changeDestination(id, destination) {
        const b = find(id);
        if (!b) return { ok: false, error: 'Booking not found.' };
        if (destination === b.pickup) return { ok: false, error: 'Choose a destination different from pickup.' };
        if (destination === b.destination) return { ok: true };
        const old = b.destination;
        commit((s) => {
          let notifications = notify(s, 'driver', 'Destination changed', `${b.name} changed destination from ${old} to ${destination} for ${b.id}.`);
          notifications = notify({ ...s, notifications }, 'rider', 'Destination updated', `New destination: ${destination}. Fare estimate updated.`);
          return {
            ...s,
            bookings: patchBooking(s, id, { destination, fare: fareEstimate(b.pickup, destination, s.settings) }),
            notifications,
          };
        });
        return { ok: true };
      },

      rateRide(id, stars) {
        commit((s) => ({ ...s, bookings: patchBooking(s, id, { rating: stars }) }));
      },

      toggleOnline() {
        const next = !ref.current.driverOnline;
        commit((s) => ({ ...s, driverOnline: next }));
        return next;
      },

      updateSettings(patch) {
        commit((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
      },

      markNotificationsRead(role) {
        commit((s) => ({ ...s, notifications: s.notifications.map((n) => (n.role === role ? { ...n, read: true } : n)) }));
      },

      resetDemo() {
        commit(() => initialState());
      },
    };
  }, [state, ready, commit]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside AppStoreProvider');
  return s;
}

export function useBooking(id: string | undefined) {
  const { bookings } = useStore();
  return bookings.find((b) => b.id === id);
}
