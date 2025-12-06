#!/bin/bash

echo "🚀 Starting x402-SolIntel-Gateway with Claude (Anthropic)"
echo "=========================================================="
echo ""

# Navigate to project root
cd /Users/franciscodex/x402-SolIntel-Gateway

# Check configuration
echo "📋 Checking configuration..."
if grep -q "^AI_PROVIDER=anthropic" .env; then
    echo "✅ AI Provider: Anthropic (Claude)"
else
    echo "❌ AI_PROVIDER not set to anthropic"
    echo "   Fixing..."
    sed -i.backup '/^AI_PROVIDER=/d' .env
    echo "AI_PROVIDER=anthropic" >> .env
    echo "✅ Fixed!"
fi

if grep -q "^ANTHROPIC_API_KEY=sk-ant-" .env; then
    echo "✅ Anthropic API key configured"
else
    echo "❌ Anthropic API key not found"
    echo "   Please add: ANTHROPIC_API_KEY=sk-ant-your-key"
    exit 1
fi

echo ""
echo "🔧 Building gateway..."
pnpm --filter gateway build

echo ""
echo "🎯 Starting services..."
echo ""
echo "Open these in separate terminals:"
echo ""
echo "Terminal 1 (Facilitator):"
echo "  pnpm dev:facilitator"
echo ""
echo "Terminal 2 (Gateway - Claude):"
echo "  pnpm dev:gateway"
echo ""
echo "Terminal 3 (Dashboard):"
echo "  pnpm dev:dashboard"
echo ""
echo "You should see: [AI] Using Claude (Anthropic)"
echo ""
echo "Then test with:"
echo "  curl -X POST http://localhost:4021/api/token-check \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -d '{\"tokenAddress\": \"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v\"}'"
echo ""
echo "Ready to start? Run: pnpm dev:gateway"
