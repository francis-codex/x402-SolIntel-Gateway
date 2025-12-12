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

export default function TradingSignalsPage() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [tokenAddress, setTokenAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);

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
      const response = await axios.post(`${GATEWAY_URL}/api/trading-signals`, {
        tokenAddress,
      });

      if (response.data.jobId) {
        setJobId(response.data.jobId);
        pollJobStatus(response.data.jobId);
      }
    } catch (err: any) {
      if (err.response?.status === 402) {
        setInvoice(err.response.data.payment);
        setLoading(false);
      } else {
        const errorMsg = err.response?.data?.error || err.message || 'Request failed';
        if (errorMsg.includes('Invalid') || errorMsg.includes('invalid')) {
          setError('❌ Invalid token address. Please check and try again.');
        } else if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
          setError('⚠️ Network error. Please check your connection and try again.');
        } else if (errorMsg.includes('not found')) {
          setError('❌ Token not found. Please verify the address is correct.');
        } else {
          setError(`❌ ${errorMsg}`);
        }
        setLoading(false);
      }
    }
  };

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

      const paymentPayload = {
        version: 1,
        transaction: transactionBase64,
        invoiceId: invoice.invoiceId,
        network: invoice.network,
      };

      const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

      const response = await axios.post(
        `${GATEWAY_URL}/api/trading-signals`,
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
      const errorMsg = err.response?.data?.error || err.message || 'Payment failed';
      if (errorMsg.includes('insufficient') || errorMsg.includes('balance')) {
        setError('💰 Insufficient USDC balance. Please add USDC to your wallet and try again.');
      } else if (errorMsg.includes('rejected') || errorMsg.includes('denied')) {
        setError('⚠️ Transaction rejected. Please try again and approve the transaction in your wallet.');
      } else if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
        setError('⚠️ Network error during payment. Please check your connection and try again.');
      } else {
        setError(`❌ Payment failed: ${errorMsg}`);
      }
      setLoading(false);
    }
  };

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
    }, 2000);
  };

  const getSignalColor = (signal: string) => {
    if (signal === 'STRONG BUY') return 'text-green-600';
    if (signal === 'BUY') return 'text-green-500';
    if (signal === 'HOLD') return 'text-gray-600';
    if (signal === 'SELL') return 'text-red-500';
    return 'text-red-600';
  };

  const getSignalBg = (signal: string) => {
    if (signal === 'STRONG BUY') return 'bg-green-100';
    if (signal === 'BUY') return 'bg-green-50';
    if (signal === 'HOLD') return 'bg-gray-100';
    if (signal === 'SELL') return 'bg-red-50';
    return 'bg-red-100';
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'BULLISH') return 'text-green-600';
    if (trend === 'BEARISH') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900 hover:text-purple-600">
            ← Back to Home
          </Link>
          <WalletButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">📈 Trading Signals</h1>
          <p className="text-gray-600">AI-powered buy/sell recommendations with technical analysis</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Token Address
            <span className="ml-2 text-xs text-gray-500 font-normal">
              (e.g., JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN)
            </span>
          </label>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value.trim())}
            placeholder="Enter Solana token address..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading && tokenAddress) {
                handleAnalyze();
              }
            }}
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
              {loading ? 'Processing...' : 'Get Trading Signal'}
            </button>
          )}

          {invoice && (
            <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-bold text-lg mb-3">💳 Payment Required</h3>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-semibold">Trading Signals</span>
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
                {publicKey ? 'Pay & Get Signal' : 'Connect Wallet to Pay'}
              </button>
            </div>
          )}

          {loading && jobId && (
            <div className="mt-6 p-6 bg-purple-50 border border-purple-200 rounded-lg text-center">
              <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-purple-700 font-medium">AI is analyzing trading opportunities...</p>
              <p className="text-sm text-purple-600 mt-1">This may take 10-15 seconds</p>
            </div>
          )}
        </div>

        {result && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-bold mb-6">Trading Signal Report</h2>

            {/* Token Info */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">{result.token.symbol}</h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500 font-mono break-all flex-1">{result.token.address}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.token.address);
                    setCopiedAddress(true);
                    setTimeout(() => setCopiedAddress(false), 2000);
                  }}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors whitespace-nowrap"
                >
                  {copiedAddress ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Signal */}
            <div className={`p-8 rounded-lg mb-6 ${getSignalBg(result.signal)}`}>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-700 mb-2">Trading Signal</div>
                <div className={`text-5xl font-bold mb-4 ${getSignalColor(result.signal)}`}>
                  {result.signal}
                </div>
                <div className="text-2xl font-semibold text-gray-700">
                  Confidence: {(result.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Trade Setup */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Trade Setup</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Entry Point</div>
                  <div className="text-lg font-bold text-blue-600">${result.entry_point}</div>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Target Price</div>
                  <div className="text-lg font-bold text-green-600">${result.target_price}</div>
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Stop Loss</div>
                  <div className="text-lg font-bold text-red-600">${result.stop_loss}</div>
                </div>
              </div>
            </div>

            {/* Technical Analysis */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Technical Analysis</h3>
              <div className="mb-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-700 font-medium">Market Trend</span>
                  <span className={`text-xl font-bold ${getTrendColor(result.technical_analysis.trend)}`}>
                    {result.technical_analysis.trend}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Support Levels</h4>
                  <div className="space-y-2">
                    {result.technical_analysis.support_levels.map((level: string, i: number) => (
                      <div key={i} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-sm text-green-700 font-semibold">${level}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Resistance Levels</h4>
                  <div className="space-y-2">
                    {result.technical_analysis.resistance_levels.map((level: string, i: number) => (
                      <div key={i} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="text-sm text-red-700 font-semibold">${level}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Reasoning */}
            <div className="mb-6 p-6 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="font-semibold mb-3">🤖 AI Analysis & Reasoning</h3>
              <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {result.ai_reasoning}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Disclaimer:</strong> Trading signals are for informational purposes only and do not constitute financial advice.
                Always do your own research and trade at your own risk. Past performance does not guarantee future results.
              </p>
            </div>

            <button
              onClick={() => {
                setResult(null);
                setTokenAddress('');
                setError('');
              }}
              className="mt-6 w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Get Another Signal
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
