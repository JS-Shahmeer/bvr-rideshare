import { useLocalSearchParams } from 'expo-router';

import { AuthScreen } from '@/screens/AuthScreen';

export default function SignUp() {
  const { role } = useLocalSearchParams<{ role?: string }>();
  return <AuthScreen key={`signup-${role}`} mode="signup" role={role === 'driver' ? 'driver' : 'rider'} />;
}
