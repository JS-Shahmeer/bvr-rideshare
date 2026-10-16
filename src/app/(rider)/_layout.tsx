import { Redirect, Stack } from 'expo-router';

import { useStore } from '@/state/AppStore';

export default function RiderLayout() {
  const { sessions } = useStore();
  if (!sessions.rider) return <Redirect href={{ pathname: '/sign-in', params: { role: 'rider' } }} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
