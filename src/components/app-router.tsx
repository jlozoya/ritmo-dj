'use client';
import { useSyncExternalStore } from 'react';
import { RequestPage } from '@/features/requests/request-page';
import { DJSessionGate } from '@/features/auth/components/session-gate';
import { LoadingState } from '@/components/loading-state';

function subscribeToLocation(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  return () => window.removeEventListener('popstate', onChange);
}

export function AppRouter() {
  const search = useSyncExternalStore(
    subscribeToLocation,
    () => window.location.search,
    () => null,
  );
  if (search === null) return <LoadingState fullScreen />;
  const eventId = new URLSearchParams(search).get('evento');
  return eventId ? <RequestPage eventId={eventId} /> : <DJSessionGate />;
}
