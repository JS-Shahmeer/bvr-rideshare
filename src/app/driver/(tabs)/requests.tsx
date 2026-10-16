import { router } from 'expo-router';
import { useState } from 'react';

import { EmptyState, Pill, Segmented } from '@/components/Primitives';
import { BackHeader, Hero, Screen } from '@/components/Screen';
import { ACTIVE_STATUSES } from '@/lib/format';
import { RequestCard } from '@/screens/RequestCard';
import { useStore } from '@/state/AppStore';

type Filter = 'new' | 'active' | 'all';

export default function DriverRequests() {
  const { bookings } = useStore();
  const [filter, setFilter] = useState<Filter>('new');
  const requests = bookings.filter((b) => b.status === 'requested').reverse();
  const active = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status));
  const list = filter === 'new' ? requests : filter === 'active' ? active : [...bookings].reverse();

  return (
    <Screen header={<BackHeader title="Booking requests" onBack={() => router.navigate('/driver')} trailing={<Pill label={`${requests.length} new`} tone="orange" />} />}>
      <Hero title="Manage your requests." sub="Review each booking before committing to a pickup." />
      <Segmented
        style={{ marginBottom: 18 }}
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'new', label: `New (${requests.length})` },
          { value: 'active', label: `Active (${active.length})` },
          { value: 'all', label: 'All' },
        ]}
      />
      {list.length ? (
        list.map((b) => <RequestCard key={b.id} booking={b} />)
      ) : (
        <EmptyState icon="list" title="No requests here" body="When riders request a journey, you’ll see it here." />
      )}
    </Screen>
  );
}
