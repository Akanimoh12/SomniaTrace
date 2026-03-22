'use client';

import { memo } from 'react';
import type { BubbleNode } from '@/types/transaction';

interface BubbleNodeProps {
  node: BubbleNode;
  onClick: (node: BubbleNode) => void;
}

function BubbleNodeComponent({ node, onClick }: BubbleNodeProps) {
  const size = node.radius * 2;
  const fontSize = Math.max(11, Math.min(node.radius * 0.3, 20));

  return (
    <div
      className="absolute rounded-full flex items-center justify-center cursor-pointer transition-transform duration-150 hover:scale-110 hover:z-10"
      style={{
        width: size,
        height: size,
        left: (node.x || 0) - node.radius,
        top: (node.y || 0) - node.radius,
        background: `radial-gradient(circle at 35% 35%, ${node.color}60, ${node.color}25 60%, ${node.color}08)`,
        border: `2px solid ${node.color}90`,
        opacity: node.opacity,
        boxShadow: node.isLarge
          ? `0 0 30px ${node.color}60, 0 0 60px ${node.color}30, inset 0 0 25px ${node.color}20`
          : `0 0 16px ${node.color}40, inset 0 0 12px ${node.color}15`,
        transform: `scale(${node.opacity < 0.5 ? node.opacity : 1})`,
        willChange: 'left, top, opacity, transform',
      }}
      onClick={() => onClick(node)}
    >
      {/* Whale ring */}
      {node.ringColor && (
        <div
          className="absolute inset-[-4px] rounded-full animate-pulse"
          style={{
            border: `3px solid ${node.ringColor}90`,
            boxShadow: `0 0 20px ${node.ringColor}50`,
          }}
        />
      )}

      {/* Large tx pulsing ring */}
      {node.isLarge && (
        <div
          className="absolute inset-[-8px] rounded-full animate-ping"
          style={{
            border: `1.5px solid ${node.color}50`,
            animationDuration: '2s',
          }}
        />
      )}

      {/* Label — always show on all bubbles */}
      <div className="flex flex-col items-center pointer-events-none px-1">
        <span
          className="font-mono font-bold leading-tight text-center"
          style={{
            fontSize,
            color: '#F0F0F0',
            textShadow: `0 0 8px ${node.color}AA, 0 1px 3px rgba(0,0,0,0.9)`,
          }}
        >
          {node.label}
        </span>
        {node.radius > 24 && (
          <span
            className="font-mono leading-none mt-0.5 font-semibold"
            style={{
              fontSize: Math.max(9, fontSize * 0.6),
              color: node.color,
              textShadow: `0 0 6px ${node.color}70`,
            }}
          >
            {node.tx.tokenSymbol}
          </span>
        )}
        {node.radius > 40 && (
          <span
            className="font-mono leading-none mt-0.5 opacity-60"
            style={{
              fontSize: Math.max(8, fontSize * 0.45),
              color: '#999',
            }}
          >
            {node.tx.direction === 'incoming' ? 'IN' : node.tx.direction === 'outgoing' ? 'OUT' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

export default memo(BubbleNodeComponent);
