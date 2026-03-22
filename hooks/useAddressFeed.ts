'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useReactivity } from './useReactivity';
import {
  TRANSFER_TOPIC,
  TRACKED_TOKEN_ADDRESS,
  KNOWN_TOKENS,
} from '@/constants/chain';
import type { ReactivityEvent } from '@/types/reactivity';
import type { TxEvent } from '@/types/transaction';
import { addressToTopic, topicToAddress, weiToUSD } from '@/lib/formatters';
import { getRecentTransferLogs } from '@/lib/rpc';

export function useAddressFeed(
  address: string | null,
  onTransaction?: (tx: TxEvent) => void,
  onBatchLoad?: (txs: TxEvent[]) => void,
) {
  const { subscribe, unsubscribe } = useReactivity();
  const subIdsRef = useRef<string[]>([]);
  const [events, setEvents] = useState<TxEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);

  const parseEvent = useCallback((event: ReactivityEvent, watchAddr: string): TxEvent | null => {
    if (!event.topics || event.topics.length < 3) return null;

    const from = topicToAddress(event.topics[1]);
    const to = topicToAddress(event.topics[2]);
    const value = BigInt(event.data || '0x0');

    const emitter = (event.emitter || '').toLowerCase();
    const isTracked = emitter === TRACKED_TOKEN_ADDRESS.toLowerCase();
    const tokenInfo = KNOWN_TOKENS[emitter];
    const decimals = tokenInfo?.decimals ?? 18;
    const priceUSD = decimals === 6 ? 1 : 0.01;
    const usdValue = weiToUSD(value, decimals, priceUSD);
    const symbol = tokenInfo?.symbol ?? 'TOKEN';

    const isIncoming = to.toLowerCase() === watchAddr.toLowerCase();
    const direction = isIncoming ? 'incoming' as const : 'outgoing' as const;

    return {
      hash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: Date.now(),
      from,
      to,
      value,
      valueUSD: usdValue,
      token: event.emitter || '',
      tokenSymbol: symbol,
      type: isTracked ? 'usdce' : 'stt',
      direction,
      emitter: event.emitter,
    };
  }, []);

  // Fetch historical transactions when address changes
  useEffect(() => {
    if (!address) {
      setEvents([]);
      setIsLoading(false);
      setIsEmpty(false);
      return;
    }

    setIsLoading(true);
    setIsEmpty(false);

    const fetchHistory = async () => {
      try {
        const logs = await getRecentTransferLogs(address as `0x${string}`, 20);
        const txEvents: TxEvent[] = logs.map((log) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const args = log.args as any;
          const from = (args?.from as string) || '';
          const to = (args?.to as string) || '';
          const value = (args?.value as bigint) || BigInt(0);
          const isIncoming = to.toLowerCase() === address.toLowerCase();
          const emAddr = (log.address || '').toLowerCase();
          const isTracked = emAddr === TRACKED_TOKEN_ADDRESS.toLowerCase();
          const tInfo = KNOWN_TOKENS[emAddr];
          const dec = tInfo?.decimals ?? 18;

          return {
            hash: log.transactionHash || '',
            blockNumber: Number(log.blockNumber),
            timestamp: Date.now() - Math.random() * 60000,
            from,
            to,
            value,
            valueUSD: weiToUSD(value, dec, dec === 6 ? 1 : 0.01),
            token: log.address || '',
            tokenSymbol: tInfo?.symbol ?? 'TOKEN',
            type: isTracked ? 'usdce' as const : 'stt' as const,
            direction: isIncoming ? 'incoming' as const : 'outgoing' as const,
            emitter: log.address,
          };
        });

        setEvents(txEvents);
        setIsLoading(false);
        if (txEvents.length === 0) {
          setIsEmpty(true);
        } else {
          setIsEmpty(false);
          // Batch-load all at once for instant bubble display
          if (onBatchLoad) {
            onBatchLoad(txEvents);
          } else {
            txEvents.forEach(tx => onTransaction?.(tx));
          }
        }
      } catch (err) {
        console.warn('[AddressFeed] Failed to fetch history:', err);
        setIsLoading(false);
        setIsEmpty(true);
      }
    };

    fetchHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // Subscribe to live events for this address
  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    const setup = async () => {
      const addrTopic = addressToTopic(address);

      try {
        // Subscribe to outgoing (from this address)
        const id1 = await subscribe(
          { eventTopics: [TRANSFER_TOPIC, addrTopic, null] },
          (event) => {
            if (cancelled) return;
            const tx = parseEvent(event, address);
            if (tx) {
              setEvents(prev => [tx, ...prev].slice(0, 20));
              onTransaction?.(tx);
            }
          }
        );

        // Subscribe to incoming (to this address)
        const id2 = await subscribe(
          { eventTopics: [TRANSFER_TOPIC, null, addrTopic] },
          (event) => {
            if (cancelled) return;
            const tx = parseEvent(event, address);
            if (tx) {
              setEvents(prev => [tx, ...prev].slice(0, 20));
              onTransaction?.(tx);
            }
          }
        );

        if (!cancelled) {
          subIdsRef.current = [id1, id2];
        }
      } catch (err) {
        console.warn('[AddressFeed] Subscribe failed:', err);
      }
    };

    setup();

    return () => {
      cancelled = true;
      for (const id of subIdsRef.current) {
        unsubscribe(id);
      }
      subIdsRef.current = [];
    };
  }, [address, subscribe, unsubscribe, parseEvent, onTransaction]);

  return { events, isLoading, isEmpty };
}
