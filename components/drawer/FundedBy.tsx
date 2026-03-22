'use client';

import { useEffect, useState } from 'react';
import type { FundedByInfo } from '@/types/transaction';
import { getFirstInboundTransfer } from '@/lib/rpc';
import { formatAddress, formatTimeAgo } from '@/lib/formatters';
import { Loader2 } from 'lucide-react';

interface FundedByProps {
  fromAddress: string;
}

export default function FundedBy({ fromAddress }: FundedByProps) {
  const [data, setData] = useState<FundedByInfo | null | 'loading'>('loading');

  useEffect(() => {
    if (!fromAddress) return;
    setData('loading');

    getFirstInboundTransfer(fromAddress as `0x${string}`)
      .then(result => {
        if (result) {
          setData({
            address: result.from,
            amount: result.value,
            timestamp: result.timestamp,
            hash: result.hash,
          });
        } else {
          setData(null);
        }
      })
      .catch(() => setData(null));
  }, [fromAddress]);

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[#666666] mb-2">Funded By</p>

      {data === 'loading' ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="w-3 h-3 text-[#666666] animate-spin" />
          <span className="text-xs text-[#666666]">Looking up origin...</span>
        </div>
      ) : data ? (
        <div className="bg-[#1A1A1A]/50 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#F0F0F0]">
              {formatAddress(data.address)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-[#666666]">
            <span>{(Number(data.amount) / 1e18).toFixed(4)} STT</span>
            <span>·</span>
            <span>{formatTimeAgo(data.timestamp)}</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[#666666] italic">Origin unknown</p>
      )}
    </div>
  );
}
