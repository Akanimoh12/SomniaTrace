'use client';

import { X, Copy, Check, Wallet } from 'lucide-react';
import { useState, useCallback } from 'react';
import type { AddressProfileData } from '@/types/transaction';
import { formatAddress, formatUSD } from '@/lib/formatters';

interface AddressInfoBarProps {
  address: string;
  walletData: AddressProfileData | null;
  isLoading: boolean;
  onClose: () => void;
}

export default function AddressInfoBar({ address, walletData, isLoading, onClose }: AddressInfoBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [address]);

  const sttBalance = walletData ? Number(walletData.sttBalance) / 1e18 : 0;
  const usdceBalance = walletData ? Number(walletData.usdceBalance) / 1e18 : 0;

  return (
    <div className="w-full bg-[#0D0D0D] border-b border-[#1A1A1A] px-4 py-2 flex items-center gap-4 animate-slideDown">
      <Wallet className="w-5 h-5 text-[#7B61FF] shrink-0" />

      <div className="flex items-center gap-2">
        <span className="text-sm text-[#666666]">Viewing:</span>
        <span className="text-sm font-mono text-[#F0F0F0]">{formatAddress(address)}</span>
        <button onClick={handleCopy} className="p-1 hover:bg-[#1A1A1A] rounded transition-colors">
          {copied ? (
            <Check className="w-3 h-3 text-[#00FFA3]" />
          ) : (
            <Copy className="w-3 h-3 text-[#666666]" />
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border border-[#00FFA3] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#666666]">Loading...</span>
        </div>
      ) : walletData ? (
        <div className="flex items-center gap-4 text-sm font-mono">
          <div>
            <span className="text-[#666666]">STT: </span>
            <span className="text-[#7B61FF]">{sttBalance.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-[#666666]">PFT: </span>
            <span className="text-[#00FFA3]">{formatUSD(usdceBalance)}</span>
          </div>
          <div>
            <span className="text-[#666666]">Txs: </span>
            <span className="text-[#F0F0F0]">{walletData.txCount.toLocaleString()}</span>
          </div>
          {walletData.tag !== 'unknown' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
              style={{
                backgroundColor:
                  walletData.tag === 'whale' ? '#7B61FF20' :
                  walletData.tag === 'bot' ? '#FF4D4D20' :
                  walletData.tag === 'fresh' ? '#00FFA320' : '#FFB80020',
                color:
                  walletData.tag === 'whale' ? '#7B61FF' :
                  walletData.tag === 'bot' ? '#FF4D4D' :
                  walletData.tag === 'fresh' ? '#00FFA3' : '#FFB800',
              }}>
              {walletData.tag}
            </span>
          )}
        </div>
      ) : null}

      <button
        onClick={onClose}
        className="ml-auto p-1 hover:bg-[#1A1A1A] rounded transition-colors"
      >
        <X className="w-4 h-4 text-[#666666] hover:text-[#F0F0F0]" />
      </button>
    </div>
  );
}
