'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback } from 'react';
import { ReactivityProvider } from '@/lib/reactivity-context';
import { NetworkProvider } from '@/lib/network-context';
import TopBar from '@/components/layout/TopBar';
import TickerStrip from '@/components/layout/TickerStrip';
import USDCeStats from '@/components/panels/USDCeStats';
import WhalePanel from '@/components/panels/WhalePanel';
import EventFeed from '@/components/panels/EventFeed';
import AddressInfoBar from '@/components/search/AddressInfoBar';
import AddressProfile from '@/components/search/AddressProfile';
import TxDrawer from '@/components/drawer/TxDrawer';
import ParticleBackground from '@/components/ParticleBackground';
import { useAddressSearch } from '@/hooks/useAddressSearch';
import { useUSDCeFeed } from '@/hooks/useUSDCeFeed';
import { useGlobalFeed } from '@/hooks/useGlobalFeed';
import type { TxEvent } from '@/types/transaction';

// Dynamic import BubbleCanvas with SSR disabled
const BubbleCanvas = dynamic(
  () => import('@/components/canvas/BubbleCanvas'),
  { ssr: false }
);

function AppContent() {
  const { address, mode, walletData, isLoading, setAddress, clearAddress } = useAddressSearch();
  const { totalVolume, largestTransfer, uniqueWallets, recentTransfers, whaleMoves } = useUSDCeFeed();
  const globalEvents = useGlobalFeed();

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTx, setDrawerTx] = useState<TxEvent | null>(null);

  const handleBubbleClick = useCallback((tx: TxEvent) => {
    setDrawerTx(tx);
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleAddressClick = useCallback((addr: string) => {
    setAddress(addr);
  }, [setAddress]);

  const displayEvents = mode === 'address' ? [] : globalEvents;

  return (
    <div className="h-screen w-screen bg-black flex flex-col relative overflow-hidden">
      {/* Particle background */}
      <ParticleBackground />

      {/* Top Bar */}
      <TopBar onSearch={handleAddressClick} />

      {/* Ticker Strip */}
      <div className="mt-16">
        <TickerStrip transfers={recentTransfers} />
      </div>

      {/* Address Info Bar (when searching) */}
      {mode === 'address' && address && (
        <AddressInfoBar
          address={address}
          walletData={walletData}
          isLoading={isLoading}
          onClose={clearAddress}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 relative z-10">
        {/* Left: Bubble Canvas (70%) */}
        <div className="flex-[7] relative min-h-0">
          <BubbleCanvas
            mode={mode}
            address={address}
            onBubbleClick={handleBubbleClick}
          />
        </div>

        {/* Right: Panels (30%) */}
        <div className="flex-[3] flex flex-col gap-3 p-3 border-l border-[#1A1A1A] max-w-[380px] min-w-[280px] overflow-y-auto">
          {/* USDCe Stats */}
          <USDCeStats
            totalVolume={totalVolume}
            largestTransfer={largestTransfer}
            uniqueWallets={uniqueWallets}
          />

          {/* Whale Panel or Address Profile */}
          {mode === 'address' && walletData ? (
            <AddressProfile data={walletData} />
          ) : (
            <WhalePanel
              whales={whaleMoves}
              onAddressClick={handleAddressClick}
            />
          )}

          {/* Event Feed */}
          <EventFeed events={displayEvents} />
        </div>
      </div>

      {/* Transaction Drawer */}
      <TxDrawer
        open={drawerOpen}
        tx={drawerTx}
        onClose={handleCloseDrawer}
        onAddressClick={handleAddressClick}
      />
    </div>
  );
}

export default function Home() {
  return (
    <NetworkProvider>
      <ReactivityProvider>
        <AppContent />
      </ReactivityProvider>
    </NetworkProvider>
  );
}
