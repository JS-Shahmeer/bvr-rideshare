import type { Session } from '@supabase/supabase-js';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { DEFAULT_SETTINGS, defaultDraft } from '@/data/seed';
import type { Account, AppNotification, Booking, BookingDraft, DriverLocation, FareBreakdown, FareSettings, Role } from '@/data/types';
import { ACTIVE_STATUSES } from '@/lib/format';
import { saveCard } from '@/lib/payments';
import { registerForPush } from '@/lib/push';
import { supabase as client } from '@/lib/supabase';

import { checkDraft, checkSignUp, isEmail, StoreContext, type Store } from './store';

/**
 * Live mode: data comes from Supabase. Every change goes through a database
 * function (see supabase/migrations), and realtime updates keep the rider's
 * and driver's apps in step.
 */

type BookingRow = {
  id: string;
  rider_id: string | null;
  name: string;
  phone: string;
  pickup: Booking['pickup'];
  destination: Booking['destination'];
  scheduled_at: string | null;
  passengers: number;
  payment: Booking['payment'];
  payment_state: NonNullable<Booking['paymentState']>;
  status: Booking['status'];
  fare: FareBreakdown;
  cancellation_charge: number | string;
  rating: number;
  created_at: string;
  completed_at: string | null;
};

const toBooking = (r: BookingRow): Booking => ({
  id: r.id,
  riderId: r.rider_id,
  name: r.name,
  phone: r.phone,
  pickup: r.pickup,
  destination: r.destination,
  when: r.scheduled_at ? 'scheduled' : 'now',
  scheduledAt: r.scheduled_at,
  passengers: r.passengers,
  payment: r.payment,
  paymentState: r.payment_state,
  status: r.status,
  createdAt: r.created_at,
  completedAt: r.completed_at ?? undefined,
  fare: r.fare,
  cancellationCharge: Number(r.cancellation_charge),
  rating: r.rating,
});

const OFFLINE = /failed to fetch|network request failed|load failed|networkerror/i;

const fail = (error: { message: string } | null | undefined, fallback = 'Something went wrong. Please try again.') =>
  ({
    ok: false,
    error: !error?.message ? fallback : OFFLINE.test(error.message) ? 'Can’t reach BVR right now. Check your internet connection and try again.' : error.message,
  }) as const;

// Only reached when backendConfigured, so the client exists.
const db = () => client!;

