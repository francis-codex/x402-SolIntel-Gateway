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
