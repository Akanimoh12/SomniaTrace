'use client';

import React, { createContext, useEffect, useRef, useState } from 'react';
import type { ReactivityClient } from '@/types/reactivity';
import { createReactivityClient } from './reactivity';

interface ReactivityContextValue {
  client: ReactivityClient | null;
  isConnected: boolean;
}

export const ReactivityContext = createContext<ReactivityContextValue>({
  client: null,
  isConnected: false,
});

export function ReactivityProvider({ children }: { children: React.ReactNode }) {
  const clientRef = useRef<ReactivityClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const client = createReactivityClient();
    clientRef.current = client;

    // Poll connection status
    const interval = setInterval(() => {
      setIsConnected(client.isConnected);
    }, 1000);

    return () => {
      clearInterval(interval);
      client.destroy();
      clientRef.current = null;
    };
  }, []);

  return (
    <ReactivityContext.Provider value={{ client: clientRef.current, isConnected }}>
      {children}
    </ReactivityContext.Provider>
  );
}
