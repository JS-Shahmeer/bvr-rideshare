import { router } from 'expo-router';

import { NotificationsScreen } from '@/screens/NotificationsScreen';

export default function RiderNotifications() {
  return <NotificationsScreen role="rider" onBack={() => router.navigate('/home')} />;
}
