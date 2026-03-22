import type { ReactivityClient, SubscriptionFilter, ReactivityEvent } from '@/types/reactivity';
import { SOMNIA_RPC_WSS, SOMNIA_RPC_HTTP } from '@/constants/chain';

type EventHandler = (event: ReactivityEvent) => void;

interface InternalSubscription {
  id: string;
  filter: SubscriptionFilter;
  handler: EventHandler;
  sdkSub?: { unsubscribe: () => void };
}

let clientInstance: ReactivityClient | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sdkInstance: any = null;
const subscriptions: Map<string, InternalSubscription> = new Map();
let subIdCounter = 0;
let initPromise: Promise<void> | null = null;

function generateSubId(): string {
  return `sub_${++subIdCounter}_${Date.now()}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function initSDK(): Promise<any> {
  if (sdkInstance) return sdkInstance;
  if (initPromise) {
    await initPromise;
    return sdkInstance;
  }

  initPromise = (async () => {
    try {
      // Dynamic import to avoid SSR issues
      const { SDK } = await import('@somnia-chain/reactivity');
      const { createPublicClient, http, defineChain } = await import('viem');

      const chain = defineChain({
        id: 50312,
        name: 'Somnia Testnet',
        nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
        rpcUrls: {
          default: { http: [SOMNIA_RPC_HTTP] },
        },
        testnet: true,
      });

      const publicClient = createPublicClient({
        chain,
        transport: http(SOMNIA_RPC_HTTP),
      });

      sdkInstance = new SDK({
        public: publicClient,
      });
    } catch (err) {
      console.error('[Reactivity] Failed to init SDK:', err);
      sdkInstance = null;
    } finally {
      // initialization complete
    }
  })();

  await initPromise;
  return sdkInstance;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEventFromCallback(cbData: any): ReactivityEvent[] {
  const events: ReactivityEvent[] = [];

  try {
    // The SDK callback shape: { events: [...], ethCallResults: [...] }
    const rawEvents = cbData?.events || (Array.isArray(cbData) ? cbData : [cbData]);

    for (const evt of rawEvents) {
      if (!evt) continue;
      const topics = evt.eventTopics || evt.topics || [];
      events.push({
        subscriptionId: evt.subscriptionId || '',
        emitter: evt.emitter || evt.address || '',
        topics: Array.isArray(topics) ? topics : [],
        data: evt.data || '0x',
        blockNumber: Number(evt.blockNumber || 0),
        transactionHash: evt.transactionHash || evt.hash || '',
        logIndex: Number(evt.logIndex || 0),
      });
    }
  } catch {
    // If raw data, try to at least wrap it
    if (cbData?.emitter) {
      events.push({
        subscriptionId: '',
        emitter: cbData.emitter,
        topics: cbData.eventTopics || cbData.topics || [],
        data: cbData.data || '0x',
        blockNumber: Number(cbData.blockNumber || 0),
        transactionHash: cbData.transactionHash || '',
        logIndex: 0,
      });
    }
  }

  return events;
}

export function createReactivityClient(): ReactivityClient {
  if (clientInstance) return clientInstance;

  const client: ReactivityClient = {
    isConnected: false,

    async subscribe(filter: SubscriptionFilter, handler: EventHandler): Promise<string> {
      const subId = generateSubId();
      const internal: InternalSubscription = { id: subId, filter, handler };
      subscriptions.set(subId, internal);

      try {
        const sdk = await initSDK();
        if (!sdk) {
          console.warn('[Reactivity] SDK not available, using fallback WebSocket');
          startFallbackWS(internal);
          return subId;
        }

        const sdkSub = await sdk.subscribe({
          eventTopics: filter.eventTopics?.filter(Boolean) || undefined,
          emitter: filter.emitter || undefined,
          origin: filter.origin || undefined,
          ethCalls: [],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onData: (data: any) => {
            const events = parseEventFromCallback(data);
            for (const event of events) {
              event.subscriptionId = subId;
              handler(event);
            }
          },
        });

        internal.sdkSub = sdkSub;
        client.isConnected = true;
      } catch (err) {
        console.warn('[Reactivity] SDK subscribe failed, using fallback:', err);
        startFallbackWS(internal);
      }

      return subId;
    },

    unsubscribe(id: string): void {
      const sub = subscriptions.get(id);
      if (sub?.sdkSub) {
        try {
          sub.sdkSub.unsubscribe();
        } catch (err) {
          console.warn('[Reactivity] Unsubscribe error:', err);
        }
      }
      subscriptions.delete(id);

      // Clean up fallback WS if this sub was using it
      if (fallbackWsSubs.has(id)) {
        fallbackWsSubs.delete(id);
        if (fallbackWsSubs.size === 0 && fallbackWs) {
          fallbackWs.close();
          fallbackWs = null;
        }
      }
    },

    destroy(): void {
      for (const [id] of subscriptions) {
        client.unsubscribe(id);
      }
      subscriptions.clear();
      sdkInstance = null;
      clientInstance = null;
      initPromise = null;

      if (fallbackWs) {
        fallbackWs.close();
        fallbackWs = null;
      }
    },
  };

  clientInstance = client;
  return client;
}

// --- Fallback: raw WebSocket for environments where SDK doesn't work ---

let fallbackWs: WebSocket | null = null;
const fallbackWsSubs: Map<string, InternalSubscription> = new Map();
let fallbackReconnectDelay = 1000;

function startFallbackWS(sub: InternalSubscription) {
  fallbackWsSubs.set(sub.id, sub);

  if (fallbackWs && fallbackWs.readyState === WebSocket.OPEN) {
    sendFallbackSubscribe(sub);
    return;
  }

  if (fallbackWs && fallbackWs.readyState === WebSocket.CONNECTING) {
    return; // will send on open
  }

  connectFallbackWS();
}

function connectFallbackWS() {
  if (typeof window === 'undefined') return;

  try {
    fallbackWs = new WebSocket(SOMNIA_RPC_WSS);

    fallbackWs.onopen = () => {
      fallbackReconnectDelay = 1000;
      if (clientInstance) clientInstance.isConnected = true;

      // Re-subscribe all pending subs
      for (const [, sub] of fallbackWsSubs) {
        sendFallbackSubscribe(sub);
      }
    };

    fallbackWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        // Handle subscription responses
        if (msg.result && typeof msg.result === 'string' && msg.id) {
          return; // Subscription confirmation
        }

        // Handle events (params.result contains the event data)
        if (msg.params?.result) {
          const result = msg.params.result;
          const evtTopics = result.topics || [];
          const emitter = result.address || '';

          const reactEvent: ReactivityEvent = {
            subscriptionId: msg.params.subscription || '',
            emitter,
            topics: evtTopics,
            data: result.data || '0x',
            blockNumber: parseInt(result.blockNumber || '0', 16),
            transactionHash: result.transactionHash || '',
            logIndex: parseInt(result.logIndex || '0', 16),
          };

          // Dispatch to matching subscriptions
          for (const [, sub] of fallbackWsSubs) {
            if (matchesFilter(reactEvent, sub.filter)) {
              sub.handler(reactEvent);
            }
          }
        }

        // Handle eth_subscription newHeads for block tracking
        if (msg.method === 'eth_subscription' && msg.params?.result?.number) {
          const blockNum = parseInt(msg.params.result.number, 16);
          for (const [, sub] of fallbackWsSubs) {
            // Check if this is a block tick subscriber
            if (sub.filter.eventTopics?.[0] === 'newHeads' || sub.filter.eventTopics?.[0] === 'blockTick') {
              sub.handler({
                subscriptionId: sub.id,
                emitter: '',
                topics: [],
                data: '0x' + blockNum.toString(16),
                blockNumber: blockNum,
                transactionHash: '',
                logIndex: 0,
              });
            }
          }
        }
      } catch {
        // Silently ignore parse errors
      }
    };

    fallbackWs.onerror = () => {
      if (clientInstance) clientInstance.isConnected = false;
    };

    fallbackWs.onclose = () => {
      if (clientInstance) clientInstance.isConnected = false;

      // Reconnect with exponential backoff
      if (fallbackWsSubs.size > 0) {
        setTimeout(() => {
          connectFallbackWS();
        }, fallbackReconnectDelay);
        fallbackReconnectDelay = Math.min(fallbackReconnectDelay * 2, 30000);
      }
    };
  } catch {
    // Retry
    if (fallbackWsSubs.size > 0) {
      setTimeout(() => {
        connectFallbackWS();
      }, fallbackReconnectDelay);
      fallbackReconnectDelay = Math.min(fallbackReconnectDelay * 2, 30000);
    }
  }
}

function sendFallbackSubscribe(sub: InternalSubscription) {
  if (!fallbackWs || fallbackWs.readyState !== WebSocket.OPEN) return;

  const filter = sub.filter;

  // Use Somnia Reactivity subscription method if topics are specific
  if (filter.eventTopics && filter.eventTopics.length > 0 && filter.eventTopics[0] !== 'newHeads' && filter.eventTopics[0] !== 'blockTick') {
    fallbackWs.send(JSON.stringify({
      jsonrpc: '2.0',
      id: parseInt(sub.id.replace(/\D/g, '')) || 1,
      method: 'eth_subscribe',
      params: ['logs', {
        topics: filter.eventTopics.map(t => t || null),
        ...(filter.emitter ? { address: filter.emitter } : {}),
      }],
    }));
  } else if (filter.eventTopics?.[0] === 'newHeads' || filter.eventTopics?.[0] === 'blockTick') {
    // Subscribe to new block headers
    fallbackWs.send(JSON.stringify({
      jsonrpc: '2.0',
      id: parseInt(sub.id.replace(/\D/g, '')) || 2,
      method: 'eth_subscribe',
      params: ['newHeads'],
    }));
  }
}

function matchesFilter(event: ReactivityEvent, filter: SubscriptionFilter): boolean {
  // If filter has emitter, check it
  if (filter.emitter && event.emitter.toLowerCase() !== filter.emitter.toLowerCase()) {
    return false;
  }

  // Check topics
  if (filter.eventTopics) {
    for (let i = 0; i < filter.eventTopics.length; i++) {
      const filterTopic = filter.eventTopics[i];
      if (filterTopic && filterTopic !== 'newHeads' && filterTopic !== 'blockTick') {
        const eventTopic = event.topics[i];
        if (!eventTopic) return false;
        if (filterTopic.toLowerCase() !== eventTopic.toLowerCase()) return false;
      }
    }
  }

  return true;
}

export function getReactivityClient(): ReactivityClient | null {
  return clientInstance;
}
