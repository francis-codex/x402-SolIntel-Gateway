# SolIntel Gateway

**AI-Powered Solana Intelligence with Pay-Per-Use Pricing**

SolIntel Gateway is a production-ready platform that demonstrates how x402 micropayments unlock new business models in crypto. Instead of forcing users into expensive monthly subscriptions, we charge $0.02-0.10 per analysis using USDC on Solana.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solana](https://img.shields.io/badge/Solana-Mainnet-14F195)](https://solana.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6)](https://www.typescriptlang.org/)

---

## Table of Contents

- [Overview](#overview)
- [The Problem](#the-problem)
- [Our Solution](#our-solution)
- [Quick Start](#quick-start)
- [Services & Pricing](#services--pricing)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Payment Flow](#payment-flow)
- [API Reference](#api-reference)
- [Development](#development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Overview

Traditional crypto intelligence platforms lock users into $50-500/month subscriptions. If you only need to analyze a few tokens per month, you're effectively paying $10-50 per query. This pricing model exists because micropayments haven't been economically viable—credit card fees make it unprofitable to charge $0.02, and Ethereum gas fees cost more than the service itself.

**SolIntel Gateway solves this** by combining three technologies:

1. **x402 Protocol** - HTTP 402 Payment Required standard for micropayments
2. **Solana Blockchain** - Sub-second finality with $0.00001 transaction fees
3. **Anthropic Claude** - State-of-the-art AI without subscription overhead

The result is a platform where users pay only for what they use, with 90-98% cost savings compared to traditional subscription models.

Built for the Solana x402 Hackathon 2024.

---

## The Problem

### Three Market Failures

**1. The Subscription Trap**

Most crypto analysis platforms force upfront monthly payments regardless of usage. A user making 5 queries per month on a $50 subscription is paying $10 per query. This creates two problems:
- Users overpay for underutilized services
- High barriers prevent casual users from accessing premium tools

**2. Micropayments Don't Work (Yet)**

Traditional payment rails can't profitably process micro-transactions:
- Credit cards charge 2.9% + $0.30 per transaction
- PayPal and Stripe have similar fee structures
- Ethereum gas fees range from $1-15
- Bitcoin fees and confirmation times are prohibitive

**3. Real-Time Settlement Required**

AI services have variable costs (OpenAI charges per token) and need instant payment verification to prevent abuse. Traditional payment methods take 2-3 days to settle, breaking the real-time API experience.

**The Gap:** No way to profitably charge $0.02-0.10 for individual AI queries... until x402 + Solana.

---

## Our Solution

### How x402 Enables Micropayments

SolIntel Gateway demonstrates that x402 makes previously impossible business models viable:

**Economic Viability**
- Solana transaction fee: ~$0.00001 (0.05% of a $0.02 payment)
- Payment verification: <500ms overhead
- Revenue retention: 99.95% after fees

**Abuse Prevention**
- HTTP 402 enforces payment BEFORE processing
- Cryptographic signatures prevent replay attacks
- On-chain settlement provides immutable receipts

**User Experience**
- No signup or account creation required
- One-click wallet approval
- Total flow: Request → Payment → Results in ~3 seconds

### What We've Built

Six AI intelligence services powered by Anthropic Claude and real-time blockchain data:

| Service | Price | Purpose |
|---------|-------|---------|
| Quick Token Check | $0.02 | Risk scoring and security analysis |
| Trading Signals | $0.03 | AI-powered buy/sell recommendations |
| Wallet Intelligence | $0.05 | Trading performance analysis |
| Code Generator | $0.05 | Solana program code generation |
| Deep Token Analysis | $0.08 | Comprehensive due diligence reports |
| Smart Contract Audit | $0.10 | Security vulnerability detection |

---

## Quick Start

Get the platform running locally in under 5 minutes.

### Prerequisites

- Node.js 20 or higher
- pnpm 8 or higher
- Redis server
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/x402-solintel-gateway.git
cd x402-solintel-gateway

# Install all dependencies using pnpm workspaces
pnpm install:all

# Copy and configure environment variables
cp .env.example .env
```

### Configuration

Edit `.env` with your API keys:

```bash
# Required: Anthropic API key from https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Required: Helius API key from https://www.helius.dev/
HELIUS_API_KEY=your-helius-key-here

# Required: Birdeye API key from https://birdeye.so/
BIRDEYE_API_KEY=your-birdeye-key-here

# Required: Your Solana wallet address for receiving payments
RECIPIENT_WALLET=YourSolanaWalletAddressHere
```

### Start Services

You'll need three terminal windows:

```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start payment facilitator
pnpm dev:facilitator

# Terminal 3: Start API gateway
pnpm dev:gateway

# Terminal 4: Start frontend dashboard
pnpm dev:dashboard
```

### Access Points

- **Dashboard:** http://localhost:3001
- **Gateway API:** http://localhost:4021
- **Facilitator:** http://localhost:3000

Connect your Phantom or Solflare wallet and try a Quick Token Check.

---

## Services & Pricing

All payments are in USDC on Solana mainnet.

### Quick Token Check ($0.02)

Fast risk assessment for any Solana token. Returns risk score, top holder distribution, security flags, liquidity analysis, and AI-generated summary.

**Use case:** Quick screening before investing

### Trading Signals ($0.03)

AI-powered trading recommendations including buy/sell/hold signal, entry points, take profit targets, stop loss suggestions, and reasoning.

**Use case:** Quick trading decisions

### Wallet Intelligence ($0.05)

Analyze any wallet's trading performance. Returns total PnL, win rate, top holdings, trading history, and copy-trade signals.

**Use case:** Following successful traders

### Code Generator ($0.05)

Generate Solana program code with Anchor framework, full implementation, test suite, and deployment instructions.

**Use case:** Rapid prototyping and learning

### Deep Token Analysis ($0.08)

Comprehensive due diligence including everything from Quick Check plus historical price analysis, whale tracking, social sentiment, trading volume trends, and PDF export.

**Use case:** Thorough research before major investments

### Smart Contract Audit ($0.10)

Security analysis for Solana programs. Returns vulnerability scan, security score, common attack vectors, best practices, and detailed report.

**Use case:** Before deploying or interacting with smart contracts

---

## Architecture

### System Design

```
Frontend (Next.js 15)
    |
    v
API Gateway (Express + x402)
    |
    +-- x402 Payment Middleware
    |       |
    |       +-- Returns HTTP 402 if no payment
    |       +-- Verifies signed transactions
    |       +-- Enforces payment before AI processing
    |
    +-- Payment Service --> Facilitator --> Solana Blockchain
    |                                           |
    |                                           +-- USDC Transfer
    |                                           +-- <500ms settlement
    |                                           +-- $0.00001 fee
    |
    +-- Service Factory --> Job Queue (Bull + Redis)
                                |
                                v
                          AI Processing
                                |
                                +-- Anthropic Claude
                                +-- Helius API
                                +-- Birdeye API
                                +-- Rugcheck API
```

### Key Components

**Frontend**
- Next.js 15 with App Router
- Solana Wallet Adapter for Phantom/Solflare integration
- Real-time payment flow handling
- TypeScript for type safety

**API Gateway**
- Express server with x402 middleware
- Bull job queue for async AI processing
- Redis for queue management
- Comprehensive error handling

**Payment Facilitator**
- Transaction verification service
- Solana RPC interaction
- USDC payment settlement
- Receipt generation

**External Integrations**
- Anthropic Claude for AI analysis
- Helius for Solana blockchain data
- Birdeye for DeFi market data
- Rugcheck for security scoring

---

## Tech Stack

### Backend

| Package | Version | Purpose |
|---------|---------|---------|
| Express | 4.21 | API server framework |
| TypeScript | 5.6 | Static typing and safety |
| Bull | 4.12 | Job queue management |
| Redis | Latest | Queue storage and caching |
| @solana/web3.js | 1.95 | Blockchain interaction |
| @anthropic-ai/sdk | 0.71 | Claude AI integration |

### Frontend

| Package | Version | Purpose |
|---------|---------|---------|
| Next.js | 15.5 | React framework |
| React | 19.0 | UI components |
| TypeScript | 5.6 | Type safety |
| TailwindCSS | 3.4 | Styling |
| Solana Wallet Adapter | 0.15 | Wallet integration |

### Infrastructure

- **Monorepo:** pnpm workspaces
- **Build:** TypeScript compiler
- **Deployment:** Vercel (frontend), self-hosted (backend)
- **Version Control:** Git

---

## Payment Flow

Understanding how x402 micropayments work:

### Step-by-Step Process

**1. Initial Request (No Payment)**

User makes API request without payment header:

```http
POST /api/token-check
Content-Type: application/json

{
  "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
}
```

**2. Gateway Returns HTTP 402**

Server responds with payment requirements:

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "error": "Payment Required",
  "message": "This service requires payment: $0.020 USDC",
  "payment": {
    "recipient": "GatewayWalletAddress",
    "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount": 20000,
    "currency": "USDC",
    "invoiceId": "550e8400-e29b-41d4-a716-446655440000",
    "timeout": 60
  }
}
```

**3. User Signs Transaction**

Frontend creates and signs USDC transfer with wallet:

```typescript
const transaction = new Transaction().add(
  createTransferInstruction(
    userTokenAccount,
    gatewayTokenAccount,
    userWallet.publicKey,
    20000  // 0.02 USDC in lamports
  )
);

const signedTx = await wallet.signTransaction(transaction);
```

**4. Retry with Payment Proof**

Frontend retries request with signed transaction:

```http
POST /api/token-check
Content-Type: application/json
X-Payment: eyJpbnZvaWNlSWQiOi4uLiwidHJhbnNhY3Rpb24iOi4uLn0=

{
  "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
}
```

**5. Payment Verification**

Gateway forwards to facilitator for verification:
- Decode base64 transaction
- Verify cryptographic signature
- Validate amount matches requirement
- Validate recipient address
- Submit to Solana RPC
- Wait for confirmation (~400ms)
- Return transaction signature

**6. Process Request**

After payment verification:
- Create payment receipt
- Add job to processing queue
- Fetch data from external APIs
- Generate AI analysis with Claude
- Return results with receipt

**7. Return Results**

```http
HTTP/1.1 200 OK
X-Payment-Response: {"signature":"5kD...","amount":0.02}
Content-Type: application/json

{
  "analysis": {
    "riskScore": 45,
    "holders": 15234,
    "aiSummary": "..."
  },
  "receipt": {
    "txSignature": "5kD...",
    "timestamp": 1702831200000,
    "amount": 0.02
  }
}
```

### Security Features

- Payment required before any AI resources consumed
- Cryptographic signatures prevent tampering
- Amount validation ensures correct payment
- On-chain settlement provides immutable proof
- Invoice IDs link payments to specific requests

---

## API Reference

### Base URL

```
Development: http://localhost:4021
Production: https://your-domain.com
```

### Authentication

All paid endpoints require payment via `X-Payment` header containing base64-encoded payment payload.

### Endpoints

#### POST /api/token-check

Quick token risk assessment.

**Request:**
```json
{
  "address": "TokenMintAddress"
}
```

**Response:**
```json
{
  "analysis": {
    "riskScore": 45,
    "holders": 15234,
    "topHolders": [...],
    "securityFlags": {
      "mintAuthority": false,
      "freezeAuthority": false
    },
    "liquidity": {
      "usd": 1250000
    },
    "aiSummary": "..."
  },
  "receipt": {
    "txSignature": "...",
    "amount": 0.02,
    "timestamp": 1702831200000
  }
}
```

#### POST /api/wallet-intel

Analyze wallet trading performance.

**Request:**
```json
{
  "address": "WalletAddress"
}
```

#### POST /api/trading-signals

Get AI trading recommendations.

**Request:**
```json
{
  "tokenAddress": "TokenMintAddress"
}
```

#### POST /api/contract-audit

Security analysis for smart contracts.

**Request:**
```json
{
  "programId": "ProgramAddress"
}
```

#### POST /api/deep-analysis

Comprehensive token analysis.

**Request:**
```json
{
  "tokenAddress": "TokenMintAddress"
}
```

#### POST /api/code-generator

Generate Solana program code.

**Request:**
```json
{
  "description": "Create a token staking program",
  "type": "anchor"
}
```

### Utility Endpoints

- `GET /health` - Health check
- `GET /api/jobs/:jobId` - Job status
- `GET /receipts` - Payment history
- `GET /stats` - Platform statistics

---

## Development

### Project Structure

```
x402-solintel-gateway/
├── backend/
│   ├── gateway/                 # Main API server
│   │   ├── src/
│   │   │   ├── config.ts       # Configuration
│   │   │   ├── index.ts        # Entry point
│   │   │   ├── integrations/   # External API clients
│   │   │   ├── middleware/     # x402 enforcement
│   │   │   ├── queue/          # Bull worker
│   │   │   ├── routes/         # API routes
│   │   │   ├── services/       # Business logic
│   │   │   └── utils/          # Helpers
│   │   └── package.json
│   └── facilitator/            # Payment settlement
│       └── src/
│           └── index.ts
├── frontend/
│   └── dashboard/              # Next.js app
│       ├── app/                # Pages
│       ├── components/         # React components
│       └── lib/                # Utilities
├── shared/
│   └── types/                  # Shared TypeScript types
├── .env.example
├── package.json
└── pnpm-workspace.yaml
```

### Development Commands

```bash
# Install dependencies
pnpm install:all

# Build all projects
pnpm build:all

# Build specific workspace
pnpm --filter gateway build

# Clean build artifacts
pnpm clean

# Type checking
pnpm -r tsc --noEmit
```

### Adding New Services

1. Create service file in `backend/gateway/src/services/`
2. Define types in `shared/types/src/index.ts`
3. Add route in `backend/gateway/src/routes/`
4. Update pricing in `backend/gateway/src/config.ts`
5. Create frontend page in `frontend/dashboard/app/`

### Testing APIs

```bash
# Test all external API connections
./test-apis.sh
```

---

## Deployment

### Frontend (Vercel)

1. Push repository to GitHub
2. Import to Vercel
3. Set root directory: `frontend/dashboard`
4. Configure environment variables:
   ```
   NEXT_PUBLIC_GATEWAY_URL=https://api.your-domain.com
   NEXT_PUBLIC_SOLANA_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
   ```
5. Deploy (automatic on push to main)

### Backend (Docker)

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/gateway ./backend/gateway
COPY shared/types ./shared/types

RUN pnpm install --frozen-lockfile
RUN pnpm --filter gateway build

CMD ["pnpm", "--filter", "gateway", "start"]
```

Build and run:

```bash
docker build -t solintel-gateway .
docker run -p 4021:4021 --env-file .env solintel-gateway
```

### Backend (VPS)

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Clone and build
git clone https://github.com/yourusername/x402-solintel-gateway.git
cd x402-solintel-gateway
pnpm install:all
pnpm build:all

# Install PM2
npm install -g pm2

# Start services
pm2 start pnpm --name "gateway" -- --filter gateway start
pm2 start pnpm --name "facilitator" -- --filter facilitator start

# Auto-restart on boot
pm2 startup
pm2 save
```

### Redis Setup

**Option 1: Redis Cloud (Free Tier)**

1. Sign up at redis.com/cloud
2. Create database
3. Copy connection URL
4. Set `REDIS_URL` in environment

**Option 2: Self-Hosted**

```bash
# Install Redis
sudo apt-get install redis-server

# Start service
sudo systemctl start redis
sudo systemctl enable redis

# Verify
redis-cli ping  # Should return "PONG"
```

---

## Troubleshooting

### Common Issues

**"ANTHROPIC_API_KEY not set"**

Missing or invalid API key. Get one from https://console.anthropic.com/ and add to `.env`:

```bash
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

**"Connection refused on port 6379"**

Redis not running. Start it:

```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis

# Verify
redis-cli ping
```

**"HTTP 402 but payment not processing"**

- Ensure wallet is connected (Phantom/Solflare)
- Check USDC balance (need at least $0.10)
- Verify network is Solana Mainnet
- Check browser console for errors

**"Module not found" errors**

Dependencies not installed. Clean install:

```bash
rm -rf node_modules
pnpm install:all
```

**CORS errors**

Update allowed origins in `backend/gateway/src/index.ts`:

```typescript
app.use(cors({
  origin: ['http://localhost:3001', 'https://your-domain.com'],
  credentials: true,
}));
```

**TypeScript build errors**

Clean build artifacts and rebuild:

```bash
pnpm clean
pnpm build:all
```

---

## Roadmap

### Phase 1: MVP (Completed)
- Core x402 payment integration
- Six AI intelligence services
- Frontend dashboard
- Solana mainnet deployment
- Claude AI integration

### Phase 2: Public Beta (Q1 2025)
- User analytics dashboard
- API rate limiting
- Enhanced error messages
- Mobile-responsive improvements
- Historical data access

### Phase 3: Advanced Features (Q2 2025)
- Developer API keys
- Bulk pricing discounts
- Custom alerts and notifications
- Team collaboration features
- Portfolio tracking

### Phase 4: Scale (Q3-Q4 2025)
- White-label licensing
- Multi-chain support
- Mobile applications
- Advanced analytics

---

## Contributing

Contributions welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/improvement`)
3. Make your changes
4. Commit with descriptive message (`git commit -m "feat: add improvement"`)
5. Push to branch (`git push origin feature/improvement`)
6. Open a Pull Request

### Commit Convention

We use Conventional Commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

### Code Style

- Use TypeScript strict mode
- Follow existing code patterns
- Add comments for complex logic
- Write descriptive variable names

---

## License

MIT License

Copyright (c) 2024 SolIntel Gateway

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## Acknowledgments

Built for **Solana x402 Hackathon 2024**

Powered by:
- Solana - High-performance blockchain
- x402 Protocol - HTTP 402 micropayments standard
- Anthropic - Claude AI
- Helius - Solana infrastructure
- Birdeye - DeFi data

---

**Pay-per-use AI intelligence. No subscriptions. Just Solana.**
