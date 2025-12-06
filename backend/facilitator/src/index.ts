import express, { Request, Response } from 'express';
import config from './config';
import { verifyPayment } from './verify';
import { settlePayment } from './settle';

const app = express();

app.use(express.json());

/**
 * GET /health - Health check
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    network: config.network,
    solanaRpcUrl: config.solanaRpcUrl,
  });
});

/**
 * POST /verify - Verify payment transaction
 */
app.post('/verify', async (req: Request, res: Response) => {
  try {
    const { payment, requirements } = req.body;

    if (!payment || !requirements) {
      return res.status(400).json({
        error: 'Missing payment or requirements',
      });
    }

    const result = await verifyPayment(payment, requirements);

    res.json(result);
  } catch (error) {
    console.error('[VERIFY] Error:', error);
    res.status(500).json({
      error: 'Verification failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /settle - Settle payment on Solana
 */
app.post('/settle', async (req: Request, res: Response) => {
  try {
    const { payment, requirements } = req.body;

    if (!payment || !requirements) {
      return res.status(400).json({
        error: 'Missing payment or requirements',
      });
    }

    // First verify
    const verifyResult = await verifyPayment(payment, requirements);

    if (!verifyResult.isValid) {
      return res.status(400).json({
        error: 'Payment verification failed',
        details: verifyResult.error,
      });
    }

    // Then settle
    const result = await settlePayment(payment);

    res.json(result);
  } catch (error) {
    console.error('[SETTLE] Error:', error);
    res.status(500).json({
      error: 'Settlement failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Start server
function start() {
  app.listen(config.port, config.host, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║   Payment Facilitator Service                         ║
╚═══════════════════════════════════════════════════════╝

Server running at: http://${config.host}:${config.port}
Network: ${config.network}
Solana RPC: ${config.solanaRpcUrl}

Endpoints:
  GET  /health             - Health check
  POST /verify             - Verify payment transaction
  POST /settle             - Settle payment on Solana

Ready to facilitate payments!
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
start();
