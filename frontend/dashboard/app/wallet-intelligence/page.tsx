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

export default function WalletIntelligencePage() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [copiedWallet, setCopiedWallet] = useState(false);

  const handleAnalyze = async () => {
    if (!walletAddress) {
      setError('Please enter a wallet address');
      return;
    }

    setLoading(true);
    setError('');
    setInvoice(null);
    setResult(null);
    setJobId(null);

    try {
      const response = await axios.post(`${GATEWAY_URL}/api/wallet-intelligence`, {
        walletAddress,
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
          setError('❌ Invalid wallet address. Please check and try again.');
        } else if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
          setError('⚠️ Network error. Please check your connection and try again.');
        } else if (errorMsg.includes('not found')) {
          setError('❌ Wallet not found. Please verify the address is correct.');
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

      // Add timeout for RPC calls to prevent hanging
      const recipientAccountInfo = await Promise.race([
        connection.getAccountInfo(recipientTokenAccount),
        new Promise((_, reject) => setTimeout(() => reject(new Error('RPC timeout')), 10000))
      ]) as any;
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
        `${GATEWAY_URL}/api/wallet-intelligence`,
        {
          walletAddress,
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

  const getPnLColor = (pnl: number) => {
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getSignalColor = (signal: string) => {
    return signal === 'RECOMMENDED' ? 'text-green-600' : 'text-red-600';
  };

  const getSignalBg = (signal: string) => {
    return signal === 'RECOMMENDED' ? 'bg-green-100' : 'bg-red-100';
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
          <h1 className="text-4xl font-bold mb-2">👤 Wallet Intelligence</h1>
          <p className="text-gray-600">Trading pattern analysis & PnL tracking for any Solana wallet</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Wallet Address
            <span className="ml-2 text-xs text-gray-500 font-normal">
              (e.g., HyrTWi2rBMHQCPU5RupKja1wms7Xv4osUq1RvUH8cwBh)
            </span>
          </label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value.trim())}
            placeholder="Enter Solana wallet address..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading && walletAddress) {
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
              disabled={loading || !walletAddress}
              className="mt-4 w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Processing...' : 'Analyze Wallet'}
            </button>
          )}

          {invoice && (
            <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-bold text-lg mb-3">💳 Payment Required</h3>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-semibold">Wallet Intelligence</span>
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
              <p className="text-purple-700 font-medium">AI is analyzing wallet activity...</p>
              <p className="text-sm text-purple-600 mt-1">This may take 10-15 seconds</p>
            </div>
          )}
        </div>

        {result && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-bold mb-6">Wallet Intelligence Report</h2>

            {/* Wallet Address */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-1">Wallet Address</h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500 font-mono break-all flex-1">{result.wallet}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.wallet);
                    setCopiedWallet(true);
                    setTimeout(() => setCopiedWallet(false), 2000);
                  }}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors whitespace-nowrap"
                >
                  {copiedWallet ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Wallet Stats */}
            {result.wallet_stats && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Wallet Activity</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Wallet Age</div>
                    <div className="font-semibold">{result.wallet_stats.wallet_age_days} days</div>
                    <div className="text-xs text-gray-500 mt-1">Since {result.wallet_stats.first_transaction_date}</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Total Transactions</div>
                    <div className="font-semibold">{result.wallet_stats.total_transactions}</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Daily Avg</div>
                    <div className="font-semibold">{result.wallet_stats.avg_daily_transactions.toFixed(1)}</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Activity Level</div>
                    <div className="font-semibold">
                      {result.wallet_stats.avg_daily_transactions > 10 ? 'High' :
                       result.wallet_stats.avg_daily_transactions > 3 ? 'Medium' : 'Low'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Balance */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Portfolio Balance</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Total Value</div>
                  <div className="text-2xl font-bold text-purple-600">${result.balance.total_usd.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">SOL</div>
                  <div className="font-semibold">{result.balance.sol.toFixed(4)} SOL</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Token Count</div>
                  <div className="font-semibold">{result.balance.tokens}</div>
                </div>
              </div>
            </div>

            {/* Trading Metrics */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Trading Performance</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Total Trades</div>
                  <div className="font-semibold">{result.trading_metrics.total_trades}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Win Rate</div>
                  <div className="font-semibold">{(result.trading_metrics.win_rate * 100).toFixed(1)}%</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Total P&L</div>
                  <div className={`font-semibold ${getPnLColor(result.trading_metrics.total_pnl)}`}>
                    ${result.trading_metrics.total_pnl.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Avg Hold Time</div>
                  <div className="font-semibold">{result.trading_metrics.avg_hold_time}</div>
                </div>
              </div>
            </div>

            {/* Best/Worst Trades */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Notable Trades</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">🏆 Best Trade</div>
                  <div className="font-mono text-xs text-gray-500 mb-1">{result.trading_metrics.best_trade.token}</div>
                  <div className="text-xl font-bold text-green-600">
                    +${result.trading_metrics.best_trade.profit.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">📉 Worst Trade</div>
                  <div className="font-mono text-xs text-gray-500 mb-1">{result.trading_metrics.worst_trade.token}</div>
                  <div className="text-xl font-bold text-red-600">
                    ${result.trading_metrics.worst_trade.profit.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Portfolio */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Top Holdings</h3>
              <div className="space-y-2">
                {result.portfolio.top_holdings.map((holding: any, i: number) => {
                  const getRiskColor = (risk: number) => {
                    if (risk < 30) return 'text-green-600';
                    if (risk < 60) return 'text-yellow-600';
                    return 'text-red-600';
                  };
                  const getRiskBg = (risk: number) => {
                    if (risk < 30) return 'bg-green-50';
                    if (risk < 60) return 'bg-yellow-50';
                    return 'bg-red-50';
                  };
                  const getRiskLabel = (risk: number) => {
                    if (risk < 30) return 'Low';
                    if (risk < 60) return 'Medium';
                    return 'High';
                  };

                  return (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-mono text-sm text-gray-700">{holding.token}</div>
                        {holding.risk_score !== undefined && (
                          <div className={`text-xs mt-1 inline-block px-2 py-0.5 rounded ${getRiskBg(holding.risk_score)}`}>
                            <span className={getRiskColor(holding.risk_score)}>
                              {getRiskLabel(holding.risk_score)} Risk
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${holding.value.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{holding.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Total Tokens</div>
                  <div className="font-semibold">{result.portfolio.total_tokens}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Diversification</div>
                  <div className="font-semibold">{result.portfolio.diversification_score}/10</div>
                </div>
              </div>
            </div>

            {/* Risk Profile */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold mb-2">Risk Profile</h3>
              <p className="text-gray-700">{result.risk_profile}</p>
            </div>

            {/* Copy Trade Signal */}
            <div className={`p-6 rounded-lg mb-6 ${getSignalBg(result.copy_trade_signal)}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Copy Trade Signal</div>
                  <div className={`text-3xl font-bold ${getSignalColor(result.copy_trade_signal)}`}>
                    {result.copy_trade_signal}
                  </div>
                </div>
                <div className="text-4xl">
                  {result.copy_trade_signal === 'RECOMMENDED' ? '✅' : '⚠️'}
                </div>
              </div>
              {result.copy_trade_reasons && result.copy_trade_reasons.length > 0 && (
                <div className="border-t border-gray-300 pt-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Analysis:</div>
                  <ul className="space-y-1">
                    {result.copy_trade_reasons.map((reason: string, i: number) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start">
                        <span className="mr-2">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* AI Insights */}
            <div className="mb-6 p-6 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="font-semibold mb-3">🤖 AI Insights</h3>
              <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {result.ai_insights}
              </div>
            </div>

            <button
              onClick={() => {
                setResult(null);
                setWalletAddress('');
                setError('');
              }}
              className="mt-6 w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Analyze Another Wallet
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
