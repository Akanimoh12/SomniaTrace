'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';
import { useBubbles } from './useBubbles';
import BubbleNodeComponent from './BubbleNode';
import type { TxEvent, BubbleNode } from '@/types/transaction';
import { useGlobalFeed } from '@/hooks/useGlobalFeed';
import { useAddressFeed } from '@/hooks/useAddressFeed';

interface BubbleCanvasProps {
  mode: 'global' | 'address';
  address: string | null;
  onBubbleClick: (tx: TxEvent) => void;
}

/** SVG overlay that draws faint lines between bubbles sharing the same from/to addresses */
function ConnectionLines({ nodes, zoom }: { nodes: BubbleNode[]; zoom: number }) {
  const lines = useMemo(() => {
    if (nodes.length < 2) return [];
    const result: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        if (
          a.tx.from === b.tx.from ||
          a.tx.from === b.tx.to ||
          a.tx.to === b.tx.from ||
          a.tx.to === b.tx.to
        ) {
          result.push({
            x1: (a.x || 0) * zoom,
            y1: (a.y || 0) * zoom,
            x2: (b.x || 0) * zoom,
            y2: (b.y || 0) * zoom,
            color: a.color,
          });
        }
      }
      if (result.length > 60) break;
    }
    return result;
  }, [nodes, zoom]);

  if (lines.length === 0) return null;

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
      {lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke={l.color}
          strokeOpacity={0.15}
          strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}

export default function BubbleCanvas({ mode, address, onBubbleClick }: BubbleCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [renderNodes, setRenderNodes] = useState<BubbleNode[]>([]);
  const [zoom, setZoom] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);

  const { nodes, addBubble, clearBubbles, setBubbles, setOnTick } = useBubbles(
    dimensions.width,
    dimensions.height,
    mode
  );

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Sync D3 ticks to React state
  useEffect(() => {
    setOnTick(() => {
      setRenderNodes([...nodes.current]);
    });
  }, [setOnTick, nodes]);

  // Handle global feed transactions
  const handleGlobalTx = useCallback((tx: TxEvent) => {
    if (mode === 'global') addBubble(tx);
  }, [mode, addBubble]);

  // Handle address feed — single tx callback
  const handleAddressTx = useCallback((tx: TxEvent) => {
    if (mode === 'address') addBubble(tx);
  }, [mode, addBubble]);

  // Handle address feed — batch load of historical txs
  const handleAddressBatch = useCallback((txs: TxEvent[]) => {
    if (mode === 'address') setBubbles(txs);
  }, [mode, setBubbles]);

  // Use feeds
  useGlobalFeed(mode === 'global' ? handleGlobalTx : undefined);
  const { isLoading: addressLoading, isEmpty: addressEmpty } = useAddressFeed(
    mode === 'address' ? address : null,
    handleAddressTx,
    handleAddressBatch,
  );

  // Clear bubbles when mode changes
  useEffect(() => {
    clearBubbles();
    setZoom(1);
  }, [mode, address, clearBubbles]);

  const handleBubbleClick = useCallback((node: BubbleNode) => {
    onBubbleClick(node.tx);
  }, [onBubbleClick]);

  // Zoom controls
  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z + 0.25, 3)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z - 0.25, 0.5)), []);
  const handleToggleExpand = useCallback(() => setIsExpanded(e => !e), []);

  // Scroll-to-zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      return Math.min(3, Math.max(0.5, z + delta));
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${
        isExpanded ? 'fixed inset-0 z-[55] bg-black' : ''
      }`}
      style={{ minHeight: '400px' }}
      onWheel={handleWheel}
    >
      {/* Canvas grid overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none' stroke='%23ffffff' stroke-width='0.5'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }} />

      {/* Zoom transform container */}
      <div
        className="absolute inset-0 transition-transform duration-200 ease-out"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Connection lines */}
        <ConnectionLines nodes={renderNodes} zoom={1} />

        {/* Bubbles */}
        {renderNodes.map(node => (
          <BubbleNodeComponent
            key={node.id}
            node={node}
            onClick={handleBubbleClick}
          />
        ))}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-20">
        <button
          onClick={handleZoomIn}
          className="w-9 h-9 flex items-center justify-center bg-[#0D0D0D]/90 border border-[#1A1A1A] rounded-lg hover:border-[#00FFA3]/40 transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4 text-[#F0F0F0]" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-9 h-9 flex items-center justify-center bg-[#0D0D0D]/90 border border-[#1A1A1A] rounded-lg hover:border-[#00FFA3]/40 transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4 text-[#F0F0F0]" />
        </button>
        <button
          onClick={handleToggleExpand}
          className="w-9 h-9 flex items-center justify-center bg-[#0D0D0D]/90 border border-[#1A1A1A] rounded-lg hover:border-[#00FFA3]/40 transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand fullscreen'}
        >
          {isExpanded ? (
            <Minimize2 className="w-4 h-4 text-[#F0F0F0]" />
          ) : (
            <Maximize2 className="w-4 h-4 text-[#F0F0F0]" />
          )}
        </button>
        {zoom !== 1 && (
          <span className="text-[10px] font-mono text-[#666666] text-center">
            {Math.round(zoom * 100)}%
          </span>
        )}
      </div>

      {/* Empty / Loading / No-results state */}
      {renderNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            {mode === 'address' && addressEmpty ? (
              <>
                <div className="w-20 h-20 mx-auto mb-4 rounded-full border border-[#333] flex items-center justify-center">
                  <span className="text-2xl">&#x1F50D;</span>
                </div>
                <p className="text-[#999] text-lg font-mono">
                  No ERC-20 transfers found
                </p>
                <p className="text-[#555] text-sm font-mono mt-1">
                  This wallet has no recent token transfers on Somnia
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 mx-auto mb-4 rounded-full border border-[#1A1A1A] flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-[#00FFA3] animate-ping" />
                </div>
                <p className="text-[#666666] text-lg font-mono">
                  {mode === 'global' ? 'Connecting to Somnia...' : 'Fetching wallet transactions...'}
                </p>
                <p className="text-[#444444] text-sm font-mono mt-1">
                  {mode === 'global'
                    ? 'Polling chain for live transactions'
                    : addressLoading
                      ? 'Scanning blocks (this may take a moment for inactive wallets)'
                      : 'Waiting for live transfers...'}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
