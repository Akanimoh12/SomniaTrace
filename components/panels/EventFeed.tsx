'use client';

import { Radio } from 'lucide-react';
import type { TxEvent } from '@/types/transaction';
import { formatHash, formatUSD, formatTimeAgo } from '@/lib/formatters';
import { COLORS } from '@/constants/chain';

interface EventFeedProps {
  events: TxEvent[];
}

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  usdce: { label: 'PFT', color: COLORS.accent },
  stt: { label: 'STT', color: COLORS.purple },
  contract: { label: 'Contract', color: COLORS.amber },
  unknown: { label: 'TX', color: COLORS.muted },
};

export default function EventFeed({ events }: EventFeedProps) {
  return (
    <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-4 flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <Radio className="w-5 h-5 text-[#00FFA3]" />
        <h3 className="text-base font-grotesk font-semibold text-[#F0F0F0]">Live Events</h3>
        <div className="ml-auto w-2.5 h-2.5 rounded-full bg-[#00FFA3] animate-pulse" />
      </div>

      <div className="space-y-0.5 overflow-y-auto max-h-[calc(100%-2rem)]">
        {events.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-[#666666] font-mono">Waiting for events...</p>
          </div>
        ) : (
          events.map((event, i) => {
            const badge = TYPE_BADGES[event.type] || TYPE_BADGES.unknown;
            return (
              <div
                key={event.hash + i}
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[#1A1A1A]/50 transition-colors"
              >
                <span
                  className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: badge.color + '15',
                    color: badge.color,
                  }}
                >
                  {badge.label}
                </span>
                <span className="text-sm font-mono text-[#666666] flex-1 truncate">
                  {formatHash(event.hash)}
                </span>
                <span className="text-sm font-mono font-semibold" style={{ color: badge.color }}>
                  {formatUSD(event.valueUSD)}
                </span>
                <span className="text-xs font-mono text-[#666666]">
                  {formatTimeAgo(event.timestamp)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
