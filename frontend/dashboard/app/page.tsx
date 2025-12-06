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
              🤖 x402-SolIntel-Gateway
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

        {/* Service Card */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-5xl">🔍</span>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Quick Token Check
                </h3>
                <p className="text-gray-500">Instant risk assessment & security analysis</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-500">✓</span>
                <span>Risk Score (0-10)</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-500">✓</span>
                <span>Security Flags Detection</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-500">✓</span>
                <span>AI-Powered Insights</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-500">✓</span>
                <span>Holder Analysis</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div>
                <div className="text-3xl font-bold text-gray-900">$0.020</div>
                <div className="text-sm text-gray-500">USDC per analysis</div>
              </div>
              <Link
                href="/token-check"
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
              >
                Try Now →
              </Link>
            </div>
          </div>
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
