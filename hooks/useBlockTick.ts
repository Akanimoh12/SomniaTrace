'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useReactivity } from './useReactivity';
import { getBlockNumber } from '@/lib/rpc';

export function useBlockTick() {
  const { subscribe, unsubscribe } = useReactivity();
  const [blockNumber, setBlockNumber] = useState<number>(0);
  const subIdRef = useRef<string | null>(null);

  // Initial fetch via RPC
  useEffect(() => {
    getBlockNumber().then(n => setBlockNumber(Number(n))).catch(() => {});
  }, []);

  // Subscribe to new block headers via WebSocket
  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        const id = await subscribe(
          { eventTopics: ['newHeads'] },
          (event) => {
            if (!cancelled && event.blockNumber > 0) {
              setBlockNumber(event.blockNumber);
            }
          }
        );
        if (!cancelled) {
          subIdRef.current = id;
        }
      } catch (err) {
        console.warn('[BlockTick] Subscribe failed:', err);
      }
    };

    setup();

    // Fallback: poll every 2s if WS doesn't deliver
    const interval = setInterval(async () => {
      try {
        const n = await getBlockNumber();
        if (!cancelled) setBlockNumber(Number(n));
      } catch {}
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (subIdRef.current) {
        unsubscribe(subIdRef.current);
        subIdRef.current = null;
      }
    };
  }, [subscribe, unsubscribe]);

  return blockNumber;
}
