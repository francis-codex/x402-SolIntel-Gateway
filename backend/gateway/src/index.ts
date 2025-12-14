import express from 'express';
import cors from 'cors';
import config from './config';
import servicesRoutes from './routes/services.routes';
import adminRoutes from './routes/admin.routes';
import './queue/worker'; // Initialize worker

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
}));

// Routes
app.use(servicesRoutes);
app.use(adminRoutes);

// Start server
async function start() {
  app.listen(config.port, config.host, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║   🤖 SolIntel Gateway - API Gateway         ║
╚═══════════════════════════════════════════════════════════════╝

Server running at: http://${config.host}:${config.port}
Network: ${config.network}
Recipient Wallet: ${config.recipientWallet || 'NOT SET'}

🔍 Available Services:
  • Token Check       →  $${config.pricing.tokenCheck.toFixed(3)} USDC
  • Deep Analysis     →  $${config.pricing.deepAnalysis.toFixed(3)} USDC
  • Contract Audit    →  $${config.pricing.contractAudit.toFixed(3)} USDC
  • Wallet Intel      →  $${config.pricing.walletIntel.toFixed(3)} USDC
  • Trading Signals   →  $${config.pricing.tradingSignals.toFixed(3)} USDC
  • Code Generator    →  $${config.pricing.codeGenerator.toFixed(3)} USDC

📡 Endpoints:
  POST /api/token-check          - Quick token analysis
  GET  /api/jobs/:jobId          - Check job status
  GET  /health                   - Health check
  GET  /receipts                 - Payment receipts
  GET  /stats                    - Platform statistics

🔑 API Keys:
  Anthropic: ${config.anthropicApiKey ? '✓ Configured' : '✗ Missing'}
  Helius:    ${config.heliusApiKey ? '✓ Configured' : '✗ Missing'}
  Birdeye:   ${config.birdeyeApiKey ? '✓ Configured' : '✗ Missing'}

⚡ Ready to serve AI intelligence with x402 payments!
    `);
  });
}

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nShutting down gracefully...');
  process.exit(0);
});

// Start the server
start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
