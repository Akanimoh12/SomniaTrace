'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { DEFAULT_NETWORK, getNetwork, type NetworkConfig } from '@/constants/chain';
import { setActiveNetwork } from '@/lib/rpc';
import { resetPoller } from '@/lib/poller';

const STORAGE_KEY = 'somniaTrace_network';

interface NetworkContextValue {
  network: NetworkConfig;
  networkKey: string;
  switchNetwork: (key: string) => void;
}

const NetworkContext = createContext<NetworkContextValue>({
  network: getNetwork(),
  networkKey: DEFAULT_NETWORK,
  switchNetwork: () => {},
});

function readSavedNetwork(): string {
  if (typeof window === 'undefined') return DEFAULT_NETWORK;
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_NETWORK;
  } catch {
    return DEFAULT_NETWORK;
  }
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [networkKey, setNetworkKey] = useState(readSavedNetwork);
  const network = getNetwork(networkKey);

  // On first mount, sync RPC/poller to the saved (or default) network
  useEffect(() => {
    const saved = readSavedNetwork();
    if (saved !== DEFAULT_NETWORK) {
      const net = getNetwork(saved);
      setActiveNetwork(net);
      resetPoller(net.rpcHttp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchNetwork = useCallback((key: string) => {
    const net = getNetwork(key);
    setActiveNetwork(net);
    resetPoller(net.rpcHttp);
    setNetworkKey(key);
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch { /* ignore quota errors */ }
  }, []);

  return (
    <NetworkContext.Provider value={{ network, networkKey, switchNetwork }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
