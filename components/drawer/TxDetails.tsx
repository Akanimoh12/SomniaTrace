'use client';

import { Copy, ExternalLink, Check } from 'lucide-react';
import { useState, useCallback } from 'react';
import type { TxEvent } from '@/types/transaction';
import { formatAddress, formatHash, formatUSD, formatTimeAgo } from '@/lib/formatters';
import { SOMNIA_EXPLORER } from '@/constants/chain';

interface TxDetailsProps {
  tx: TxEvent;
  onAddressClick: (address: string) => void;
}

export default function TxDetails({ tx, onAddressClick }: TxDetailsProps) {
  const [copiedHash, setCopiedHash] = useState(false);

  const copyHash = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tx.hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } catch {}
  }, [tx.hash]);

  return (
    <div className="space-y-4">
      {/* Hash */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[#666666] mb-1">Transaction Hash</p>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#F0F0F0]">{formatHash(tx.hash)}</span>
          <button onClick={copyHash} className="p-1 hover:bg-[#1A1A1A] rounded transition-colors">
            {copiedHash ? (
              <Check className="w-3 h-3 text-[#00FFA3]" />
            ) : (
              <Copy className="w-3 h-3 text-[#666666]" />
            )}
          </button>
          <a
            href={`${SOMNIA_EXPLORER}/tx/${tx.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 hover:bg-[#1A1A1A] rounded transition-colors"
          >
            <ExternalLink className="w-3 h-3 text-[#666666]" />
          </a>
        </div>
      </div>

      {/* Block & Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#666666] mb-1">Block</p>
          <p className="text-xs font-mono text-[#F0F0F0]">#{tx.blockNumber.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#666666] mb-1">Time</p>
          <p className="text-xs font-mono text-[#F0F0F0]">{formatTimeAgo(tx.timestamp)}</p>
        </div>
      </div>

      {/* From */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[#666666] mb-1">From</p>
        <button
          onClick={() => onAddressClick(tx.from)}
          className="text-xs font-mono text-[#00FFA3] hover:underline"
        >
          {formatAddress(tx.from)}
        </button>
      </div>

      {/* To */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[#666666] mb-1">To</p>
        <button
          onClick={() => onAddressClick(tx.to)}
          className="text-xs font-mono text-[#7B61FF] hover:underline"
        >
          {formatAddress(tx.to)}
        </button>
      </div>

      {/* Value */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[#666666] mb-1">Value</p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-semibold text-[#F0F0F0]">
            {formatUSD(tx.valueUSD)}
          </span>
          <span className="text-xs font-mono text-[#666666]">{tx.tokenSymbol}</span>
        </div>
      </div>

      {/* Gas */}
      {tx.gasUsed && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#666666] mb-1">Gas Used</p>
            <p className="text-xs font-mono text-[#F0F0F0]">{tx.gasUsed.toString()}</p>
          </div>
          {tx.gasPrice && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#666666] mb-1">Gas Price</p>
              <p className="text-xs font-mono text-[#F0F0F0]">{tx.gasPrice.toString()}</p>
            </div>
          )}
        </div>
      )}

      {/* Status */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[#666666] mb-1">Status</p>
        <span
          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
          style={{
            backgroundColor: tx.status === 'pending' ? '#FFB80020' : '#00FFA320',
            color: tx.status === 'pending' ? '#FFB800' : '#00FFA3',
          }}
        >
          {tx.status === 'pending' ? 'PENDING' : 'CONFIRMED'}
        </span>
      </div>
    </div>
  );
}
