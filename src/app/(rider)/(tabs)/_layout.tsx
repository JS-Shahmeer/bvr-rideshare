import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';
import { useStore } from '@/state/AppStore';

export default function RiderTabs() {
  const { notifications } = useStore();
  const unread = notifications.some((n) => n.role === 'rider' && !n.read);
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={() => (
        <TabBar
          items={[
            { href: '/home', path: '/home', label: 'Home', icon: 'home' },
            { href: '/trips', path: '/trips', label: 'My rides', icon: 'history' },
            { href: '/notifications', path: '/notifications', label: 'Updates', icon: 'bell', dot: unread },
            { href: '/profile', path: '/profile', label: 'Account', icon: 'user' },
          ]}
        />
      )}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="trips" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
