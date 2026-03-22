'use client';

import { Activity } from 'lucide-react';
import { formatUSD } from '@/lib/formatters';

interface USDCeStatsProps {
  totalVolume: number;
  largestTransfer: number;
  uniqueWallets: number;
}

export default function USDCeStats({ totalVolume, largestTransfer, uniqueWallets }: USDCeStatsProps) {
  return (
    <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-5 h-5 text-[#00FFA3]" />
        <h3 className="text-base font-grotesk font-semibold text-[#F0F0F0]">Token Flow</h3>
        <div className="ml-auto w-2.5 h-2.5 rounded-full bg-[#00FFA3] animate-pulse" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-[#666666]">Volume</p>
          <p className="text-base font-mono font-semibold text-[#00FFA3]">
            {formatUSD(totalVolume)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-[#666666]">Largest</p>
          <p className="text-base font-mono font-semibold text-[#FF4D4D]">
            {formatUSD(largestTransfer)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-[#666666]">Wallets</p>
          <p className="text-base font-mono font-semibold text-[#7B61FF]">
            {uniqueWallets.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
