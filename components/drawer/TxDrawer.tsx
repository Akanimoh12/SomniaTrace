'use client';

import { useEffect, useRef, useCallback } from 'react';
import { X, ArrowRight } from 'lucide-react';
import type { TxEvent } from '@/types/transaction';
import TxDetails from './TxDetails';
import FundedBy from './FundedBy';

interface TxDrawerProps {
  open: boolean;
  tx: TxEvent | null;
  onClose: () => void;
  onAddressClick: (address: string) => void;
}

export default function TxDrawer({ open, tx, onClose, onAddressClick }: TxDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleViewWallet = useCallback(() => {
    if (tx) {
      onClose();
      onAddressClick(tx.from);
    }
  }, [tx, onClose, onAddressClick]);

  return (
    <div
      ref={drawerRef}
      className={`fixed top-0 right-0 h-full w-[360px] z-[60] bg-[#0D0D0D] border-l border-[#1A1A1A] transform transition-transform duration-250 ease-out ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {tx && (
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#1A1A1A]">
            <h3 className="text-base font-grotesk font-semibold text-[#F0F0F0]">Transaction Details</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#1A1A1A] rounded transition-colors"
            >
              <X className="w-4 h-4 text-[#666666]" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <TxDetails tx={tx} onAddressClick={(addr) => { onClose(); onAddressClick(addr); }} />

            <div className="border-t border-[#1A1A1A] pt-4">
              <FundedBy fromAddress={tx.from} />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#1A1A1A]">
            <button
              onClick={handleViewWallet}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#00FFA3]/10 hover:bg-[#00FFA3]/20 border border-[#00FFA3]/30 rounded-lg transition-colors"
            >
              <span className="text-sm font-grotesk font-semibold text-[#00FFA3]">View Wallet</span>
              <ArrowRight className="w-4 h-4 text-[#00FFA3]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
