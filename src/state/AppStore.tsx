import type { ReactNode } from 'react';

import { backendConfigured } from '@/lib/supabase';

import { LiveStoreProvider } from './LiveStore';
import { MockStoreProvider } from './MockStore';

/** Supabase when the build has its settings, otherwise on-device demo data. */
export function AppStoreProvider({ children }: { children: ReactNode }) {
  return backendConfigured ? <LiveStoreProvider>{children}</LiveStoreProvider> : <MockStoreProvider>{children}</MockStoreProvider>;
}

export { useBooking, useStore } from './store';
export type { Result, Store } from './store';
