import { Router } from 'express';
import { x402PaymentMiddleware } from '../middleware/x402';
import { addJobToQueue, getJobStatus } from '../queue/queue';
import { ServiceName } from '@x402-solintel/types';

const router = Router();

/**
 * POST /api/token-check
 * Quick token security and risk check
 */
router.post(
  '/api/token-check',
  x402PaymentMiddleware('token-check'),
  async (req, res) => {
    try {
      const job = await addJobToQueue({
        service: 'token-check' as ServiceName,
        input: req.body,
        paymentReceipt: (req as any).paymentReceipt,
      });

      res.json({
        jobId: job.id,
        status: 'queued',
        service: 'token-check',
        message: 'Analysis queued. Check status at /api/jobs/{jobId}',
        estimatedTime: '5-10 seconds',
      });
    } catch (error) {
      console.error('[API] Token check error:', error);
      res.status(500).json({
        error: 'Service execution failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * POST /api/deep-analysis
 * Comprehensive token analysis with AI insights
 */
router.post(
  '/api/deep-analysis',
  x402PaymentMiddleware('deep-analysis'),
  async (req, res) => {
    try {
      const job = await addJobToQueue({
        service: 'deep-analysis' as ServiceName,
        input: req.body,
        paymentReceipt: (req as any).paymentReceipt,
      });

      res.json({
        jobId: job.id,
        status: 'queued',
        service: 'deep-analysis',
        message: 'Deep analysis queued. Check status at /api/jobs/{jobId}',
        estimatedTime: '15-30 seconds',
      });
    } catch (error) {
      console.error('[API] Deep analysis error:', error);
      res.status(500).json({
        error: 'Service execution failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * POST /api/contract-audit
 * Smart contract security audit
 */
router.post(
  '/api/contract-audit',
  x402PaymentMiddleware('contract-audit'),
  async (req, res) => {
    try {
      const job = await addJobToQueue({
        service: 'contract-audit' as ServiceName,
        input: req.body,
        paymentReceipt: (req as any).paymentReceipt,
      });

      res.json({
        jobId: job.id,
        status: 'queued',
        service: 'contract-audit',
        message: 'Audit queued. Check status at /api/jobs/{jobId}',
        estimatedTime: '20-40 seconds',
      });
    } catch (error) {
      console.error('[API] Contract audit error:', error);
      res.status(500).json({
        error: 'Service execution failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * POST /api/wallet-intelligence
 * Wallet trading analysis and insights
 */
router.post(
  '/api/wallet-intelligence',
  x402PaymentMiddleware('wallet-intelligence'),
  async (req, res) => {
    try {
      const job = await addJobToQueue({
        service: 'wallet-intelligence' as ServiceName,
        input: req.body,
        paymentReceipt: (req as any).paymentReceipt,
      });

      res.json({
        jobId: job.id,
        status: 'queued',
        service: 'wallet-intelligence',
        message: 'Wallet analysis queued. Check status at /api/jobs/{jobId}',
        estimatedTime: '10-20 seconds',
      });
    } catch (error) {
      console.error('[API] Wallet intelligence error:', error);
      res.status(500).json({
        error: 'Service execution failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * POST /api/trading-signals
 * AI-powered trading recommendations
 */
router.post(
  '/api/trading-signals',
  x402PaymentMiddleware('trading-signals'),
  async (req, res) => {
    try {
      const job = await addJobToQueue({
        service: 'trading-signals' as ServiceName,
        input: req.body,
        paymentReceipt: (req as any).paymentReceipt,
      });

      res.json({
        jobId: job.id,
        status: 'queued',
        service: 'trading-signals',
        message: 'Signal generation queued. Check status at /api/jobs/{jobId}',
        estimatedTime: '10-15 seconds',
      });
    } catch (error) {
      console.error('[API] Trading signals error:', error);
      res.status(500).json({
        error: 'Service execution failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * POST /api/code-generator
 * Generate Solana program code
 */
router.post(
  '/api/code-generator',
  x402PaymentMiddleware('code-generator'),
  async (req, res) => {
    try {
      const job = await addJobToQueue({
        service: 'code-generator' as ServiceName,
        input: req.body,
        paymentReceipt: (req as any).paymentReceipt,
      });

      res.json({
        jobId: job.id,
        status: 'queued',
        service: 'code-generator',
        message: 'Code generation queued. Check status at /api/jobs/{jobId}',
        estimatedTime: '15-25 seconds',
      });
    } catch (error) {
      console.error('[API] Code generator error:', error);
      res.status(500).json({
        error: 'Service execution failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * GET /api/jobs/:jobId
 * Check job status and get results
 */
router.get('/api/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    const status = await getJobStatus(jobId);

    res.json(status);
  } catch (error) {
    console.error('[API] Job status error:', error);
    res.status(404).json({
      error: 'Job not found',
    });
  }
});

export default router;
