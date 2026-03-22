'use client';

import {
  SOMNIA_RPC_HTTP,
  TRANSFER_TOPIC,
  TRACKED_TOKEN_ADDRESS,
  KNOWN_TOKENS,
  POLL_INTERVAL_MS,
  POLL_BLOCK_RANGE,
} from '@/constants/chain';
import type { TxEvent } from '@/types/transaction';
import { topicToAddress, weiToUSD } from '@/lib/formatters';

// Mutable RPC URL — updated via resetPoller()
let activeRpcUrl: string = SOMNIA_RPC_HTTP;

interface RawLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function rpcCall(method: string, params: any[]): Promise<any> {
  const res = await fetch(activeRpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

function classifyLog(log: RawLog): TxEvent | null {
  if (!log.topics || log.topics.length < 3) return null;

  const emitter = log.address.toLowerCase();
  const from = topicToAddress(log.topics[1]);
  const to = topicToAddress(log.topics[2]);
  const value = BigInt(log.data || '0x0');

  // Look up token info
  const tokenInfo = KNOWN_TOKENS[emitter];
  const isTracked = emitter === TRACKED_TOKEN_ADDRESS.toLowerCase();
  const decimals = tokenInfo?.decimals ?? 18;
  const symbol = tokenInfo?.symbol ?? 'TOKEN';

  // Price estimate: native-pegged tokens ~$0.01, stablecoins ~$1
  const priceUSD = decimals === 6 ? 1 : 0.01;
  const usdValue = weiToUSD(value, decimals, priceUSD);

  const type = isTracked
    ? ('usdce' as const) // use "usdce" type for tracked token (maps to green bubbles)
    : to === '0x0000000000000000000000000000000000000000'
      ? ('contract' as const)
      : ('stt' as const);

  return {
    hash: log.transactionHash,
    blockNumber: parseInt(log.blockNumber, 16),
    timestamp: Date.now(),
    from,
    to,
    value,
    valueUSD: usdValue,
    token: log.address,
    tokenSymbol: symbol,
    type,
    direction: 'neutral',
    emitter: log.address,
  };
}

type PollCallback = (events: TxEvent[], blockNumber: number) => void;

export class TransferPoller {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastBlock = 0;
  private seenHashes = new Set<string>();
  private listeners = new Set<PollCallback>();
  private running = false;

  async start() {
    if (this.running) return;
    this.running = true;

    // Seed with current block
    try {
      const hex = await rpcCall('eth_blockNumber', []);
      this.lastBlock = parseInt(hex, 16);
    } catch {
      // Will retry on next poll
    }

    // First poll immediately
    this.poll();

    // Then poll on interval
    this.intervalId = setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  stop() {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  onEvents(cb: PollCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private async poll() {
    try {
      const latestHex = await rpcCall('eth_blockNumber', []);
      const latestBlock = parseInt(latestHex, 16);

      if (latestBlock <= this.lastBlock) return;

      // Determine range (cap at POLL_BLOCK_RANGE to avoid RPC errors)
      const fromBlock = Math.max(this.lastBlock + 1, latestBlock - POLL_BLOCK_RANGE);
      const toBlock = latestBlock;

      // Fetch Transfer logs
      const logs: RawLog[] = await rpcCall('eth_getLogs', [{
        fromBlock: '0x' + fromBlock.toString(16),
        toBlock: '0x' + toBlock.toString(16),
        topics: [TRANSFER_TOPIC],
      }]);

      // Also fetch native STT transfers from block transactions
      const nativeEvents = await this.fetchNativeTransfers(fromBlock, toBlock);

      // Classify and deduplicate
      const newEvents: TxEvent[] = [];
      for (const log of logs) {
        const key = log.transactionHash + ':' + log.logIndex;
        if (this.seenHashes.has(key)) continue;
        this.seenHashes.add(key);

        const tx = classifyLog(log);
        if (tx) newEvents.push(tx);
      }

      for (const tx of nativeEvents) {
        if (!this.seenHashes.has(tx.hash)) {
          this.seenHashes.add(tx.hash);
          newEvents.push(tx);
        }
      }

      // Trim seen hashes to avoid memory leak
      if (this.seenHashes.size > 5000) {
        const arr = Array.from(this.seenHashes);
        this.seenHashes = new Set(arr.slice(-2000));
      }

      this.lastBlock = toBlock;

      if (newEvents.length > 0) {
        for (const listener of this.listeners) {
          listener(newEvents, latestBlock);
        }
      }
    } catch (err) {
      console.warn('[Poller] poll error:', err);
    }
  }

  private async fetchNativeTransfers(fromBlock: number, toBlock: number): Promise<TxEvent[]> {
    const events: TxEvent[] = [];

    // Sample a few recent blocks for native STT transfers (full block scan is expensive)
    const blocksToScan = Math.min(3, toBlock - fromBlock + 1);
    for (let i = 0; i < blocksToScan; i++) {
      const blockNum = toBlock - i;
      try {
        const block = await rpcCall('eth_getBlockByNumber', ['0x' + blockNum.toString(16), true]);
        if (!block?.transactions) continue;

        for (const tx of block.transactions) {
          if (typeof tx !== 'object') continue;
          const val = BigInt(tx.value || '0x0');
          if (val === 0n) continue; // Skip contract calls with 0 value

          const usdValue = weiToUSD(val, 18, 0.01);
          events.push({
            hash: tx.hash,
            blockNumber: blockNum,
            timestamp: Number(BigInt(block.timestamp || '0x0')) * 1000,
            from: tx.from || '',
            to: tx.to || '',
            value: val,
            valueUSD: usdValue,
            token: 'native',
            tokenSymbol: 'STT',
            type: 'stt',
            direction: 'neutral',
          });
        }
      } catch {
        // Skip failed blocks
      }
    }

    return events;
  }
}

// Singleton
let pollerInstance: TransferPoller | null = null;
export function getPoller(): TransferPoller {
  if (!pollerInstance) {
    pollerInstance = new TransferPoller();
  }
  return pollerInstance;
}

/** Stop current poller and switch to a new RPC URL. Hooks will recreate on next render. */
export function resetPoller(rpcUrl: string) {
  if (pollerInstance) {
    pollerInstance.stop();
    pollerInstance = null;
  }
  activeRpcUrl = rpcUrl;
}
