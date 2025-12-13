# How to Use Wallet Intelligence

## Important: Wallet Address vs Token Mint Address

### ❌ WRONG - Token Mint Address
```
JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN
(This is the JUP token itself - NOT a wallet!)
```

**What is this?**
- This is a **token mint address** - it represents the JUP token contract
- It's like analyzing the US Dollar itself instead of someone's bank account
- The system will now detect this and show an error message

### ✅ CORRECT - User Wallet Address
```
9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
(This is an actual Solana wallet that holds and trades tokens)
```

**What is this?**
- This is a **user wallet address** - a person or bot who trades
- It's like analyzing someone's bank account to see their trading behavior
- This is what Wallet Intelligence is designed for

---

## How to Find Good Test Wallets

### Method 1: Use Solscan
1. Go to https://solscan.io
2. Look at recent swaps on Jupiter/Raydium
3. Click on any transaction
4. Copy the wallet address of the trader (not the token address!)

### Method 2: Known Active Wallets
Here are some example wallet addresses you can test:

**Active Trader Example:**
```
9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
```

**DeFi Protocol Wallets** (will show different patterns):
```
5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1  # Raydium
```

### Method 3: Your Own Wallet
If you have a Solana wallet with trading history:
1. Copy your wallet address from Phantom/Solflare
2. Paste it into Wallet Intelligence
3. See your own trading stats!

---

## What You'll See

### For Active Traders:
- ✅ Token holdings with real prices
- ✅ Trading history (swaps detected)
- ✅ Win/Loss ratio
- ✅ P&L estimation
- ✅ Portfolio diversification score
- ✅ Best/worst trades

### For HODLers (No Trading):
- ✅ Token holdings
- ✅ Portfolio value
- ❌ No trades (0 swaps)
- ℹ️ AI will identify as "holder" not "trader"

### For Protocol/Infrastructure Wallets:
- ⚠️ May show pure SOL, no tokens
- ⚠️ High transaction count but no swaps
- ℹ️ AI will identify as "operational wallet"

---

## Common Errors Explained

### "This appears to be a token mint address"
**Problem:** You entered a token address instead of a wallet
**Solution:** Find a wallet that **holds** that token instead

**Example:**
- ❌ JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN (JUP token mint)
- ✅ 9WzDXwBbmkg... (a wallet that holds JUP tokens)

### "Token Count: 0"
**Possible reasons:**
1. The wallet only holds SOL (no SPL tokens)
2. The wallet's tokens have no value (dust filtered out)
3. It's a brand new wallet

**Not necessarily an error** - some wallets are SOL-only!

### "Total Trades: 0"
**Possible reasons:**
1. The wallet is a holder (no swaps)
2. The wallet only does transfers, not trades
3. Transactions are too old (only last 100 checked)

**Not necessarily an error** - not all wallets trade!

---

## Quick Differentiation Guide

### Token Mint vs Wallet Address

**How to tell them apart:**

1. **Check on Solscan**
   - Token Mint: Shows "Token" badge, supply, holders
   - Wallet: Shows balance, transactions, tokens held

2. **Try Token Check first**
   - If Token Check works → it's a token mint
   - If Token Check fails → might be a wallet

3. **Length is NOT a reliable indicator**
   - Both are 32-44 characters
   - Both look similar!

---

## Testing Checklist

✅ Use actual user wallet addresses
✅ Wallets with trading history work best
✅ Check Solscan to verify it's a wallet
✅ Read the error messages - they explain what went wrong
✅ Try multiple wallets to see different patterns

❌ Don't use token mint addresses
❌ Don't expect trades from holder wallets
❌ Don't analyze protocol-owned addresses expecting trader behavior

---

## Demo Tips

**For impressive demos, use wallets that:**
1. Have token holdings (shows portfolio analysis)
2. Have trading history (shows P&L tracking)
3. Are active (shows real-time intelligence)

**To find these:**
- Monitor recent Jupiter swaps on Solscan
- Copy addresses of active traders
- Test multiple wallets to show variety

**Bad demo wallets:**
- Token mint addresses (will error)
- Brand new wallets (no data)
- Protocol addresses (confusing results)
- Pure SOL holders (limited insights)

---

## Expected Results

### Healthy Active Trader Wallet:
```
✅ Wallet Age: 100+ days
✅ Token Count: 5-20 tokens
✅ Total Trades: 50+ swaps
✅ Win Rate: 40-60%
✅ Portfolio Value: $1000+
✅ Diversification: 6-8/10
```

### Holder Wallet:
```
✅ Wallet Age: Any
✅ Token Count: 1-10 tokens
❌ Total Trades: 0
✅ Portfolio Value: Any
⚠️ Diversification: Varies
```

### Protocol/Bot Wallet:
```
⚠️ High transaction count
⚠️ 0 or very few tokens
⚠️ 0 trades
⚠️ AI identifies as operational
```

---

## Still Confused?

**Quick Test:**
1. Go to Solscan.io
2. Search "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"
3. Notice it says "Token" at the top
4. Click "Holders" tab
5. Copy ANY wallet address from the holders list
6. Use THAT address in Wallet Intelligence

That's the difference! 🎯
