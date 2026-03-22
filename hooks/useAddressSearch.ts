'use client';

import { useState, useCallback } from 'react';
import type { AddressProfileData } from '@/types/transaction';
import { getBalance, getTransactionCount, getTokenBalance } from '@/lib/rpc';
import { TRACKED_TOKEN_ADDRESS } from '@/constants/chain';

interface AddressSearchState {
  address: string | null;
  mode: 'global' | 'address';
  walletData: AddressProfileData | null;
  isLoading: boolean;
}

export function useAddressSearch() {
  const [state, setState] = useState<AddressSearchState>({
    address: null,
    mode: 'global',
    walletData: null,
    isLoading: false,
  });

  const setAddress = useCallback(async (addr: string) => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) return;

    setState(prev => ({ ...prev, isLoading: true, address: addr, mode: 'address' }));

    try {
      const hexAddr = addr as `0x${string}`;
      const [sttBalance, usdceBalance, txCount] = await Promise.all([
        getBalance(hexAddr),
        getTokenBalance(TRACKED_TOKEN_ADDRESS, hexAddr).catch(() => 0n),
        getTransactionCount(hexAddr),
      ]);

      const profile: AddressProfileData = {
        address: addr,
        tag: classifyWallet(sttBalance, txCount),
        sttBalance,
        usdceBalance,
        txCount,
        topTokens: [],
        topContracts: [],
      };

      setState({
        address: addr,
        mode: 'address',
        walletData: profile,
        isLoading: false,
      });
    } catch (err) {
      console.error('Failed to fetch address data:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        walletData: {
          address: addr,
          tag: 'unknown',
          sttBalance: 0n,
          usdceBalance: 0n,
          txCount: 0,
          topTokens: [],
          topContracts: [],
        },
      }));
    }
  }, []);

  const clearAddress = useCallback(() => {
    setState({
      address: null,
      mode: 'global',
      walletData: null,
      isLoading: false,
    });
  }, []);

  return { ...state, setAddress, clearAddress };
}

function classifyWallet(balance: bigint, txCount: number): AddressProfileData['tag'] {
  const ethBalance = Number(balance) / 1e18;
  if (txCount === 0) return 'fresh';
  if (ethBalance > 10000) return 'whale';
  if (txCount > 1000) return 'bot';
  if (txCount > 100) return 'degen';
  return 'unknown';
}
