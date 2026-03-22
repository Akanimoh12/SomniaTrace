'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useReactivity } from './useReactivity';
import { useNetwork } from '@/lib/network-context';
import { getPoller } from '@/lib/poller';
import {
  TRANSFER_TOPIC,
  TRACKED_TOKEN_ADDRESS,
  KNOWN_TOKENS,
  WHALE_THRESHOLD_USD,
} from '@/constants/chain';
import type { ReactivityEvent } from '@/types/reactivity';
import type { TxEvent, WhaleTx } from '@/types/transaction';
import { topicToAddress, weiToUSD } from '@/lib/formatters';

interface TokenStats {
  totalVolume: number;
  largestTransfer: number;
  uniqueWallets: Set<string>;
  recentTransfers: TxEvent[];
  whaleMoves: WhaleTx[];
}

export function useUSDCeFeed() {
  const { subscribe, unsubscribe } = useReactivity();
  const { network } = useNetwork();
  const subIdRef = useRef<string | null>(null);
  const [stats, setStats] = useState<TokenStats>({
    totalVolume: 0,
    largestTransfer: 0,
    uniqueWallets: new Set(),
    recentTransfers: [],
    whaleMoves: [],
  });

  const ingestTx = useCallback((txEvent: TxEvent) => {
    setStats(prev => {
      const newWallets = new Set(prev.uniqueWallets);
      newWallets.add(txEvent.from);
      newWallets.add(txEvent.to);

      const newTransfers = [txEvent, ...prev.recentTransfers].slice(0, 50);
      const newVolume = prev.totalVolume + txEvent.valueUSD;
      const newLargest = Math.max(prev.largestTransfer, txEvent.valueUSD);

      let newWhales = prev.whaleMoves;
      if (txEvent.valueUSD >= WHALE_THRESHOLD_USD) {
        const whaleTx: WhaleTx = {
          address: txEvent.from,
          token: txEvent.token,
          tokenSymbol: txEvent.tokenSymbol,
          amount: txEvent.valueUSD,
          timestamp: Date.now(),
          hash: txEvent.hash,
          direction: 'neutral',
        };
        newWhales = [whaleTx, ...prev.whaleMoves].slice(0, 8);
      }

      return {
        totalVolume: newVolume,
        largestTransfer: newLargest,
        uniqueWallets: newWallets,
        recentTransfers: newTransfers,
        whaleMoves: newWhales,
      };
    });
  }, []);

  // ── PRIMARY: RPC Polling ──────────────────────────────
  useEffect(() => {
    const poller = getPoller();
    poller.start(); // safe to call multiple times

    const unsub = poller.onEvents((newEvents) => {
      const tracked = TRACKED_TOKEN_ADDRESS.toLowerCase();
      for (const tx of newEvents) {
        // Filter to tracked token events only
        if (tx.token?.toLowerCase() === tracked || tx.emitter?.toLowerCase() === tracked) {
          ingestTx(tx);
        }
      }
    });

    return () => { unsub(); };
  }, [ingestTx, network.rpcHttp]);

  // ── ENHANCER: WebSocket subscription ──────────────────
  const handleEvent = useCallback((event: ReactivityEvent) => {
    if (!event.topics || event.topics.length < 3) return;

    const from = topicToAddress(event.topics[1]);
    const to = topicToAddress(event.topics[2]);
    const value = BigInt(event.data || '0x0');
    const emitter = (event.emitter || '').toLowerCase();
    const tokenInfo = KNOWN_TOKENS[emitter];
    const decimals = tokenInfo?.decimals ?? 18;
    const symbol = tokenInfo?.symbol ?? 'TOKEN';
    const priceUSD = decimals === 6 ? 1 : 0.01;
    const usdValue = weiToUSD(value, decimals, priceUSD);

    const txEvent: TxEvent = {
      hash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: Date.now(),
      from,
      to,
      value,
      valueUSD: usdValue,
      token: TRACKED_TOKEN_ADDRESS,
      tokenSymbol: symbol,
      type: 'usdce',
      direction: 'neutral',
      emitter: event.emitter,
    };

    ingestTx(txEvent);
  }, [ingestTx]);

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        const id = await subscribe(
          {
            eventTopics: [TRANSFER_TOPIC, null, null],
            emitter: TRACKED_TOKEN_ADDRESS,
          },
          (event) => {
            if (!cancelled) handleEvent(event);
          }
        );
        if (!cancelled) subIdRef.current = id;
      } catch {
        // Polling handles it
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

  return {
    totalVolume: stats.totalVolume,
    largestTransfer: stats.largestTransfer,
    uniqueWallets: stats.uniqueWallets.size,
    recentTransfers: stats.recentTransfers,
    whaleMoves: stats.whaleMoves,
  };
}
