'use client';

import { useState, useCallback } from 'react';
import { Search, Wifi, WifiOff, Blocks, Globe } from 'lucide-react';
import { useBlockTick } from '@/hooks/useBlockTick';
import { useReactivity } from '@/hooks/useReactivity';
import { useNetwork } from '@/lib/network-context';
import { NETWORKS } from '@/constants/chain';

interface TopBarProps {
  onSearch: (address: string) => void;
}

export default function TopBar({ onSearch }: TopBarProps) {
  const [searchValue, setSearchValue] = useState('');
  const blockNumber = useBlockTick();
  const { isConnected } = useReactivity();
  const { network, networkKey, switchNetwork } = useNetwork();
  const [showNetMenu, setShowNetMenu] = useState(false);

  const handleSearch = useCallback(() => {
    const addr = searchValue.trim();
    if (/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      onSearch(addr);
    }
  }, [searchValue, onSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-black/90 backdrop-blur-sm border-b border-[#1A1A1A] flex items-center px-5 gap-5">
      {/* Logo */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-[#00FFA3]/10 flex items-center justify-center">
          <Blocks className="w-5 h-5 text-[#00FFA3]" />
        </div>
        <span className="font-grotesk font-bold text-2xl text-[#00FFA3] tracking-tight">
          SomniaTrace
        </span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
          <input
            type="text"
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search wallet address (0x...)"
            className="w-full h-10 pl-10 pr-4 bg-[#0D0D0D] border border-[#1A1A1A] rounded-lg text-base font-mono text-[#F0F0F0] placeholder:text-[#666666] focus:outline-none focus:border-[#00FFA3]/40 focus:ring-1 focus:ring-[#00FFA3]/20 transition-colors"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Network selector */}
        <div className="relative">
          <button
            onClick={() => setShowNetMenu(p => !p)}
            className="flex items-center gap-2 px-3 py-2 bg-[#0D0D0D] border border-[#1A1A1A] rounded-lg hover:border-[#00FFA3]/30 transition-colors"
          >
            <Globe className="w-4 h-4 text-[#00FFA3]" />
            <span className="text-sm font-mono text-[#F0F0F0]">{network.label}</span>
            <span className={`w-2 h-2 rounded-full ${network.isTestnet ? 'bg-[#FFB800]' : 'bg-[#00FFA3]'}`} />
          </button>

          {showNetMenu && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-[#0D0D0D] border border-[#1A1A1A] rounded-lg overflow-hidden shadow-lg z-50">
              {Object.entries(NETWORKS).map(([key, net]) => (
                <button
                  key={key}
                  onClick={() => {
                    setShowNetMenu(false);
                    if (key !== networkKey) {
                      switchNetwork(key);
                    }
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm font-mono hover:bg-[#1A1A1A] transition-colors ${
                    key === networkKey ? 'text-[#00FFA3]' : 'text-[#F0F0F0]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${net.isTestnet ? 'bg-[#FFB800]' : 'bg-[#00FFA3]'}`} />
                  {net.name}
                  {key === networkKey && <span className="ml-auto text-xs text-[#666666]">active</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-[#00FFA3]" />
          ) : (
            <WifiOff className="w-4 h-4 text-[#FF4D4D]" />
          )}
          <span className={`text-sm font-mono ${isConnected ? 'text-[#00FFA3]' : 'text-[#FF4D4D]'}`}>
            {isConnected ? 'Live' : 'Polling'}
          </span>
        </div>

        {/* Block counter */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#0D0D0D] border border-[#1A1A1A] rounded-lg">
          <div className={`w-2.5 h-2.5 rounded-full ${blockNumber > 0 ? 'bg-[#00FFA3] animate-pulse' : 'bg-[#666666]'}`} />
          <span className="text-sm font-mono text-[#F0F0F0]">
            Block #{blockNumber.toLocaleString()}
          </span>
        </div>
      </div>
    </header>
  );
}
