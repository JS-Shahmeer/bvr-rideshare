import { useLocalSearchParams } from 'expo-router';

import { AuthScreen } from '@/screens/AuthScreen';

export default function SignIn() {
  const { role } = useLocalSearchParams<{ role?: string }>();
  return <AuthScreen key={`signin-${role}`} mode="signin" role={role === 'driver' ? 'driver' : 'rider'} />;
}
