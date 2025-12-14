'use client';

import Link from 'next/link';
import { WalletButton } from './components/WalletButton';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              🤖 SolIntel Gateway
            </h1>
            <p className="text-sm text-gray-500">Pay-per-use Solana intelligence with x402</p>
          </div>
          <WalletButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-4">
            AI-Powered Crypto Intelligence
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get instant AI analysis of Solana tokens, wallets, and contracts.
            Pay only for what you use with USDC micropayments.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {/* Token Check */}
          <Link href="/token-check" className="block">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow h-full">
              <div className="text-4xl mb-3">🔍</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Quick Token Check</h3>
              <p className="text-gray-600 text-sm mb-4">Instant risk scoring and security analysis</p>
              <div className="text-2xl font-bold text-purple-600">$0.02</div>
              <div className="text-xs text-gray-500">per analysis</div>
            </div>
          </Link>

          {/* Deep Analysis */}
          <Link href="/deep-analysis" className="block">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow h-full">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Deep Token Analysis</h3>
              <p className="text-gray-600 text-sm mb-4">Full due diligence with social sentiment</p>
              <div className="text-2xl font-bold text-purple-600">$0.08</div>
              <div className="text-xs text-gray-500">per report</div>
            </div>
          </Link>

          {/* Contract Audit */}
          <Link href="/contract-audit" className="block">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow h-full">
              <div className="text-4xl mb-3">🛡️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Smart Contract Audit</h3>
              <p className="text-gray-600 text-sm mb-4">Security vulnerability detection</p>
              <div className="text-2xl font-bold text-purple-600">$0.10</div>
              <div className="text-xs text-gray-500">per audit</div>
            </div>
          </Link>

          {/* Wallet Intelligence */}
          <Link href="/wallet-intelligence" className="block">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow h-full">
              <div className="text-4xl mb-3">👤</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Wallet Intelligence</h3>
              <p className="text-gray-600 text-sm mb-4">Trading pattern analysis & PnL tracking</p>
              <div className="text-2xl font-bold text-purple-600">$0.05</div>
              <div className="text-xs text-gray-500">per analysis</div>
            </div>
          </Link>

          {/* Trading Signals */}
          <Link href="/trading-signals" className="block">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow h-full">
              <div className="text-4xl mb-3">📈</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Trading Signals</h3>
              <p className="text-gray-600 text-sm mb-4">AI-powered buy/sell recommendations</p>
              <div className="text-2xl font-bold text-purple-600">$0.03</div>
              <div className="text-xs text-gray-500">per signal</div>
            </div>
          </Link>

          {/* Code Generator */}
          <Link href="/code-generator" className="block">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow h-full">
              <div className="text-4xl mb-3">🤖</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Code Generator</h3>
              <p className="text-gray-600 text-sm mb-4">Generate Solana program code & tests</p>
              <div className="text-2xl font-bold text-purple-600">$0.05</div>
              <div className="text-xs text-gray-500">per generation</div>
            </div>
          </Link>
        </div>

        {/* Info Section */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold mb-8">How It Works</h3>
          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div>
              <div className="text-4xl mb-3">🔗</div>
              <div className="font-semibold mb-2">1. Connect Wallet</div>
              <div className="text-sm text-gray-600">Link your Phantom or Solflare wallet</div>
            </div>
            <div>
              <div className="text-4xl mb-3">📝</div>
              <div className="font-semibold mb-2">2. Enter Token</div>
              <div className="text-sm text-gray-600">Paste the token address to analyze</div>
            </div>
            <div>
              <div className="text-4xl mb-3">💳</div>
              <div className="font-semibold mb-2">3. Pay with USDC</div>
              <div className="text-sm text-gray-600">Approve micro-payment in your wallet</div>
            </div>
            <div>
              <div className="text-4xl mb-3">🤖</div>
              <div className="font-semibold mb-2">4. Get AI Insights</div>
              <div className="text-sm text-gray-600">Receive instant analysis & risk score</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
