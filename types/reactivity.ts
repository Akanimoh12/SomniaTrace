export interface SubscriptionFilter {
  eventTopics: (string | null)[];
  emitter?: string | null;
  origin?: string | null;
  caller?: string | null;
}

export interface ReactivityEvent {
  subscriptionId: string;
  emitter: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
}

export interface ReactivitySubscription {
  id: string;
  filter: SubscriptionFilter;
  handler: (event: ReactivityEvent) => void;
}

export interface ReactivityClient {
  subscribe: (filter: SubscriptionFilter, handler: (event: ReactivityEvent) => void) => Promise<string>;
  unsubscribe: (id: string) => void;
  isConnected: boolean;
  destroy: () => void;
}

export interface SubscriptionCallbackData {
  events: Array<{
    emitter: string;
    eventTopics: string[];
    data: string;
    blockNumber: number;
    transactionHash: string;
    logIndex: number;
  }>;
  ethCallResults?: Array<{
    result: string;
    error?: string;
  }>;
}
