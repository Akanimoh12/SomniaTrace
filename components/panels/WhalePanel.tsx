'use client';

import { Fish } from 'lucide-react';
import type { WhaleTx } from '@/types/transaction';
import { formatAddress, formatUSD, formatTimeAgo } from '@/lib/formatters';

interface WhalePanelProps {
  whales: WhaleTx[];
  onAddressClick: (address: string) => void;
}

export default function WhalePanel({ whales, onAddressClick }: WhalePanelProps) {
  return (
    <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-4 flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <Fish className="w-5 h-5 text-[#7B61FF]" />
        <h3 className="text-base font-grotesk font-semibold text-[#F0F0F0]">Whale Activity</h3>
      </div>

      <div className="space-y-1 overflow-y-auto max-h-[calc(100%-2rem)]">
        {whales.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-[#666666] font-mono">No whale moves yet</p>
            <p className="text-xs text-[#444444] font-mono mt-1">Watching for transfers &gt;$5k</p>
          </div>
        ) : (
          whales.map((whale, i) => (
            <div
              key={whale.hash + i}
              className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-[#1A1A1A]/50 cursor-pointer transition-all duration-200 animate-slideDown"
              onClick={() => onAddressClick(whale.address)}
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono"
                style={{
                  backgroundColor: i < 3 ? '#7B61FF20' : '#1A1A1A',
                  color: i < 3 ? '#7B61FF' : '#666666',
                }}>
                {i + 1}
              </div>
              <span className="text-sm font-mono text-[#F0F0F0] flex-1 truncate">
                {formatAddress(whale.address)}
              </span>
              <span className="text-xs font-mono text-[#666666]">
                {whale.tokenSymbol}
              </span>
              <span className="text-sm font-mono font-semibold text-[#00FFA3]">
                {formatUSD(whale.amount)}
              </span>
              <span className="text-xs font-mono text-[#666666]">
                {formatTimeAgo(whale.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
