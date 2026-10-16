import { router } from 'expo-router';
import { useState } from 'react';

import { BookingCard } from '@/components/Booking';
import { Button } from '@/components/Button';
import { EmptyState, Pill, Segmented } from '@/components/Primitives';
import { BackHeader, Hero, Screen } from '@/components/Screen';
import { TripDetailsSheet } from '@/components/TripSheets';
import { OPEN_STATUSES } from '@/lib/format';
import { useStore } from '@/state/AppStore';

type Filter = 'upcoming' | 'completed' | 'cancelled';

export default function MyRides() {
  const { bookings, sessions } = useStore();
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [detailId, setDetailId] = useState<string | null>(null);

  const mine = bookings.filter((b) => b.riderId === sessions.rider?.email);
  const list = mine
    .filter((b) =>
      filter === 'upcoming' ? OPEN_STATUSES.includes(b.status) : filter === 'completed' ? b.status === 'completed' : ['cancelled', 'declined'].includes(b.status),
    )
    .reverse();
  const detail = mine.find((b) => b.id === detailId);

  return (
    <Screen header={<BackHeader title="My rides" onBack={() => router.navigate('/home')} trailing={<Pill label={`${mine.length} ${mine.length === 1 ? 'trip' : 'trips'}`} />} />}>
      <Hero title={'Every journey,\nall in one place.'} sub="Keep track of what’s coming up and where you’ve been." />
      <Segmented
        style={{ marginBottom: 18 }}
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' },
        ]}
      />
      {list.length ? (
        list.map((b) => (
          <BookingCard key={b.id} booking={b} onPress={() => (OPEN_STATUSES.includes(b.status) ? router.push(`/ride/${b.id}`) : setDetailId(b.id))} />
        ))
      ) : (
        <EmptyState
          icon="history"
          title={filter === 'upcoming' ? 'No upcoming rides yet' : 'Nothing here yet'}
          body={filter === 'upcoming' ? 'Once you book, your upcoming rides will show here.' : 'Your trips in this category will appear here.'}
          action={filter === 'upcoming' ? <Button variant="outline" label="Book a ride" trailingIcon="arrow" onPress={() => router.navigate('/home')} /> : undefined}
        />
      )}
      {detail ? <TripDetailsSheet booking={detail} visible onClose={() => setDetailId(null)} canRate /> : null}
    </Screen>
  );
}
