# SomniaTrace

Real-time blockchain explorer for the **Somnia Network** with interactive bubble visualization. Watch transactions flow across the network as dynamic, physics-driven bubbles — search any wallet, switch networks, zoom, and expand for a clearer view.

![SomniaTrace Preview](./public/preview.png)

## Features

- **Live Transaction Bubbles** — Real-time D3.js force simulation visualizing on-chain activity as physics-driven, interactive bubbles
- **Somnia Reactivity Integration** — Leverages the Somnia Reactivity SDK for instant, push-based event streaming directly from the chain
- **Wallet Search** — Look up any address to see its transaction history rendered as bubbles instantly
- **Network Switching** — Toggle between Somnia Devnet and Testnet at runtime with persistent preferences
- **Zoom & Fullscreen** — Scroll to zoom, expand the canvas to fullscreen for a detailed inspection of each bubble
- **Transaction Panel** — Side panel with a live transaction feed showing real-time details
- **Token Tracking** — Monitors PFT (ERC-20) transfers on Somnia Testnet

## How Reactivity Powers SomniaTrace

SomniaTrace is built on top of the [Somnia Reactivity SDK](https://www.npmjs.com/package/@somnia-chain/reactivity) (`@somnia-chain/reactivity`) — the protocol-native push layer for the Somnia blockchain that eliminates the need for constant RPC polling.

**What Reactivity does for SomniaTrace:**

- **Instant event streaming** — Instead of polling the RPC every few seconds and missing blocks, Reactivity pushes new ERC-20 Transfer events and block headers to the client the moment they're confirmed on-chain. This is what makes the bubbles appear in real time.
- **Subscription-based architecture** — SomniaTrace subscribes to on-chain events using topic-based filters (e.g., Transfer event signatures, specific contract emitters). When the chain produces a matching event, Reactivity delivers it directly via WebSocket — no wasted requests, no delays.
- **Block tick via Reactivity** — The `useBlockTick` hook subscribes to `newHeads` through Reactivity, keeping the UI's block counter in sync with the chain without polling `eth_blockNumber` repeatedly.
- **Resilient fallback** — If the Reactivity SDK connection drops, SomniaTrace falls back to a raw WebSocket subscription and then to RPC polling, ensuring the explorer stays live regardless of network conditions.

In short, Reactivity is the backbone of SomniaTrace's real-time experience. Without it, the bubble visualization would rely on slow, inefficient polling. With it, every transaction appears on screen the instant the chain confirms it.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Visualization | D3.js force simulation |
| Blockchain | viem, Somnia Reactivity SDK |
| Icons | Lucide React |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
├── app/              # Next.js App Router pages and layout
├── components/       # UI components (canvas, panels, search, layout)
├── hooks/            # React hooks (useGlobalFeed, useBlockTick, useReactivity)
├── lib/              # Core logic (RPC client, Reactivity SDK, poller, formatters)
├── constants/        # Chain config, token addresses, bubble settings
└── types/            # TypeScript interfaces (ReactivityEvent, TxEvent)
```

## Links

- **Live App:** [somniatrace.vercel.app](https://somniatrace.vercel.app)
- **Demo Video:** [Watch on Loom](https://www.loom.com/share/aeb67db1c35b42cc84ef07bad08bb1dd)

## License

MIT

