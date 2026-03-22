export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatUSD(value: number): string {
  if (value < 0.01) return '$0.00';
  if (value < 1000) return `$${value.toFixed(2)}`;
  if (value < 1_000_000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${(value / 1_000_000).toFixed(1)}M`;
}

export function formatValue(value: number): string {
  if (value < 1000) return value.toFixed(2);
  if (value < 1_000_000) return `${(value / 1000).toFixed(1)}k`;
  return `${(value / 1_000_000).toFixed(1)}M`;
}

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 1000) return '<1s';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  return `${Math.floor(diff / 3_600_000)}h`;
}

export function formatHash(hash: string): string {
  if (!hash || hash.length < 12) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

export function addressToTopic(address: string): string {
  return '0x' + address.slice(2).toLowerCase().padStart(64, '0');
}

export function topicToAddress(topic: string): string {
  return '0x' + topic.slice(-40);
}

export function valueToBubbleRadius(valueUSD: number, minR: number, maxR: number): number {
  // Adaptive scale: even tiny testnet values get decent bubbles
  if (valueUSD <= 0) return minR;
  // Use a shifted log so even $0.01 gets ~30% of range
  const logVal = Math.log10(valueUSD + 0.1) + 2; // shift so 0.01 → ~0.0, 1→2, 100→4, 10k→6
  const logMax = 6; // $10k
  const ratio = Math.min(Math.max(logVal / logMax, 0.25), 1);
  return minR + ratio * (maxR - minR);
}

export function parseTransferValue(hexData: string): bigint {
  try {
    if (!hexData || hexData === '0x') return 0n;
    return BigInt(hexData);
  } catch {
    return 0n;
  }
}

export function weiToUSD(value: bigint, decimals: number = 18, priceUSD: number = 1): number {
  const divisor = 10 ** decimals;
  return (Number(value) / divisor) * priceUSD;
}
