#!/bin/bash

# Test API Connectivity Script
# Tests all external APIs used by SolIntel Gateway

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================="
echo "Testing API Connectivity"
echo "=================================="
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Test token address (USDC)
TOKEN="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"

echo "Test Token: USDC ($TOKEN)"
echo ""

# Test 1: Helius API
echo "1. Testing Helius API..."
if [ -z "$HELIUS_API_KEY" ]; then
    echo -e "${RED}❌ HELIUS_API_KEY not set in .env${NC}"
else
    RESPONSE=$(curl -s -X POST "https://mainnet.helius-rpc.com/?api-key=$HELIUS_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"jsonrpc\":\"2.0\",\"id\":\"test\",\"method\":\"getAsset\",\"params\":{\"id\":\"$TOKEN\"}}" \
        -w "\n%{http_code}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ]; then
        if echo "$BODY" | grep -q "result"; then
            echo -e "${GREEN}✓ Helius API working${NC}"
            echo "  Response: $(echo $BODY | jq -r '.result.content.metadata.name // "Data retrieved"' 2>/dev/null || echo "Success")"
        else
            echo -e "${YELLOW}⚠ Helius API responded but data format unexpected${NC}"
            echo "  Response: $BODY" | head -c 200
        fi
    else
        echo -e "${RED}❌ Helius API failed (HTTP $HTTP_CODE)${NC}"
        echo "  Response: $BODY" | head -c 200
    fi
fi
echo ""

# Test 2: Birdeye API
echo "2. Testing Birdeye API..."
if [ -z "$BIRDEYE_API_KEY" ]; then
    echo -e "${RED}❌ BIRDEYE_API_KEY not set in .env${NC}"
else
    RESPONSE=$(curl -s "https://public-api.birdeye.so/defi/price?address=$TOKEN" \
        -H "X-API-KEY: $BIRDEYE_API_KEY" \
        -H "x-chain: solana" \
        -w "\n%{http_code}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ]; then
        if echo "$BODY" | grep -q "data"; then
            echo -e "${GREEN}✓ Birdeye API working${NC}"
            PRICE=$(echo $BODY | jq -r '.data.value // "N/A"' 2>/dev/null || echo "N/A")
            echo "  Price: \$$PRICE"
        else
            echo -e "${YELLOW}⚠ Birdeye API responded but data format unexpected${NC}"
            echo "  Response: $BODY" | head -c 200
        fi
    else
        echo -e "${RED}❌ Birdeye API failed (HTTP $HTTP_CODE)${NC}"
        echo "  Response: $BODY" | head -c 200
        if [ "$HTTP_CODE" -eq 403 ]; then
            echo -e "${YELLOW}  Tip: Check if your API key is valid at https://birdeye.so/${NC}"
        fi
    fi
fi
echo ""

# Test 3: Rugcheck API
echo "3. Testing Rugcheck API (no key required)..."
RESPONSE=$(curl -s "https://api.rugcheck.xyz/v1/tokens/$TOKEN/report" \
    -H "Accept: application/json" \
    -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Rugcheck API working${NC}"
    RISKS=$(echo $BODY | jq -r '.risks | length // 0' 2>/dev/null || echo "0")
    echo "  Risks found: $RISKS"
else
    echo -e "${YELLOW}⚠ Rugcheck API unavailable (HTTP $HTTP_CODE)${NC}"
    echo "  This is OK - service will use fallback values"
fi
echo ""

# Test 4: Anthropic API
echo "4. Testing Anthropic API..."
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${RED}❌ ANTHROPIC_API_KEY not set in .env${NC}"
else
    RESPONSE=$(curl -s https://api.anthropic.com/v1/messages \
        -H "x-api-key: $ANTHROPIC_API_KEY" \
        -H "anthropic-version: 2023-06-01" \
        -H "content-type: application/json" \
        -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}' \
        -w "\n%{http_code}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ]; then
        echo -e "${GREEN}✓ Anthropic API working${NC}"
        echo "  Model: claude-sonnet-4-5"
    else
        echo -e "${RED}❌ Anthropic API failed (HTTP $HTTP_CODE)${NC}"
        echo "  Response: $BODY" | head -c 200
    fi
fi
echo ""

# Test 5: Redis
echo "5. Testing Redis..."
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${RED}❌ Redis is not running${NC}"
    echo "  Start with: redis-server"
fi
echo ""

# Summary
echo "=================================="
echo "Summary"
echo "=================================="
echo ""
echo "If all tests passed, your service should work!"
echo ""
echo "Next steps:"
echo "1. Start services: pnpm dev:gateway"
echo "2. Test token check endpoint"
echo "3. Check DEBUG_GUIDE.md for troubleshooting"
echo ""
