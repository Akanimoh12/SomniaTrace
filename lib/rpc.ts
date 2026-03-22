import { createPublicClient, http, defineChain, type PublicClient } from 'viem';
import {
  SOMNIA_RPC_HTTP,
  getNetwork,
  type NetworkConfig,
} from '@/constants/chain';

const _net = getNetwork();

function buildChain(config: NetworkConfig) {
  return defineChain({
    id: config.id,
    name: config.name,
    nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
    rpcUrls: {
      default: { http: [config.rpcHttp] },
    },
    blockExplorers: {
      default: { name: 'Somnia Explorer', url: config.explorer },
    },
    testnet: config.isTestnet,
  });
}

export const somniaTestnet = buildChain(_net);

// Mutable client — updated when network switches
// eslint-disable-next-line import/no-mutable-exports
let publicClient: PublicClient = createPublicClient({
  chain: somniaTestnet,
  transport: http(SOMNIA_RPC_HTTP),
});

export { publicClient };

/** Call this when the user switches networks at runtime */
export function setActiveNetwork(config: NetworkConfig) {
  const chain = buildChain(config);
  publicClient = createPublicClient({ chain, transport: http(config.rpcHttp) });
}

export async function getBalance(address: `0x${string}`): Promise<bigint> {
  return publicClient.getBalance({ address });
}

export async function getTransactionCount(address: `0x${string}`): Promise<number> {
  return publicClient.getTransactionCount({ address });
}

export async function getTransaction(hash: `0x${string}`) {
  return publicClient.getTransaction({ hash });
}

export async function getTransactionReceipt(hash: `0x${string}`) {
  return publicClient.getTransactionReceipt({ hash });
}

export async function getBlock(blockNumber?: bigint) {
  if (blockNumber !== undefined) {
    return publicClient.getBlock({ blockNumber });
  }
  return publicClient.getBlock();
}

export async function getBlockNumber(): Promise<bigint> {
  return publicClient.getBlockNumber();
}

export async function getFirstInboundTransfer(
  address: `0x${string}`
): Promise<{ from: string; value: bigint; hash: string; timestamp: number } | null> {
  try {
    const logs = await publicClient.getLogs({
      event: {
        type: 'event',
        name: 'Transfer',
        inputs: [
          { type: 'address', name: 'from', indexed: true },
          { type: 'address', name: 'to', indexed: true },
          { type: 'uint256', name: 'value', indexed: false },
        ],
      },
      args: {
        to: address,
      },
      fromBlock: 0n,
      toBlock: 'latest',
    });

    if (logs.length === 0) return null;

    const firstLog = logs[0];
    const block = await getBlock(BigInt(firstLog.blockNumber));

    return {
      from: firstLog.args.from as string,
      value: firstLog.args.value as bigint,
      hash: firstLog.transactionHash,
      timestamp: Number(block.timestamp) * 1000,
    };
  } catch {
    return null;
  }
}

const TRANSFER_EVENT_ABI = {
  type: 'event' as const,
  name: 'Transfer' as const,
  inputs: [
    { type: 'address' as const, name: 'from' as const, indexed: true },
    { type: 'address' as const, name: 'to' as const, indexed: true },
    { type: 'uint256' as const, name: 'value' as const, indexed: false },
  ],
};

async function fetchTransferLogs(
  address: `0x${string}`,
  fromBlock: bigint,
  limit: number,
) {
  const [outLogs, inLogs] = await Promise.all([
    publicClient.getLogs({
      event: TRANSFER_EVENT_ABI,
      args: { from: address },
      fromBlock,
      toBlock: 'latest',
    }).catch(() => []),
    publicClient.getLogs({
      event: TRANSFER_EVENT_ABI,
      args: { to: address },
      fromBlock,
      toBlock: 'latest',
    }).catch(() => []),
  ]);

  return [...outLogs, ...inLogs]
    .sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber))
    .slice(0, limit);
}

export async function getRecentTransferLogs(
  address: `0x${string}`,
  limit: number = 20
) {
  try {
    const currentBlock = await getBlockNumber();

    // Progressive scan: try increasingly wider ranges.
    // Somnia has ~1s blocks, so 50k ≈ 14h, 200k ≈ 2.3 days, 500k ≈ 5.8 days.
    const ranges = [50_000n, 200_000n, 500_000n];

    for (const range of ranges) {
      const fromBlock = currentBlock > range ? currentBlock - range : 0n;
      const logs = await fetchTransferLogs(address, fromBlock, limit);
      if (logs.length > 0) return logs;
      // If we already scanned from genesis, stop
      if (fromBlock === 0n) break;
    }

    return [];
  } catch {
    return [];
  }
}

export async function getTokenBalance(
  tokenAddress: `0x${string}`,
  walletAddress: `0x${string}`
): Promise<bigint> {
  try {
    const result = await publicClient.readContract({
      address: tokenAddress,
      abi: [
        {
          type: 'function',
          name: 'balanceOf',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
        },
      ],
      functionName: 'balanceOf',
      args: [walletAddress],
    });
    return result as bigint;
  } catch {
    return 0n;
  }
}
