import { Redirect, Stack } from 'expo-router';

import { useStore } from '@/state/AppStore';

export default function DriverLayout() {
  const { sessions } = useStore();
  if (!sessions.driver) return <Redirect href={{ pathname: '/sign-in', params: { role: 'driver' } }} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
