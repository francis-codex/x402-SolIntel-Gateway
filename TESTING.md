# 🧪 Quick Testing Guide - x402-SolIntel-Gateway

## What You Need Before Testing

### 1. Get API Keys (5 minutes)

**OpenAI** (Required):
- Go to https://platform.openai.com
- Sign up / Log in
- Click "API Keys" → "Create new secret key"
- Copy the key (starts with `sk-...`)

**Helius** (Required):
- Go to https://helius.dev
- Sign up (free tier is fine)
- Create API key
- Copy it

**Birdeye** (Required):
- Go to https://birdeye.so
- Sign up
- Get API key from dashboard
- Copy it

### 2. Add Keys to .env File

```bash
cd ~/x402-solintel-gateway

# Open .env file and replace:
OPENAI_API_KEY=sk-your-actual-key-here
HELIUS_API_KEY=your-helius-key-here
BIRDEYE_API_KEY=your-birdeye-key-here
RECIPIENT_WALLET=your-solana-wallet-address
```

### 3. Install Redis

```bash
# On Mac:
brew install redis

# On Linux:
sudo apt-get install redis-server
```

### 4. Have USDC in Wallet
- Get ~$0.10 USDC in your Phantom/Solflare wallet
- For testing the payment flow

---

## 🚀 How to Test (Simple 4-Step Process)

### Open 4 Terminal Windows

**Terminal 1 - Start Redis:**
```bash
redis-server
# Keep this running, you'll see: "Ready to accept connections"
```

**Terminal 2 - Start Facilitator:**
```bash
cd ~/x402-solintel-gateway
pnpm --filter facilitator dev
# Wait for: "Ready to facilitate payments!"
```

**Terminal 3 - Start Gateway:**
```bash
cd ~/x402-solintel-gateway
pnpm --filter gateway dev
# Wait for: "Ready to serve AI intelligence!"
```

**Terminal 4 - Start Frontend:**
```bash
cd ~/x402-solintel-gateway
pnpm --filter dashboard dev
# Wait for: "Ready in ... ms"
# Then open: http://localhost:3001
```

---

## 🎯 Testing the Token Check Service

1. **Open Browser**: http://localhost:3001

2. **Connect Wallet**:
   - Click "Connect Wallet" in top right
   - Select Phantom or Solflare
   - Approve connection

3. **Click "Try Now"** on the Token Check card

4. **Enter a Token Address** (try BONK):
   ```
   DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
   ```

5. **Click "Analyze Token"**
   - You'll see: "Payment Required: $0.020 USDC"

6. **Click "Pay & Analyze"**
   - Approve the transaction in your wallet
   - Wait 5-10 seconds

7. **See Results!**
   - Risk Score (0-10)
   - Security Flags
   - AI-powered insights
   - Token stats

---

## ✅ Success Checklist

You'll know it's working when you see:

- [ ] All 4 terminals show "Ready" messages
- [ ] Browser opens without errors
- [ ] Wallet connects successfully
- [ ] Token address is accepted
- [ ] Payment modal appears
- [ ] Wallet prompts for approval
- [ ] "AI is analyzing..." shows up
- [ ] Results appear with risk score & insights

---

## 🐛 Common Issues

**"Redis connection refused"**
→ Make sure `redis-server` is running in Terminal 1

**"OPENAI_API_KEY not set"**
→ Check your `.env` file has the correct API key

**"Insufficient funds"**
→ Add USDC to your wallet (need ~$0.10)

**"Token not found"**
→ Try a different, more popular token (BONK, JUP, etc.)

**"Payment verification failed"**
→ Make sure RECIPIENT_WALLET is set in `.env`

---

## 🎬 What You Should See

### Terminal Outputs:

**Facilitator:**
```
Ready to facilitate payments!
Server running at: http://0.0.0.0:3000
```

**Gateway:**
```
Ready to serve AI intelligence!
Server running at: http://0.0.0.0:4021
```

**Frontend:**
```
Ready in 2.3s
Local: http://localhost:3001
```

### Browser:
- Landing page with "x402-SolIntel-Gateway" header
- "Quick Token Check" service card
- Clean UI with wallet connect button

---

## 🔍 Verify Payment On-Chain

After payment, check on Solscan:
1. Copy the transaction signature from the result
2. Go to https://solscan.io
3. Paste signature
4. See your USDC transfer!

---

## Need Help?

Check all 4 terminals for error messages - they'll tell you what's wrong!
