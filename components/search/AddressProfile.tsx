'use client';

import { User, Tag, Coins, FileCode } from 'lucide-react';
import type { AddressProfileData } from '@/types/transaction';
import { formatAddress } from '@/lib/formatters';

interface AddressProfileProps {
  data: AddressProfileData;
}

const TAG_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  whale: { icon: '🐋', color: '#7B61FF', label: 'Whale' },
  bot: { icon: '🤖', color: '#FF4D4D', label: 'Bot' },
  fresh: { icon: '🌱', color: '#00FFA3', label: 'Fresh Wallet' },
  degen: { icon: '🎰', color: '#FFB800', label: 'Degen' },
  unknown: { icon: '❓', color: '#666666', label: 'Unknown' },
};

export default function AddressProfile({ data }: AddressProfileProps) {
  const tag = TAG_CONFIG[data.tag] || TAG_CONFIG.unknown;

  return (
    <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-4 flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <User className="w-5 h-5 text-[#7B61FF]" />
        <h3 className="text-base font-grotesk font-semibold text-[#F0F0F0]">Address Profile</h3>
      </div>

      {/* Tag */}
      <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg" style={{ backgroundColor: tag.color + '10' }}>
        <span className="text-lg">{tag.icon}</span>
        <div>
          <p className="text-sm font-grotesk font-semibold" style={{ color: tag.color }}>
            {tag.label}
          </p>
          <p className="text-xs font-mono text-[#666666]">
            {formatAddress(data.address)}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#666666] mb-1 flex items-center gap-1">
            <Coins className="w-3.5 h-3.5" /> Balances
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#1A1A1A]/50 rounded-lg px-3 py-2">
              <p className="text-xs text-[#666666]">STT</p>
              <p className="text-sm font-mono text-[#7B61FF]">
                {(Number(data.sttBalance) / 1e18).toFixed(2)}
              </p>
            </div>
            <div className="bg-[#1A1A1A]/50 rounded-lg px-3 py-2">
              <p className="text-xs text-[#666666]">PFT</p>
              <p className="text-sm font-mono text-[#00FFA3]">
                {(Number(data.usdceBalance) / 1e18).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-[#666666] mb-1 flex items-center gap-1">
            <FileCode className="w-3.5 h-3.5" /> Activity
          </p>
          <div className="bg-[#1A1A1A]/50 rounded-lg px-3 py-2">
            <p className="text-xs text-[#666666]">Total Transactions</p>
            <p className="text-sm font-mono text-[#F0F0F0]">
              {data.txCount.toLocaleString()}
            </p>
          </div>
        </div>

        {data.topTokens.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-[#666666] mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Top Tokens
            </p>
            <div className="flex flex-wrap gap-1">
              {data.topTokens.map((token, i) => (
                <span key={i} className="text-xs font-mono px-2 py-0.5 rounded bg-[#1A1A1A] text-[#F0F0F0]">
                  {token}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
