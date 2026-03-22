'use client';

import { useEffect, useRef, useState } from 'react';
import type { TxEvent } from '@/types/transaction';
import { formatAddress, formatUSD, formatTimeAgo } from '@/lib/formatters';

interface TickerStripProps {
  transfers: TxEvent[];
}

export default function TickerStrip({ transfers }: TickerStripProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayItems, setDisplayItems] = useState<TxEvent[]>([]);

  useEffect(() => {
    if (transfers.length > 0) {
      setDisplayItems(prev => {
        const combined = [...transfers, ...prev];
        // Deduplicate by hash
        const seen = new Set<string>();
        return combined.filter(t => {
          if (seen.has(t.hash)) return false;
          seen.add(t.hash);
          return true;
        }).slice(0, 30);
      });
    }
  }, [transfers]);

  if (displayItems.length === 0) {
    return (
      <div className="w-full h-10 bg-[#0D0D0D] border-b border-[#1A1A1A] flex items-center justify-center">
        <span className="text-sm text-[#666666] font-mono">Waiting for token transfers...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-10 bg-[#0D0D0D]/80 backdrop-blur-sm border-b border-[#1A1A1A] overflow-hidden relative">
      <div ref={containerRef} className="flex items-center h-full animate-ticker whitespace-nowrap">
        {/* Duplicate items for seamless loop */}
        {[...displayItems, ...displayItems].map((tx, i) => (
          <div key={`${tx.hash}-${i}`} className="inline-flex items-center gap-2 px-4 shrink-0">
            <span className="text-sm font-mono text-[#666666]">
              {formatAddress(tx.from)}
            </span>
            <span className="text-sm text-[#666666]">→</span>
            <span className="text-sm font-mono text-[#666666]">
              {formatAddress(tx.to)}
            </span>
            <span className="text-sm text-[#666666]">·</span>
            <span className="text-sm font-mono text-[#00FFA3] font-medium">
              {formatUSD(tx.valueUSD)}
            </span>
            <span className="text-sm text-[#666666]">·</span>
            <span className="text-sm text-[#666666]">
              {formatTimeAgo(tx.timestamp)}
            </span>
            <span className="text-sm text-[#1A1A1A] mx-2">│</span>
          </div>
        ))}
      </div>
    </div>
  );
}
