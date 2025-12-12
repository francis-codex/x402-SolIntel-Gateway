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

export default function ContractAuditPage() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [programId, setProgramId] = useState('');
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [copiedProgramId, setCopiedProgramId] = useState(false);

  const handleAudit = async () => {
    if (!programId) {
      setError('Please enter a program ID');
      return;
    }

    setLoading(true);
    setError('');
    setInvoice(null);
    setResult(null);
    setJobId(null);

    try {
      const response = await axios.post(`${GATEWAY_URL}/api/contract-audit`, {
        programId,
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
          setError('❌ Invalid program ID. Please check and try again.');
        } else if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
          setError('⚠️ Network error. Please check your connection and try again.');
        } else if (errorMsg.includes('not found')) {
          setError('❌ Program not found. Please verify the ID is correct.');
        } else {
          setError(`❌ ${errorMsg}`);
        }
        setLoading(false);
      }
    }
  };

  const handlePayAndAudit = async () => {
    if (!publicKey || !signTransaction) {
      setError('Please connect your wallet first');
      return;
    }

    if (!invoice) {
      setError('No invoice found. Please audit first.');
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
        `${GATEWAY_URL}/api/contract-audit`,
        {
          programId,
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
          setError(response.data.error || 'Audit failed');
          setLoading(false);
          clearInterval(poll);
        } else if (attempts >= maxAttempts) {
          setError('Audit timeout. Please try again.');
          setLoading(false);
          clearInterval(poll);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'CRITICAL') return 'text-red-600';
    if (severity === 'HIGH') return 'text-orange-600';
    if (severity === 'MEDIUM') return 'text-yellow-600';
    return 'text-blue-600';
  };

  const getSeverityBg = (severity: string) => {
    if (severity === 'CRITICAL') return 'bg-red-100 border-red-300';
    if (severity === 'HIGH') return 'bg-orange-100 border-orange-300';
    if (severity === 'MEDIUM') return 'bg-yellow-100 border-yellow-300';
    return 'bg-blue-100 border-blue-300';
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    if (score >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 8) return 'bg-green-100';
    if (score >= 6) return 'bg-yellow-100';
    if (score >= 4) return 'bg-orange-100';
    return 'bg-red-100';
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
          <h1 className="text-4xl font-bold mb-2">🛡️ Smart Contract Audit</h1>
          <p className="text-gray-600">AI-powered security vulnerability detection for Solana programs</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Program ID
            <span className="ml-2 text-xs text-gray-500 font-normal">
              (e.g., TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)
            </span>
          </label>
          <input
            type="text"
            value={programId}
            onChange={(e) => setProgramId(e.target.value.trim())}
            placeholder="Enter Solana program ID..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading && programId) {
                handleAudit();
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
              onClick={handleAudit}
              disabled={loading || !programId}
              className="mt-4 w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Processing...' : 'Audit Contract'}
            </button>
          )}

          {invoice && (
            <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-bold text-lg mb-3">💳 Payment Required</h3>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-semibold">Smart Contract Audit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-semibold">${(parseInt(invoice.amount) / 1_000_000).toFixed(3)} USDC</span>
                </div>
              </div>
              <button
                onClick={handlePayAndAudit}
                disabled={loading || !publicKey}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {publicKey ? 'Pay & Audit' : 'Connect Wallet to Pay'}
              </button>
            </div>
          )}

          {loading && jobId && (
            <div className="mt-6 p-6 bg-purple-50 border border-purple-200 rounded-lg text-center">
              <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-purple-700 font-medium">AI is auditing the contract...</p>
              <p className="text-sm text-purple-600 mt-1">This may take 10-15 seconds</p>
            </div>
          )}
        </div>

        {result && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-bold mb-6">Security Audit Report</h2>

            {/* Program ID */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-1">Program ID</h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500 font-mono break-all flex-1">{result.program_id}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.program_id);
                    setCopiedProgramId(true);
                    setTimeout(() => setCopiedProgramId(false), 2000);
                  }}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors whitespace-nowrap"
                >
                  {copiedProgramId ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Security Score */}
            <div className={`p-6 rounded-lg mb-6 ${getScoreBg(result.security_score)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Security Score</div>
                  <div className={`text-4xl font-bold ${getScoreColor(result.security_score)}`}>
                    {result.security_score}/10
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700 mb-1">Total Issues</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {result.vulnerabilities.critical.length +
                      result.vulnerabilities.high.length +
                      result.vulnerabilities.medium.length +
                      result.vulnerabilities.low.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Vulnerability Summary */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Vulnerability Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Critical</div>
                  <div className="text-2xl font-bold text-red-600">{result.vulnerabilities.critical.length}</div>
                </div>
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">High</div>
                  <div className="text-2xl font-bold text-orange-600">{result.vulnerabilities.high.length}</div>
                </div>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Medium</div>
                  <div className="text-2xl font-bold text-yellow-600">{result.vulnerabilities.medium.length}</div>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Low</div>
                  <div className="text-2xl font-bold text-blue-600">{result.vulnerabilities.low.length}</div>
                </div>
              </div>
            </div>

            {/* Vulnerabilities Detail */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Vulnerabilities</h3>
              <div className="space-y-3">
                {result.vulnerabilities.critical.map((vuln: any, i: number) => (
                  <div key={`critical-${i}`} className={`p-4 rounded-lg border ${getSeverityBg(vuln.severity)}`}>
                    <div className="flex items-start gap-3">
                      <span className={`font-bold ${getSeverityColor(vuln.severity)}`}>🚨</span>
                      <div className="flex-1">
                        <div className={`font-bold ${getSeverityColor(vuln.severity)} mb-1`}>{vuln.title}</div>
                        <p className="text-sm text-gray-700 mb-2">{vuln.description}</p>
                        {vuln.recommendation && (
                          <div className="text-sm text-gray-600 bg-white bg-opacity-50 p-2 rounded">
                            <strong>Recommendation:</strong> {vuln.recommendation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {result.vulnerabilities.high.map((vuln: any, i: number) => (
                  <div key={`high-${i}`} className={`p-4 rounded-lg border ${getSeverityBg(vuln.severity)}`}>
                    <div className="flex items-start gap-3">
                      <span className={`font-bold ${getSeverityColor(vuln.severity)}`}>⚠️</span>
                      <div className="flex-1">
                        <div className={`font-bold ${getSeverityColor(vuln.severity)} mb-1`}>{vuln.title}</div>
                        <p className="text-sm text-gray-700 mb-2">{vuln.description}</p>
                        {vuln.recommendation && (
                          <div className="text-sm text-gray-600 bg-white bg-opacity-50 p-2 rounded">
                            <strong>Recommendation:</strong> {vuln.recommendation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {result.vulnerabilities.medium.map((vuln: any, i: number) => (
                  <div key={`medium-${i}`} className={`p-4 rounded-lg border ${getSeverityBg(vuln.severity)}`}>
                    <div className="flex items-start gap-3">
                      <span className={`font-bold ${getSeverityColor(vuln.severity)}`}>⚡</span>
                      <div className="flex-1">
                        <div className={`font-bold ${getSeverityColor(vuln.severity)} mb-1`}>{vuln.title}</div>
                        <p className="text-sm text-gray-700 mb-2">{vuln.description}</p>
                        {vuln.recommendation && (
                          <div className="text-sm text-gray-600 bg-white bg-opacity-50 p-2 rounded">
                            <strong>Recommendation:</strong> {vuln.recommendation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {result.vulnerabilities.low.map((vuln: any, i: number) => (
                  <div key={`low-${i}`} className={`p-4 rounded-lg border ${getSeverityBg(vuln.severity)}`}>
                    <div className="flex items-start gap-3">
                      <span className={`font-bold ${getSeverityColor(vuln.severity)}`}>ℹ️</span>
                      <div className="flex-1">
                        <div className={`font-bold ${getSeverityColor(vuln.severity)} mb-1`}>{vuln.title}</div>
                        <p className="text-sm text-gray-700 mb-2">{vuln.description}</p>
                        {vuln.recommendation && (
                          <div className="text-sm text-gray-600 bg-white bg-opacity-50 p-2 rounded">
                            <strong>Recommendation:</strong> {vuln.recommendation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {result.vulnerabilities.critical.length === 0 &&
                  result.vulnerabilities.high.length === 0 &&
                  result.vulnerabilities.medium.length === 0 &&
                  result.vulnerabilities.low.length === 0 && (
                    <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
                      <div className="text-4xl mb-2">✅</div>
                      <p className="text-green-700 font-medium">No vulnerabilities detected!</p>
                    </div>
                  )}
              </div>
            </div>

            {/* AI Analysis */}
            <div className="mb-6 p-6 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="font-semibold mb-3">🤖 AI Security Analysis</h3>
              <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {result.ai_analysis}
              </div>
            </div>

            {/* Recommendations */}
            {result.recommendations && result.recommendations.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Key Recommendations</h3>
                <div className="space-y-2">
                  {result.recommendations.map((rec: string, i: number) => (
                    <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-purple-600 font-bold">•</span>
                      <p className="text-gray-700">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setResult(null);
                setProgramId('');
                setError('');
              }}
              className="mt-6 w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Audit Another Contract
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
