#!/bin/bash

# Cloudflare Pages Build Script for Monorepo
# This script handles building the Next.js dashboard in a pnpm workspace

set -e  # Exit on error

echo "🚀 Starting Cloudflare Pages build..."

# Cloudflare Pages already installs dependencies, so we skip that step
# Build shared types package first (dashboard depends on it)
echo "🔨 Building shared types..."
pnpm --filter @x402-solintel/types build

# Build the dashboard
echo "🔨 Building dashboard..."
pnpm --filter dashboard build

echo "✅ Build complete!"
