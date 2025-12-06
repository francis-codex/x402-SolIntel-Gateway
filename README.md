# 🎮 x402-SolIntel-Gateway

> The ultimate AI-powered Solana intelligence platform. Pay-per-use with x402 micropayments.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solana](https://img.shields.io/badge/Solana-Mainnet-blue)](https://solana.com)
[![x402](https://img.shields.io/badge/x402-Enabled-green)](https://x402.org)

## 🎯 What is This?

A comprehensive AI intelligence platform for Solana users that combines OpenAI's GPT-4 with on-chain data to provide:

- 🔍 **Quick Token Check** - Instant risk scoring and analysis ($0.02)
- 📊 **Deep Token Analysis** - Full due diligence reports ($0.08)
- 🛡️ **Smart Contract Audits** - Security vulnerability detection ($0.10)
- 👤 **Wallet Intelligence** - Trading pattern analysis ($0.05)
- 📈 **Trading Signals** - AI-powered buy/sell recommendations ($0.03)
- 🤖 **Code Generator** - Solana program snippets ($0.05)

## 💡 Why x402 + Solana?

Traditional crypto intelligence requires expensive monthly subscriptions ($50-500/month). Our platform uses:

- **x402 Protocol** - Pay only for what you use with micropayments
- **Solana** - Instant, cheap settlements enable real-time AI access
- **No Subscriptions** - Pay $0.02-0.10 per analysis, not $50/month

## 🏗️ Architecture

```
Frontend (Next.js)
    ↓
API Gateway (Express + x402)
    ↓
┌───────────┬───────────┬──────────┐
│  Payment  │  Service  │   Job    │
│  Service  │  Factory  │  Queue   │
└───────────┴───────────┴──────────┘
         ↓          ↓
    ┌────────┐  ┌────────┐
    │ OpenAI │  │ Helius │
    │  GPT-4 │  │Birdeye │
    └────────┘  └────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Redis (for job queue)
- OpenAI API key
- Helius API key

### Installation

```bash
# Clone repository
cd x402-solintel-gateway

# Install dependencies
pnpm install:all

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# Start Redis
redis-server

# Start services (in separate terminals)
pnpm dev:facilitator  # Terminal 1
pnpm dev:gateway      # Terminal 2
pnpm dev:dashboard    # Terminal 3
```

### Access

- Dashboard: http://localhost:3001
- Gateway API: http://localhost:4021
- Facilitator: http://localhost:3000

## 📚 Services

### 1. Quick Token Check ($0.02)
Fast risk assessment for any Solana token.

**Input**: Token address
**Output**: Risk score, holder stats, security flags, AI summary

### 2. Deep Token Analysis ($0.08)
Comprehensive due diligence report.

**Input**: Token address
**Output**: Full report with social sentiment, whale tracking, PDF export

### 3. Smart Contract Audit ($0.10)
Security analysis for Solana programs.

**Input**: Program ID
**Output**: Vulnerability scan, security score, recommendations

### 4. Wallet Intelligence ($0.05)
Analyze any wallet's trading performance.

**Input**: Wallet address
**Output**: PnL, win rate, portfolio breakdown, copy-trade signals

### 5. Trading Signals ($0.03)
AI-powered trading recommendations.

**Input**: Token address
**Output**: Buy/Sell signal, entry/exit points, risk assessment

### 6. Code Generator ($0.05)
Generate Solana program code.

**Input**: Description
**Output**: Anchor code, tests, deployment instructions

## 🔧 Tech Stack

**Backend**:
- Express.js - API server
- Bull - Job queue
- Redis - Queue storage
- @solana/web3.js - Blockchain interaction
- OpenAI SDK - AI analysis

**Frontend**:
- Next.js 15 - React framework
- Solana Wallet Adapter - Wallet integration
- TailwindCSS - Styling

**External APIs**:
- OpenAI GPT-4 - Intelligence layer
- Helius - Solana data
- Birdeye - DeFi metrics
- Rugcheck - Security scores

## 💰 Payment Flow

1. User selects service and inputs data
2. Gateway returns HTTP 402 with payment requirements
3. User signs USDC transaction with wallet
4. Facilitator verifies and settles on Solana
5. Gateway processes request via job queue
6. AI generates analysis
7. Results returned with on-chain receipt

## 🎬 Demo Video

[Coming soon - Link to demo video]

## 📄 License

MIT

## 🙏 Credits

Built for Solana x402 Hackathon 2024

---

**⚡ Pay-per-use AI intelligence. No subscriptions. Just Solana.**

