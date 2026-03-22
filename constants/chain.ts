// ── Network Definitions ─────────────────────────────────
export interface NetworkConfig {
  id: number;
  name: string;
  rpcHttp: string;
  rpcWss: string;
  explorer: string;
  nativeToken: string;
  label: string;
  isTestnet: boolean;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  testnet: {
    id: Number(process.env.NEXT_PUBLIC_SOMNIA_TESTNET_CHAIN_ID) || 50312,
    name: 'Somnia Testnet',
    rpcHttp: process.env.NEXT_PUBLIC_SOMNIA_TESTNET_RPC_HTTP || 'https://dream-rpc.somnia.network',
    rpcWss: process.env.NEXT_PUBLIC_SOMNIA_TESTNET_RPC_WSS || 'wss://dream-rpc.somnia.network/ws',
    explorer: process.env.NEXT_PUBLIC_SOMNIA_TESTNET_EXPLORER || 'https://shannon-explorer.somnia.network',
    nativeToken: 'STT',
    label: 'Testnet',
    isTestnet: true,
  },
  mainnet: {
    id: Number(process.env.NEXT_PUBLIC_SOMNIA_MAINNET_CHAIN_ID) || 50311,
    name: 'Somnia',
    rpcHttp: process.env.NEXT_PUBLIC_SOMNIA_MAINNET_RPC_HTTP || 'https://rpc.somnia.network',
    rpcWss: process.env.NEXT_PUBLIC_SOMNIA_MAINNET_RPC_WSS || 'wss://rpc.somnia.network/ws',
    explorer: process.env.NEXT_PUBLIC_SOMNIA_MAINNET_EXPLORER || 'https://explorer.somnia.network',
    nativeToken: 'STT',
    label: 'Mainnet',
    isTestnet: false,
  },
};

export const DEFAULT_NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'testnet';

// Active network — resolved at module load, can be switched at runtime via context
export function getNetwork(key?: string): NetworkConfig {
  return NETWORKS[key || DEFAULT_NETWORK] || NETWORKS.testnet;
}

// Convenience exports for default network
const _net = getNetwork();
export const SOMNIA_CHAIN_ID = _net.id;
export const SOMNIA_RPC_HTTP = _net.rpcHttp;
export const SOMNIA_RPC_WSS = _net.rpcWss;
export const SOMNIA_EXPLORER = _net.explorer;
export const SOMNIA_NATIVE_TOKEN = _net.nativeToken;

// ── Contract Addresses ──────────────────────────────────
// Primary tracked token (PFT on testnet — replace with stablecoin when available)
export const TRACKED_TOKEN_ADDRESS = (
  process.env.NEXT_PUBLIC_TRACKED_TOKEN || '0x81e4d11e8f2c7828f17ea4f6f3c298066a9967ec'
) as `0x${string}`;

// Keep USDCE_CONTRACT_ADDRESS as alias for backward compat
export const USDCE_CONTRACT_ADDRESS = TRACKED_TOKEN_ADDRESS;

export const SOMNIA_REACTIVITY_PRECOMPILE_ADDRESS = (
  process.env.NEXT_PUBLIC_REACTIVITY_PRECOMPILE || '0x0000000000000000000000000000000000000100'
) as `0x${string}`;

// Known tokens map: address => { symbol, decimals, name }
export const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number; name: string }> = {
  '0x81e4d11e8f2c7828f17ea4f6f3c298066a9967ec': { symbol: 'PFT', decimals: 18, name: 'Prophecy Fun Token' },
};

// ── Event Topics ────────────────────────────────────────
// ERC-20 Transfer event topic (keccak256("Transfer(address,address,uint256)"))
export const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// BlockTick event selector (keccak256("BlockTick(uint64)"))
export const BLOCK_TICK_SELECTOR = '0x43c81dda51e2d24fc23e453cab3bfcfc6b8dae2dc3b03f969421e0e67be4a052';

// ── Polling Config ──────────────────────────────────────
export const POLL_INTERVAL_MS = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL) || 3000;
export const POLL_BLOCK_RANGE = Number(process.env.NEXT_PUBLIC_POLL_BLOCK_RANGE) || 200;

// ── Bubble Config ───────────────────────────────────────
export const MAX_BUBBLES = 60;
export const BUBBLE_MIN_RADIUS = 28;
export const BUBBLE_MAX_RADIUS = 100;
export const BUBBLE_LIFETIME_MS = 45_000;
export const WHALE_THRESHOLD_USD = 5_000;
export const LARGE_TX_THRESHOLD_USD = 10_000;

// ── Colors ──────────────────────────────────────────────
export const COLORS = {
  bg: '#000000',
  surface: '#0D0D0D',
  border: '#1A1A1A',
  accent: '#00FFA3',
  purple: '#7B61FF',
  danger: '#FF4D4D',
  amber: '#FFB800',
  muted: '#666666',
  white: '#F0F0F0',
} as const;

export const BUBBLE_COLORS = {
  usdce: COLORS.accent,
  stt: COLORS.purple,
  contract: COLORS.amber,
  large: COLORS.danger,
  unknown: COLORS.muted,
} as const;

// WalletConnect project ID
export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';
