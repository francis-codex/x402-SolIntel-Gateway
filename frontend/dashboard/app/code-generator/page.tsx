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

export default function CodeGeneratorPage() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!description) {
      setError('Please enter a description');
      return;
    }

    setLoading(true);
    setError('');
    setInvoice(null);
    setResult(null);
    setJobId(null);
    setCopied(false);

    try {
      const response = await axios.post(`${GATEWAY_URL}/api/code-generator`, {
        description,
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
        if (errorMsg.includes('description') || errorMsg.includes('required')) {
          setError('❌ Please provide a detailed description of what you want to build.');
        } else if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
          setError('⚠️ Network error. Please check your connection and try again.');
        } else {
          setError(`❌ ${errorMsg}`);
        }
        setLoading(false);
      }
    }
  };

  const handlePayAndGenerate = async () => {
    if (!publicKey || !signTransaction) {
      setError('Please connect your wallet first');
      return;
    }

    if (!invoice) {
      setError('No invoice found. Please generate first.');
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
        `${GATEWAY_URL}/api/code-generator`,
        {
          description,
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
          setError(response.data.error || 'Generation failed');
          setLoading(false);
          clearInterval(poll);
        } else if (attempts >= maxAttempts) {
          setError('Generation timeout. Please try again.');
          setLoading(false);
          clearInterval(poll);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">🤖 Code Generator</h1>
          <p className="text-gray-600">Generate Solana program code & tests with AI</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe what you want to build
            <span className="ml-2 text-xs text-gray-500 font-normal">
              (Be specific about features, functionality, and requirements)
            </span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Create a Solana program for an NFT marketplace with listing, buying, and royalty features. Include tests and TypeScript client code..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            rows={4}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey && !loading && description) {
                handleGenerate();
              }
            }}
          />

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {!invoice && !result && (
            <>
              <button
                onClick={handleGenerate}
                disabled={loading || !description}
                className="mt-4 w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {loading ? 'Processing...' : 'Generate Code'}
              </button>
              <p className="mt-2 text-xs text-gray-500 text-center">
                💡 Tip: Press Ctrl+Enter to generate
              </p>
            </>
          )}

          {invoice && (
            <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-bold text-lg mb-3">💳 Payment Required</h3>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-semibold">Code Generator</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-semibold">${(parseInt(invoice.amount) / 1_000_000).toFixed(3)} USDC</span>
                </div>
              </div>
              <button
                onClick={handlePayAndGenerate}
                disabled={loading || !publicKey}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {publicKey ? 'Pay & Generate' : 'Connect Wallet to Pay'}
              </button>
            </div>
          )}

          {loading && jobId && (
            <div className="mt-6 p-6 bg-purple-50 border border-purple-200 rounded-lg text-center">
              <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-purple-700 font-medium">AI is generating your code...</p>
              <p className="text-sm text-purple-600 mt-1">This may take 15-20 seconds</p>
            </div>
          )}
        </div>

        {result && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-bold mb-6">Generated Code</h2>

            {/* Code Details */}
            <div className="mb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Language</div>
                <div className="font-semibold">{result.language}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Framework</div>
                <div className="font-semibold">{result.framework}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg col-span-2 md:col-span-1">
                <div className="text-sm text-gray-600 mb-1">Description</div>
                <div className="font-semibold text-sm">{result.description}</div>
              </div>
            </div>

            {/* Generated Code */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Code</h3>
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {copied ? '✓ Copied!' : 'Copy Code'}
                </button>
              </div>
              <div className="bg-gray-900 text-gray-100 p-6 rounded-lg overflow-x-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                  {result.code}
                </pre>
              </div>
            </div>

            {/* AI Explanation */}
            <div className="mb-6 p-6 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="font-semibold mb-3">🤖 AI Explanation</h3>
              <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {result.ai_explanation}
              </div>
            </div>

            {/* Setup Instructions */}
            <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold mb-3 text-xl">📝 Setup Instructions</h3>
              <div className="text-gray-700 prose prose-sm max-w-none">
                {result.instructions.split('\n').map((line: string, i: number) => {
                  // Handle headers (with ** markers or Step patterns)
                  if ((line.startsWith('**') && line.includes('**')) || line.startsWith('Step ')) {
                    const cleanLine = line.replace(/\*\*/g, '').trim();
                    return <h4 key={i} className="font-bold text-lg mt-4 mb-2">{cleanLine}</h4>;
                  }
                  // Handle bullet points
                  if (line.startsWith('- ')) {
                    return <li key={i} className="ml-4 mb-1">{line.substring(2)}</li>;
                  }
                  // Handle code blocks
                  if (line.startsWith('```')) {
                    return null; // Skip code block markers
                  }
                  // Handle code lines (lines with # or commands)
                  if (line.startsWith('#') || line.includes('anchor ') || line.includes('solana ') || line.includes('cargo ') || line.includes('cd ')) {
                    return <code key={i} className="block bg-gray-800 text-green-400 px-3 py-1 rounded font-mono text-sm mb-1">{line}</code>;
                  }
                  // Regular text - clean any remaining ** markers
                  if (line.trim()) {
                    const cleanLine = line.replace(/\*\*/g, '');
                    return <p key={i} className="mb-2">{cleanLine}</p>;
                  }
                  return <br key={i} />;
                })}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Important:</strong> Always review and test generated code thoroughly before deploying to production.
                This code is provided as a starting point and may require modifications for your specific use case.
              </p>
            </div>

            <button
              onClick={() => {
                setResult(null);
                setDescription('');
                setError('');
                setCopied(false);
              }}
              className="mt-6 w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Generate More Code
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
