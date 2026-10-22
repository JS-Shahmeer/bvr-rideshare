import { fareEstimate } from '../lib/fare.ts';
import { DEFAULT_SETTINGS, DEMO_ACCOUNTS, seedBookings } from './seed.ts';
import type { AppNotification, Booking, BookingStatus, Role, ServiceArea } from './types.ts';

/** A point in the app the client demo can jump to. `ride` sets the current booking's status. */
export type DemoScenario = { role: Role; ride?: BookingStatus; driverOnline?: boolean };

export const DEMO_RIDE_ID = 'BVR-3001';

/** Order a trip moves through, used by the demo controls. */
export const DEMO_STAGES: { status: BookingStatus; label: string }[] = [
  { status: 'requested', label: 'Requested' },
  { status: 'accepted', label: 'Confirmed' },
  { status: 'enroute', label: 'En route' },
  { status: 'arrived', label: 'Arrived' },
  { status: 'inprogress', label: 'On trip' },
  { status: 'completed', label: 'Completed' },
];

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const rider = DEMO_ACCOUNTS.rider;

function trip(id: string, pickup: ServiceArea, destination: ServiceArea, status: BookingStatus, h: number, extra: Partial<Booking> = {}): Booking {
  return {
    id,
    riderId: rider.email,
    name: rider.name,
    phone: rider.phone,
    pickup,
    destination,
    when: 'now',
    scheduledAt: null,
    passengers: 1,
    payment: 'cash',
    status,
    createdAt: hoursAgo(h),
    ...(status === 'completed' ? { completedAt: hoursAgo(h - 1) } : {}),
    fare: fareEstimate(pickup, destination, DEFAULT_SETTINGS),
    cancellationCharge: 0,
    rating: 0,
    ...extra,
  };
}

/** Past trips so history, receipts and earnings have something to show. */
function history(): Booking[] {
  return [
    trip('BVR-2018', 'Maitland', 'Newcastle', 'completed', 74, { payment: 'card', rating: 5, passengers: 2 }),
    trip('BVR-2027', 'Medowie', 'Nelson Bay', 'cancelled', 50, { cancellationCharge: DEFAULT_SETTINGS.cancellationFee }),
    trip('BVR-2031', 'Newcastle', 'Medowie', 'completed', 26),
  ];
}

const STEP_NOTES: Partial<Record<BookingStatus, [string, string]>> = {
  requested: ['Booking request sent', 'Your request has been sent to Robert.'],
  accepted: ['Ride confirmed', 'Robert has accepted your booking.'],
  enroute: ['Driver on the way', 'Robert is heading to your pickup.'],
  arrived: ['Driver arrived', 'Robert is waiting at your pickup.'],
  inprogress: ['Trip started', 'Enjoy your ride to Nelson Bay.'],
  completed: ['Trip completed', 'Your receipt is ready. Rate your ride.'],
  cancelled: ['Ride cancelled', `Booking ${DEMO_RIDE_ID} was cancelled. A cancellation fee applied.`],
  declined: ['Booking unavailable', `Robert could not accept booking ${DEMO_RIDE_ID}.`],
};

/** Rider updates that would have arrived by the time the ride reached `status`. */
export function demoNotifications(status?: BookingStatus): AppNotification[] {
  const order: BookingStatus[] = ['requested', 'accepted', 'enroute', 'arrived', 'inprogress', 'completed'];
  const reached = !status
    ? []
    : status === 'cancelled'
      ? ['requested', 'accepted', 'cancelled']
      : status === 'declined'
        ? ['requested', 'declined']
        : order.slice(0, order.indexOf(status) + 1);
  const rides = reached.map((s, i) => {
    const [title, message] = STEP_NOTES[s as BookingStatus]!;
    return { id: `demo-${s}`, role: 'rider' as Role, title, message, createdAt: hoursAgo((reached.length - i) * 0.05), read: false };
  });
  return [
    ...rides.reverse(),
    { id: 'demo-driver-1', role: 'driver', title: 'New ride request', message: 'Emma Wilson requested a Newcastle → Medowie ride.', createdAt: hoursAgo(0.2), read: false },
    ...(status
      ? [{ id: 'demo-driver-2', role: 'driver' as Role, title: 'New ride request', message: `${rider.name} requested a Newcastle → Nelson Bay ride.`, createdAt: hoursAgo(0.3), read: status !== 'requested' }]
      : []),
    { id: 'demo-old', role: 'rider', title: 'Welcome to BVR Rideshare', message: 'Book local rides across Newcastle, Medowie, Maitland and Nelson Bay.', createdAt: hoursAgo(80), read: true },
  ];
}

/** Bookings for a scenario: Emma's open request, past trips, and the demo ride at `status`. */
export function demoBookings(status?: BookingStatus): Booking[] {
  const seeds = seedBookings();
  const current = status
    ? [
        trip(DEMO_RIDE_ID, 'Newcastle', 'Nelson Bay', status, 0.25, {
          passengers: 2,
          payment: 'card',
          ...(status === 'completed' ? { completedAt: new Date().toISOString() } : {}),
          ...(status === 'cancelled' ? { cancellationCharge: DEFAULT_SETTINGS.cancellationFee } : {}),
        }),
      ]
    : [];
  return [...seeds, ...history(), ...current];
}
