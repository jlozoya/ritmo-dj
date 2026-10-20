'use client';
import { useSyncExternalStore } from 'react';
import { getSharingOrigin } from '@/lib/sharing-origin';
const subscribe = () => () => {};
export function useOrigin() {
  return useSyncExternalStore(
    subscribe,
    () => getSharingOrigin(window.location.origin, __DEV_LAN_HOSTS__),
    () => '',
  );
}
