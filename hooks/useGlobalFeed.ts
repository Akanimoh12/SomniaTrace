'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useReactivity } from './useReactivity';
import { useNetwork } from '@/lib/network-context';
import { getPoller } from '@/lib/poller';
import {
  TRANSFER_TOPIC,
  TRACKED_TOKEN_ADDRESS,
  KNOWN_TOKENS,
  LARGE_TX_THRESHOLD_USD,
  WHALE_THRESHOLD_USD,
} from '@/constants/chain';
import type { ReactivityEvent } from '@/types/reactivity';
import type { TxEvent } from '@/types/transaction';
import { topicToAddress, weiToUSD } from '@/lib/formatters';

export function useGlobalFeed(onTransaction?: (tx: TxEvent) => void) {
  const { subscribe, unsubscribe } = useReactivity();
  const { network } = useNetwork();
  const subIdRef = useRef<string | null>(null);
  const [events, setEvents] = useState<TxEvent[]>([]);
  const onTxRef = useRef(onTransaction);
  onTxRef.current = onTransaction;
  const seenRef = useRef(new Set<string>());

  const addEvent = useCallback((tx: TxEvent) => {
    const key = tx.hash + (tx.token || '');
    if (seenRef.current.has(key)) return;
    seenRef.current.add(key);
    if (seenRef.current.size > 2000) {
      const arr = Array.from(seenRef.current);
      seenRef.current = new Set(arr.slice(-1000));
    }

    setEvents(prev => [tx, ...prev].slice(0, 20));
    onTxRef.current?.(tx);
  }, []);

  // ── PRIMARY: RPC Polling ──────────────────────────────
  useEffect(() => {
    // Clear seen hashes on network switch so events aren't silently deduped
    seenRef.current.clear();
    setEvents([]);

    const poller = getPoller();
    poller.start();

    const unsub = poller.onEvents((newEvents) => {
      for (const tx of newEvents) {
        addEvent(tx);
      }
    });

    return () => {
      unsub();
    };
  }, [addEvent, network.rpcHttp]);

  // ── ENHANCER: WebSocket subscription (faster delivery when it works) ──
  const handleEvent = useCallback((event: ReactivityEvent) => {
    if (!event.topics || event.topics.length < 3) return;

    const from = topicToAddress(event.topics[1]);
    const to = topicToAddress(event.topics[2]);
    const value = BigInt(event.data || '0x0');

    const emitter = (event.emitter || '').toLowerCase();
    const isTracked = emitter === TRACKED_TOKEN_ADDRESS.toLowerCase();
    const tokenInfo = KNOWN_TOKENS[emitter];
    const decimals = tokenInfo?.decimals ?? 18;
    const symbol = tokenInfo?.symbol ?? 'TOKEN';
    const priceUSD = decimals === 6 ? 1 : 0.01;
    const usdValue = weiToUSD(value, decimals, priceUSD);

    const type = isTracked ? 'usdce' as const :
      (to === '0x0000000000000000000000000000000000000000' ? 'contract' as const : 'stt' as const);

    const txEvent: TxEvent = {
      hash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: Date.now(),
      from,
      to,
      value,
      valueUSD: usdValue,
      token: event.emitter || '',
      tokenSymbol: symbol,
      type,
      direction: 'neutral',
      emitter: event.emitter,
    };

    addEvent(txEvent);
  }, [addEvent]);

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        const id = await subscribe(
          { eventTopics: [TRANSFER_TOPIC, null, null] },
          (event) => {
            if (!cancelled) handleEvent(event);
          }
        );
        if (!cancelled) subIdRef.current = id;
      } catch {
        // WebSocket subscription failed — polling handles it
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (subIdRef.current) {
        unsubscribe(subIdRef.current);
        subIdRef.current = null;
      }
    };
  }, [subscribe, unsubscribe, handleEvent]);

  return events;
}
