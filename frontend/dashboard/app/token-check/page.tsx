'use client';

import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletButton } from '../components/WalletButton';
import { Transaction, PublicKey } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import axios from 'axios';
import Link from 'next/link';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:4021';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export default function TokenCheckPage() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [tokenAddress, setTokenAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  // Step 1: Request analysis (will get 402 or jobId)
  const handleAnalyze = async () => {
    if (!tokenAddress) {
      setError('Please enter a token address');
      return;
    }

    setLoading(true);
    setError('');
    setInvoice(null);
    setResult(null);
    setJobId(null);

    try {
      const response = await axios.post(`${GATEWAY_URL}/api/token-check`, {
        tokenAddress,
      });

      // Got job ID directly (maybe free or already paid?)
      if (response.data.jobId) {
        setJobId(response.data.jobId);
        pollJobStatus(response.data.jobId);
      }
    } catch (err: any) {
      if (err.response?.status === 402) {
        // Payment required
        setInvoice(err.response.data.payment);
        setLoading(false);
      } else {
        setError(err.response?.data?.error || err.message || 'Request failed');
        setLoading(false);
      }
    }
  };

  // Step 2: Pay and submit
  const handlePayAndAnalyze = async () => {
    if (!publicKey || !signTransaction) {
      setError('Please connect your wallet first');
      return;
    }

    if (!invoice) {
      setError('No invoice found. Please analyze first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create USDC payment transaction
      const recipientPubkey = new PublicKey(invoice.recipient);
      const usdcMint = new PublicKey(USDC_MINT);

      const payerTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        publicKey
      );

      const recipientTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        recipientPubkey
      );

      const transaction = new Transaction();

      // Check if recipient token account exists
      const recipientAccountInfo = await connection.getAccountInfo(recipientTokenAccount);
      if (!recipientAccountInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            recipientTokenAccount,
            recipientPubkey,
            usdcMint
          )
        );
      }

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          payerTokenAccount,
          recipientTokenAccount,
          publicKey,
          BigInt(invoice.amount),
          [],
          TOKEN_PROGRAM_ID
        )
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signedTx = await signTransaction(transaction);
      const serialized = signedTx.serialize({ requireAllSignatures: false });
      const transactionBase64 = Buffer.from(serialized).toString('base64');

      // Create payment payload
      const paymentPayload = {
        version: 1,
        transaction: transactionBase64,
        invoiceId: invoice.invoiceId,
        network: invoice.network,
      };

      const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

      // Send request with payment
      const response = await axios.post(
        `${GATEWAY_URL}/api/token-check`,
        {
          tokenAddress,
        },
        {
          headers: {
            'X-PAYMENT': paymentHeader,
          },
          timeout: 60000,
        }
      );

      if (response.data.jobId) {
        setJobId(response.data.jobId);
        setInvoice(null);
        pollJobStatus(response.data.jobId);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Payment failed');
      setLoading(false);
    }
  };

  // Poll job status
  const pollJobStatus = async (id: string) => {
    const maxAttempts = 30;
    let attempts = 0;

    const poll = setInterval(async () => {
      attempts++;

      try {
        const response = await axios.get(`${GATEWAY_URL}/api/jobs/${id}`);

        if (response.data.status === 'completed') {
          setResult(response.data.result);
          setLoading(false);
          clearInterval(poll);
        } else if (response.data.status === 'failed') {
          setError(response.data.error || 'Analysis failed');
          setLoading(false);
          clearInterval(poll);
        } else if (attempts >= maxAttempts) {
          setError('Analysis timeout. Please try again.');
          setLoading(false);
          clearInterval(poll);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000); // Poll every 2 seconds
  };

  const getRiskColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    if (score >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRiskBg = (score: number) => {
    if (score >= 8) return 'bg-green-100';
    if (score >= 6) return 'bg-yellow-100';
    if (score >= 4) return 'bg-orange-100';
    return 'bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900 hover:text-purple-600">
            ← Back to Home
          </Link>
          <WalletButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">🔍 Quick Token Check</h1>
          <p className="text-gray-600">Instant AI-powered security & risk analysis</p>
        </div>

        {/* Input Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Token Address
          </label>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="Enter Solana token address..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={loading}
          />

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {!invoice && !result && (
            <button
              onClick={handleAnalyze}
              disabled={loading || !tokenAddress}
              className="mt-4 w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Processing...' : 'Analyze Token'}
            </button>
          )}

          {invoice && (
            <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-bold text-lg mb-3">💳 Payment Required</h3>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-semibold">Quick Token Check</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-semibold">${(parseInt(invoice.amount) / 1_000_000).toFixed(3)} USDC</span>
                </div>
              </div>
              <button
                onClick={handlePayAndAnalyze}
                disabled={loading || !publicKey}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {publicKey ? 'Pay & Analyze' : 'Connect Wallet to Pay'}
              </button>
            </div>
          )}

          {loading && jobId && (
            <div className="mt-6 p-6 bg-purple-50 border border-purple-200 rounded-lg text-center">
              <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-purple-700 font-medium">AI is analyzing the token...</p>
              <p className="text-sm text-purple-600 mt-1">This usually takes 5-10 seconds</p>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-bold mb-6">Analysis Results</h2>

            {/* Token Info */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">{result.token.name} ({result.token.symbol})</h3>
              <p className="text-sm text-gray-500 font-mono">{result.token.address}</p>
            </div>

            {/* Risk Score */}
            <div className={`p-6 rounded-lg mb-6 ${getRiskBg(result.risk_score)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Risk Score</div>
                  <div className={`text-4xl font-bold ${getRiskColor(result.risk_score)}`}>
                    {result.risk_score}/10
                  </div>
                </div>
                <div className={`text-2xl font-bold ${getRiskColor(result.risk_score)}`}>
                  {result.recommendation}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Price</div>
                <div className="font-semibold">${result.quick_stats.price}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Market Cap</div>
                <div className="font-semibold">${result.quick_stats.market_cap}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Holders</div>
                <div className="font-semibold">
                  {result.quick_stats.holders === 0
                    ? 'N/A'
                    : result.quick_stats.holders >= 10000
                      ? `~${(result.quick_stats.holders / 1000).toFixed(0)}k+`
                      : `~${result.quick_stats.holders.toLocaleString()}+`}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Liquidity</div>
                <div className="font-semibold">${result.quick_stats.liquidity}</div>
              </div>
            </div>

            {/* Security Flags */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Security Flags</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={result.security_flags.freeze_authority ? 'text-red-500' : 'text-green-500'}>
                    {result.security_flags.freeze_authority ? '⚠️' : '✓'}
                  </span>
                  <span>Freeze Authority: {result.security_flags.freeze_authority ? 'Present' : 'Disabled'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={result.security_flags.mint_authority ? 'text-red-500' : 'text-green-500'}>
                    {result.security_flags.mint_authority ? '⚠️' : '✓'}
                  </span>
                  <span>Mint Authority: {result.security_flags.mint_authority ? 'Present' : 'Disabled'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={result.security_flags.liquidity_locked ? 'text-green-500' : 'text-red-500'}>
                    {result.security_flags.liquidity_locked ? '✓' : '⚠️'}
                  </span>
                  <span>Liquidity: {result.security_flags.liquidity_locked ? 'Locked' : 'Not Locked'}</span>
                </div>
              </div>
            </div>

            {/* AI Summary */}
            <div className="p-6 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="font-semibold mb-3">🤖 AI Analysis</h3>
              <div className="text-gray-700 space-y-3 whitespace-pre-wrap leading-relaxed">
                {result.ai_summary.split('\n').map((line: string, i: number) => {
                  // Format headers (lines starting with #)
                  if (line.startsWith('###')) {
                    return <h4 key={i} className="text-md font-bold text-purple-800 mt-4 mb-2">{line.replace(/^###\s*/, '')}</h4>;
                  }
                  if (line.startsWith('##')) {
                    return <h3 key={i} className="text-lg font-bold text-purple-900 mt-5 mb-3">{line.replace(/^##\s*/, '')}</h3>;
                  }
                  if (line.startsWith('#')) {
                    return <h2 key={i} className="text-xl font-bold text-purple-900 mt-6 mb-3">{line.replace(/^#\s*/, '')}</h2>;
                  }

                  // Format list items (lines starting with -)
                  if (line.trim().startsWith('-')) {
                    const content = line.replace(/^-\s*/, '').replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-purple-900">$1</strong>');
                    return (
                      <div key={i} className="flex gap-2 mb-3 ml-4">
                        <span className="text-purple-600 font-bold flex-shrink-0">•</span>
                        <span dangerouslySetInnerHTML={{ __html: content }} />
                      </div>
                    );
                  }

                  // Format bold text (**text**)
                  const boldFormatted = line.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-purple-900">$1</strong>');

                  // Empty lines = spacing
                  if (line.trim() === '') {
                    return <div key={i} className="h-2"></div>;
                  }

                  // Regular paragraphs
                  return <p key={i} className="mb-2" dangerouslySetInnerHTML={{ __html: boldFormatted }}></p>;
                })}
              </div>
            </div>

            {/* New Analysis Button */}
            <button
              onClick={() => {
                setResult(null);
                setTokenAddress('');
                setError('');
              }}
              className="mt-6 w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Analyze Another Token
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
