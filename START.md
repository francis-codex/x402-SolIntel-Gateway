# 🚀 Manual Startup Instructions

All background tasks killed. Start services manually in separate terminals:

## Terminal 1: Redis
```bash
redis-server
```

## Terminal 2: Facilitator
```bash
cd ~/x402-solintel-gateway
pnpm --filter facilitator dev
```

## Terminal 3: Gateway
```bash
cd ~/x402-solintel-gateway
pnpm --filter gateway dev
```

## Terminal 4: Frontend
```bash
cd ~/x402-solintel-gateway
pnpm --filter dashboard dev
```

## Then:
1. Open browser: http://localhost:3001
2. **Clear all cache** (Cmd+Shift+Delete or Ctrl+Shift+Delete)
3. **Hard refresh** (Cmd+Shift+R or Ctrl+Shift+R)
4. Check console - should now show: `🔗 Solana RPC URL: https://mainnet.helius-rpc.com/...`

## Expected Result:
✅ No more 403 errors!
✅ Helius RPC working
✅ Ready to test payment flow
