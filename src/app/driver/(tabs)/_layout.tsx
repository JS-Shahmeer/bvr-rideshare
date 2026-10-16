import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';
import { useStore } from '@/state/AppStore';

export default function DriverTabs() {
  const { bookings } = useStore();
  const pending = bookings.some((b) => b.status === 'requested');
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={() => (
        <TabBar
          items={[
            { href: '/driver', path: '/driver', label: 'Home', icon: 'home' },
            { href: '/driver/requests', path: '/driver/requests', label: 'Requests', icon: 'calendar', dot: pending },
            { href: '/driver/navigate', path: '/driver/navigate', label: 'Navigate', icon: 'navigation' },
            { href: '/driver/earnings', path: '/driver/earnings', label: 'Earnings', icon: 'wallet' },
          ]}
        />
      )}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="requests" />
      <Tabs.Screen name="navigate" />
      <Tabs.Screen name="earnings" />
    </Tabs>
  );
}
