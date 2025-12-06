# 🚀 Setup & Testing Guide

## ✅ What We've Built

### Backend (Fully Complete!)
- ✅ **Facilitator Service** - Payment verification & settlement
- ✅ **Gateway Service** - x402 enforcement + AI services
- ✅ **Token Check Service** - First AI service (working!)
- ✅ **API Integrations** - Helius, Birdeye, OpenAI, RugCheck
- ✅ **Job Queue System** - Bull + Redis for async processing

### Frontend (Complete!)
- ✅ **Next.js Dashboard** - Modern UI with TailwindCSS
- ✅ **Wallet Integration** - Phantom, Solflare support
- ✅ **Token Check Page** - Full payment flow + results display

---

## 🔧 Prerequisites

Before testing, you need:

1. **Redis** - For job queue
   ```bash
   brew install redis
   redis-server
   ```

2. **API Keys** - Edit `.env` file:
   - `OPENAI_API_KEY` - Get from platform.openai.com
   - `HELIUS_API_KEY` - Get from helius.dev
   - `BIRDEYE_API_KEY` - Get from birdeye.so
   - `RECIPIENT_WALLET` - Your Solana wallet address

3. **USDC in Wallet** - For testing payments (mainnet)

---

## 🎯 Testing Instructions

### Step 1: Start Redis
```bash
# Terminal 1
redis-server
```

### Step 2: Start Facilitator
```bash
# Terminal 2
cd ~/x402-solintel-gateway
pnpm --filter facilitator dev
```

### Step 3: Start Gateway
```bash
# Terminal 3
cd ~/x402-solintel-gateway
pnpm --filter gateway dev
```

### Step 4: Start Frontend
```bash
# Terminal 4
cd ~/x402-solintel-gateway
pnpm --filter dashboard dev
```

### Step 5: Open Browser
```
http://localhost:3001
```

---

## 🧪 Test the Token Check Service

1. **Open** http://localhost:3001
2. **Click** "Try Now" on Token Check card
3. **Connect** your Phantom/Solflare wallet
4. **Enter** a Solana token address (try a popular one):
   - BONK: `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263`
   - JUP: `JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN`

5. **Click** "Analyze Token" → Will show payment requirement
6. **Click** "Pay & Analyze" → Approve in wallet
7. **Wait** ~10-15 seconds → See AI analysis results!

---

## 📊 What To Expect

### If Everything Works:
- ✅ Token address accepted
- ✅ Payment modal shows ($0.020 USDC)
- ✅ Wallet prompts for approval
- ✅ "AI is analyzing..." message
- ✅ Results appear with:
  - Risk score (0-10)
  - Security flags
  - Quick stats
  - AI-generated insights

### Common Issues:

**"Redis connection failed"**
- Make sure Redis is running: `redis-server`

**"OPENAI_API_KEY not set"**
- Add your OpenAI API key to `.env`

**"Payment verification failed"**
- Ensure you have USDC in your wallet
- Check that `RECIPIENT_WALLET` is set in `.env`

**"Token not found"**
- Try a different, more popular token
- Helius API might be rate-limited (wait a bit)

---

## 🎉 Success Criteria

You've successfully tested when you see:
1. ✅ Frontend loads without errors
2. ✅ Wallet connects successfully
3. ✅ Payment goes through (check Solscan)
4. ✅ AI analysis appears with risk score & insights

---

## 🔮 Next Steps (Phase 4)

Once Token Check works, add these services:
- 📊 Deep Analysis ($0.08)
- 🛡️ Contract Audit ($0.10)
- 👤 Wallet Intelligence ($0.05)
- 📈 Trading Signals ($0.03)
- 🤖 Code Generator ($0.05)

Each service follows the same pattern as Token Check!

---

## 💡 Tips

- **Start small**: Test with cheap tokens first
- **Check logs**: Watch terminal outputs for errors
- **Solscan**: Verify payments at solscan.io
- **API limits**: Free tiers have rate limits
- **Network**: Currently using mainnet (costs real USDC!)

---

## 📝 Environment Variables Checklist

Required for full functionality:
- [ ] OPENAI_API_KEY
- [ ] HELIUS_API_KEY
- [ ] BIRDEYE_API_KEY
- [ ] RECIPIENT_WALLET
- [ ] REDIS_URL (default works)

Good to have:
- [ ] RUGCHECK_API_KEY
- [ ] PINATA_API_KEY (for IPFS)
