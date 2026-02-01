---
title: 0G Prediction Market Backend
emoji: 🎯
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
app_port: 7860
---

# 0G Prediction Market Backend

Prediction Market Aggregation Trading Terminal based on 0G Network - Backend API Service

## Description

This is the backend service for the 0G Prediction Market platform, providing:
- Market data aggregation from Polymarket
- AI-powered market analysis using 0G Compute Network
- Decentralized storage via 0G Storage
- Trading hub integration with smart contracts
- Real-time orderbook and price syncing

## API Endpoints

- `GET /` - Health check
- `GET /api/v1/health` - Detailed health status
- `GET /api/v1/markets` - List all markets
- `GET /api/v1/markets/:id` - Get market details
- `GET /api/v1/analysis/:marketId` - Get AI analysis for a market
- `GET /api/v1/trades` - Get recent trades
- `GET /api/v1/snapshots` - Get market snapshots

## Environment Variables

The following environment variables need to be configured in your Space's Settings > Variables and secrets:

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `OG_COMPUTE_API_KEY` - 0G Compute Network API key
- `STORAGE_PRIVATE_KEY` - Private key for 0G Storage
- `OG_KV_STREAM_ID` - 0G KV stream ID
- `OG_KV_NODE_RPC` - 0G KV node RPC URL
- `ORACLE_PRIVATE_KEY` - Oracle wallet private key
- `DEMO_USDC_ADDRESS` - Demo USDC contract address
- `TRADING_HUB_ADDRESS` - Trading Hub contract address

### Optional (with defaults)
- `PORT` - Server port (default: 7860, auto-configured for HF Spaces)
- `HOST` - Server host (default: 0.0.0.0)
- `NODE_ENV` - Environment mode (default: production)
- `POLYMARKET_GAMMA_BASE_URL` - Polymarket Gamma API URL
- `POLYMARKET_CLOB_BASE_URL` - Polymarket CLOB API URL
- `OG_RPC_URL` - 0G Network RPC URL
- `OG_COMPUTE_BASE_URL` - 0G Compute Network base URL
- `OG_COMPUTE_MODEL` - AI model to use (default: anthropic/claude-sonnet-4.5)

## Technology Stack

- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Blockchain**: Ethers.js for 0G Network interaction
- **AI**: 0G Compute Network integration
- **Storage**: 0G Decentralized Storage

## License

MIT