export function LiveStoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [account, setAccount] = useState<Account | undefined>();
  const [ready, setReady] = useState(false);
  const [preferredRole, setPreferredRole] = useState<Role>('rider');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<FareSettings>(DEFAULT_SETTINGS);
  const [driverOnline, setDriverOnline] = useState(true);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [draft, setDraft] = useState<BookingDraft>(defaultDraft());
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // ---- loading

  const loadProfile = useCallback(async (userId: string): Promise<Account | undefined> => {
    const { data } = await db().from('profiles').select('id, role, name, email, phone').eq('id', userId).single();
    return data ? { id: data.id, role: data.role, name: data.name, email: data.email, phone: data.phone } : undefined;
  }, []);

  const loadBookings = useCallback(async () => {
    const { data } = await db().from('bookings').select('*').order('created_at', { ascending: true }).limit(500);
    if (data) setBookings((data as BookingRow[]).map(toBooking));
  }, []);

  const loadNotifications = useCallback(async () => {
    const { data } = await db().from('notifications').select('id, role, title, message, created_at, read').order('created_at', { ascending: false }).limit(50);
    if (data) setNotifications(data.map((n) => ({ id: n.id, role: n.role, title: n.title, message: n.message, createdAt: n.created_at, read: n.read })));
  }, []);

  const loadSettings = useCallback(async () => {
    const [{ data: s }, { data: d }] = await Promise.all([
      db().from('fare_settings').select('*').single(),
      db().from('driver_status').select('online').single(),
    ]);
    if (s) setSettings({ kmRate: Number(s.km_rate), minRate: Number(s.min_rate), cancellationEnabled: s.cancellation_enabled, cancellationFee: Number(s.cancellation_fee) });
    if (d) setDriverOnline(d.online);
  }, []);

  const loadLocation = useCallback(async () => {
    const { data } = await db().from('driver_location').select('latitude, longitude, heading, updated_at').maybeSingle();
    setDriverLocation(data?.latitude != null ? { latitude: data.latitude, longitude: data.longitude, heading: data.heading, updatedAt: data.updated_at } : null);
  }, []);

  const loadAll = useCallback(
    () => Promise.all([loadBookings(), loadNotifications(), loadSettings(), loadLocation()]),
    [loadBookings, loadNotifications, loadSettings, loadLocation],
  );

  // ---- auth

  useEffect(() => {
    db()
      .auth.getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setReady(true));
    const { data: sub } = db().auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) {
      setAccount(undefined);
      setBookings([]);
      setNotifications([]);
      return;
    }
    let live = true;
    loadProfile(userId).then((a) => {
      if (!live || !a) return;
      setAccount(a);
      setPreferredRole(a.role);
      setDraft((d) => ({ ...d, name: d.name || a.name, phone: d.phone || a.phone }));
    });
    loadAll();
    registerForPush()
      .then(async (token) => {
        if (token) await db().rpc('register_push_token', { p_token: token, p_platform: Platform.OS });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [userId, loadProfile, loadAll]);

  // ---- realtime: reload what changed

  useEffect(() => {
    if (!userId) return;
    const channel = db()
      .channel(`app-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => loadBookings())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => loadNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fare_settings' }, () => loadSettings())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_status' }, () => loadSettings())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_location' }, () => loadLocation())
      .subscribe();
    return () => {
      db().removeChannel(channel);
    };
  }, [userId, loadBookings, loadNotifications, loadSettings, loadLocation]);

  // ---- the driver shares their position while a trip is under way

  const isDriver = account?.role === 'driver';
  const onTrip = isDriver && bookings.some((b) => ACTIVE_STATUSES.includes(b.status));
  useEffect(() => {
    if (!onTrip) return;
    let sub: Location.LocationSubscription | undefined;
    let cancelled = false;
    (async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted || cancelled) return;
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 10_000, distanceInterval: 25 }, (pos) => {
        db().rpc('report_location', { p_latitude: pos.coords.latitude, p_longitude: pos.coords.longitude, p_heading: pos.coords.heading ?? null });
      });
      if (cancelled) sub.remove();
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [onTrip]);

  // ---- actions

  const store = useMemo<Store>(() => {
    const rpc = async (fn: string, args: Record<string, unknown>) => {
      const { data, error } = await db().rpc(fn, args);
      if (error) return fail(error);
      await loadBookings();
      return { ok: true as const, data };
    };

    return {
      mode: 'live',
      ready,
      sessions: account ? { [account.role]: account } : {},
      activeRole: account?.role ?? preferredRole,
      account,
      driverOnline,
      settings,
      bookings,
      notifications,
      draft,
      driverLocation,
      demoMode: false,

      async signIn(role, rawEmail, password) {
        const email = rawEmail.trim().toLowerCase();
        if (!isEmail(email)) return { ok: false, error: 'Enter a valid email address.' };
        if (!password) return { ok: false, error: 'Please enter your password.' };
        const { data, error } = await db().auth.signInWithPassword({ email, password });
        if (error || !data.user) return fail(error, 'Email or password is incorrect.');
        const profile = await loadProfile(data.user.id);
        if (!profile) return { ok: false, error: 'Your account is not set up yet. Please try again shortly.' };
        if (profile.role !== role) {
          await db().auth.signOut();
          return { ok: false, error: role === 'driver' ? 'This is a rider account. Use the rider sign-in.' : 'This is the owner account. Use the owner sign-in.' };
        }
        setAccount(profile);
        return { ok: true };
      },

      async signUp(role, input) {
        if (role === 'driver') return { ok: false, error: 'The owner account is set up by BVR. Please sign in instead.' };
        const check = checkSignUp(input);
        if (!check.ok) return check;
        const { data, error } = await db().auth.signUp({
          email: input.email.trim().toLowerCase(),
          password: input.password,
          options: { data: { name: input.name.trim(), phone: input.phone.trim() } },
        });
        if (error) return fail(error);
        if (!data.session) return { ok: false, error: 'Check your email to confirm your account, then sign in.' };
        return { ok: true };
      },

      signOut() {
        db().auth.signOut();
      },

      async resetPassword(rawEmail) {
        const email = rawEmail.trim().toLowerCase();
        if (!isEmail(email)) return { ok: false, error: 'Enter your email address above, then tap Forgot password.' };
        const { error } = await db().auth.resetPasswordForEmail(email);
        return error ? fail(error) : { ok: true };
      },

      setActiveRole(role) {
        setPreferredRole(role);
      },

      async updateProfile({ name, phone }) {
        if (!account) return { ok: false, error: 'Please sign in again.' };
        const patch = { name: name.trim() || account.name, phone: phone.trim() || account.phone };
        const { error } = await db().from('profiles').update(patch).eq('id', account.id);
        if (error) return fail(error);
        setAccount({ ...account, ...patch });
        return { ok: true };
      },

      updateDraft(patch) {
        setDraft((d) => ({ ...d, ...patch }));
      },

      validateDraft: () => checkDraft(draftRef.current),

      async submitBooking() {
        const d = draftRef.current;
        const check = checkDraft(d);
        if (!check.ok) return check;
        if (d.payment === 'card') {
          const saved = await saveCard(d.name);
          if (!saved.ok) return saved;
        }
        const { data, error } = await db().rpc('request_ride', {
          p_pickup: d.pickup,
          p_destination: d.destination,
          p_scheduled_at: d.when === 'scheduled' ? d.scheduledAt : null,
          p_passengers: d.passengers,
          p_payment: d.payment,
          p_name: d.name,
          p_phone: d.phone,
        });
        if (error || !data) return fail(error);
        const id = (data as BookingRow).id;
        if (d.payment === 'card') await db().rpc('mark_card_saved', { p_id: id });
        await loadBookings();
        return { ok: true, id };
      },

      async acceptBooking(id) {
        const r = await rpc('accept_booking', { p_id: id });
        return r.ok ? { ok: true } : r;
      },

      async declineBooking(id) {
        const r = await rpc('decline_booking', { p_id: id });
        return r.ok ? { ok: true } : r;
      },

      async advanceRide(id) {
        const r = await rpc('advance_ride', { p_id: id });
        return r.ok ? { ok: true, status: (r.data as BookingRow).status } : r;
      },

      async cancelRide(id) {
        const r = await rpc('cancel_ride', { p_id: id });
        return r.ok ? { ok: true, charge: Number((r.data as BookingRow).cancellation_charge) } : r;
      },

      async changeDestination(id, destination) {
        const r = await rpc('change_destination', { p_id: id, p_destination: destination });
        return r.ok ? { ok: true } : r;
      },

      async rateRide(id, stars) {
        const r = await rpc('rate_ride', { p_id: id, p_stars: stars });
        return r.ok ? { ok: true } : r;
      },

      async toggleOnline() {
        const online = !driverOnline;
        const { error } = await db().rpc('set_online', { p_online: online });
        if (error) return fail(error);
        setDriverOnline(online);
        return { ok: true, online };
      },

      async updateSettings(patch) {
        const next = { ...settings, ...patch };
        const { error } = await db().rpc('update_fare_settings', {
          p_km_rate: next.kmRate,
          p_min_rate: next.minRate,
          p_cancellation_enabled: next.cancellationEnabled,
          p_cancellation_fee: next.cancellationFee,
        });
        if (error) return fail(error);
        setSettings(next);
        return { ok: true };
      },

      markNotificationsRead(role) {
        if (!notifications.some((n) => n.role === role && !n.read)) return;
        setNotifications((list) => list.map((n) => (n.role === role ? { ...n, read: true } : n)));
        db().from('notifications').update({ read: true }).eq('read', false).eq('role', role).then(() => {});
      },

      // The client demo only exists in demo mode.
      resetDemo() {},
      startDemo() {},
      setRideStatus() {},
    } satisfies Store;
  }, [ready, account, preferredRole, driverOnline, settings, bookings, notifications, draft, driverLocation, loadProfile, loadBookings]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

