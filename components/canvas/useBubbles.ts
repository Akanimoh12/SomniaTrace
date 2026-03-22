'use client';

import { useRef, useCallback, useEffect } from 'react';
import * as d3 from 'd3';
import type { Simulation } from 'd3';
import type { TxEvent, BubbleNode } from '@/types/transaction';
import {
  MAX_BUBBLES,
  BUBBLE_MIN_RADIUS,
  BUBBLE_MAX_RADIUS,
  BUBBLE_LIFETIME_MS,
  LARGE_TX_THRESHOLD_USD,
  WHALE_THRESHOLD_USD,
  COLORS,
  VALUE_TIER_COLORS,
} from '@/constants/chain';
import { valueToBubbleRadius, formatUSD } from '@/lib/formatters';

/** Simple hash of a string to a number 0..1 */
function hashToFloat(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h % 1000) / 1000;
}

/** Pick a color based on value tier + sender address for variety */
function getBubbleColor(tx: TxEvent): string {
  // Whale override
  if (tx.valueUSD >= LARGE_TX_THRESHOLD_USD) return COLORS.danger;

  // Value-based tier coloring (log scale tiers for testnet small values)
  const v = tx.valueUSD;
  let tier: number;
  if (v <= 0)         tier = 0;
  else if (v < 0.001) tier = 0;
  else if (v < 0.01)  tier = 1;
  else if (v < 0.1)   tier = 2;
  else if (v < 1)     tier = 3;
  else if (v < 10)    tier = 4;
  else if (v < 100)   tier = 5;
  else if (v < 1000)  tier = 6;
  else if (v < 5000)  tier = 7;
  else                tier = 8;

  // Add some per-sender variation: shift tier by 0-2 positions
  const senderShift = Math.floor(hashToFloat(tx.from) * 3);
  const idx = Math.min((tier + senderShift) % VALUE_TIER_COLORS.length, VALUE_TIER_COLORS.length - 1);
  return VALUE_TIER_COLORS[idx];
}

/** Address mode: diversify by direction + value tier */
function getAddressModeColor(tx: TxEvent): string {
  const incomingColors = [COLORS.accent, COLORS.teal, COLORS.lime, COLORS.cyan];
  const outgoingColors = [COLORS.danger, COLORS.orange, COLORS.pink, COLORS.amber];

  const palette = tx.direction === 'incoming' ? incomingColors : outgoingColors;
  // Pick within palette based on value magnitude
  const v = tx.valueUSD;
  let idx = 0;
  if (v >= 100) idx = 3;
  else if (v >= 1) idx = 2;
  else if (v >= 0.01) idx = 1;
  return palette[idx];
}

