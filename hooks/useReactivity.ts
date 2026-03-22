'use client';

import { useContext } from 'react';
import { ReactivityContext } from '@/lib/reactivity-context';

export function useReactivity() {
  const ctx = useContext(ReactivityContext);
  if (!ctx.client) {
    return {
      subscribe: async () => '',
      unsubscribe: () => {},
      isConnected: false,
    };
  }
  return {
    subscribe: ctx.client.subscribe.bind(ctx.client),
    unsubscribe: ctx.client.unsubscribe.bind(ctx.client),
    isConnected: ctx.isConnected,
  };
}
