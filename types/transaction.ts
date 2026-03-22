import type { SimulationNodeDatum } from 'd3';

export type TxType = 'usdce' | 'stt' | 'contract' | 'unknown';
export type TxDirection = 'incoming' | 'outgoing' | 'neutral';

export interface TxEvent {
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  value: bigint;
  valueUSD: number;
  token: string;
  tokenSymbol: string;
  type: TxType;
  direction: TxDirection;
  gasUsed?: bigint;
  gasPrice?: bigint;
  status?: 'confirmed' | 'pending';
  emitter?: string;
}

export interface BubbleNode extends SimulationNodeDatum {
  id: string;
  tx: TxEvent;
  radius: number;
  color: string;
  ringColor?: string;
  opacity: number;
  createdAt: number;
  label: string;
  isWhale: boolean;
  isLarge: boolean;
}

export interface WhaleTx {
  address: string;
  token: string;
  tokenSymbol: string;
  amount: number;
  timestamp: number;
  hash: string;
  direction: TxDirection;
}

export interface AddressProfileData {
  address: string;
  tag: 'whale' | 'bot' | 'fresh' | 'degen' | 'unknown';
  sttBalance: bigint;
  usdceBalance: bigint;
  txCount: number;
  firstSeen?: number;
  topTokens: string[];
  topContracts: string[];
}

export interface FundedByInfo {
  address: string;
  amount: bigint;
  timestamp: number;
  hash: string;
}