export function useBubbles(
  containerWidth: number,
  containerHeight: number,
  mode: 'global' | 'address'
) {
  const nodesRef = useRef<BubbleNode[]>([]);
  const simulationRef = useRef<Simulation<BubbleNode, undefined> | null>(null);
  const onTickRef = useRef<(() => void) | null>(null);

  // Initialize simulation
  useEffect(() => {
    if (containerWidth === 0 || containerHeight === 0) return;

    const sim = d3.forceSimulation<BubbleNode>()
      .force('center', d3.forceCenter(containerWidth / 2, containerHeight / 2).strength(0.04))
      .force('collide', d3.forceCollide<BubbleNode>((d) => d.radius + 8).strength(0.9).iterations(4))
      .force('charge', d3.forceManyBody().strength(-50).distanceMax(400))
      .force('x', d3.forceX(containerWidth / 2).strength(0.06))
      .force('y', d3.forceY(containerHeight / 2).strength(0.06))
      .alphaDecay(0.012)
      .velocityDecay(0.4)
      .on('tick', () => {
        onTickRef.current?.();
      });

    sim.nodes(nodesRef.current);
    simulationRef.current = sim;

    return () => {
      sim.stop();
      simulationRef.current = null;
    };
  }, [containerWidth, containerHeight]);

  const setOnTick = useCallback((fn: () => void) => {
    onTickRef.current = fn;
  }, []);

  const addBubble = useCallback((tx: TxEvent) => {
    const sim = simulationRef.current;
    if (!sim) return;

    const nodes = nodesRef.current;

    // Remove oldest if over cap
    if (nodes.length >= MAX_BUBBLES) {
      nodes.shift();
    }

    const radius = valueToBubbleRadius(tx.valueUSD, BUBBLE_MIN_RADIUS, BUBBLE_MAX_RADIUS);
    const color = mode === 'address' ? getAddressModeColor(tx) : getBubbleColor(tx);

    // Spawn in the central region with some randomness
    const cx = containerWidth / 2;
    const cy = containerHeight / 2;
    const spreadX = containerWidth * 0.35;
    const spreadY = containerHeight * 0.35;
    const x = cx + (Math.random() - 0.5) * spreadX;
    const y = cy + (Math.random() - 0.5) * spreadY;

    const node: BubbleNode = {
      id: tx.hash + '_' + Date.now(),
      tx,
      radius,
      color,
      ringColor: tx.valueUSD >= WHALE_THRESHOLD_USD ? COLORS.purple : undefined,
      opacity: 1,
      createdAt: Date.now(),
      label: formatUSD(tx.valueUSD),
      isWhale: tx.valueUSD >= WHALE_THRESHOLD_USD,
      isLarge: tx.valueUSD >= LARGE_TX_THRESHOLD_USD,
      x,
      y,
    };

    nodes.push(node);
    sim.nodes(nodes);
    sim.alpha(0.3).restart();
  }, [containerWidth, containerHeight, mode]);

  const clearBubbles = useCallback(() => {
    nodesRef.current = [];
    if (simulationRef.current) {
      simulationRef.current.nodes([]);
      simulationRef.current.alpha(0.1).restart();
    }
  }, []);

  const setBubbles = useCallback((txs: TxEvent[]) => {
    const nodes: BubbleNode[] = txs.map((tx, i) => {
      const radius = valueToBubbleRadius(tx.valueUSD, BUBBLE_MIN_RADIUS, BUBBLE_MAX_RADIUS);
      const color = mode === 'address' ? getAddressModeColor(tx) : getBubbleColor(tx);

      return {
        id: tx.hash + '_' + i,
        tx,
        radius,
        color,
        ringColor: tx.valueUSD >= WHALE_THRESHOLD_USD ? COLORS.purple : undefined,
        opacity: 1,
        createdAt: Date.now() - i * 50,
        label: formatUSD(tx.valueUSD),
        isWhale: tx.valueUSD >= WHALE_THRESHOLD_USD,
        isLarge: tx.valueUSD >= LARGE_TX_THRESHOLD_USD,
        x: containerWidth / 2 + (Math.random() - 0.5) * containerWidth * 0.5,
        y: containerHeight / 2 + (Math.random() - 0.5) * containerHeight * 0.5,
      };
    });

    nodesRef.current = nodes;
    if (simulationRef.current) {
      simulationRef.current.nodes(nodes);
      simulationRef.current.alpha(0.8).restart();
    }
  }, [containerWidth, containerHeight, mode]);

  // Age out old bubbles
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const nodes = nodesRef.current;
      let changed = false;

      for (let i = nodes.length - 1; i >= 0; i--) {
        const age = now - nodes[i].createdAt;
        if (age > BUBBLE_LIFETIME_MS) {
          nodes[i].opacity = Math.max(0, 1 - (age - BUBBLE_LIFETIME_MS) / 2000);
          if (nodes[i].opacity <= 0) {
            nodes.splice(i, 1);
            changed = true;
          }
        }
      }

      if (changed && simulationRef.current) {
        simulationRef.current.nodes(nodes);
        simulationRef.current.alpha(0.1).restart();
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return {
    nodes: nodesRef,
    simulation: simulationRef,
    addBubble,
    clearBubbles,
    setBubbles,
    setOnTick,
  };
}
