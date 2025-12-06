import { Router } from 'express';
import { receiptStore } from '../storage/receipts';

const router = Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    service: 'AI Intelligence Gateway',
  });
});

/**
 * GET /receipts
 * Get recent payment receipts
 */
router.get('/receipts', async (req, res) => {
  try {
    const limit = parseInt((req.query.limit as string) || '50');
    const receipts = await receiptStore.getRecent(limit);

    res.json(receipts);
  } catch (error) {
    console.error('[ADMIN] Error fetching receipts:', error);
    res.status(500).json({
      error: 'Failed to fetch receipts',
    });
  }
});

/**
 * GET /stats
 * Get platform statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await receiptStore.getStats();

    res.json(stats);
  } catch (error) {
    console.error('[ADMIN] Error fetching stats:', error);
    res.status(500).json({
      error: 'Failed to fetch stats',
    });
  }
});

export default router;
