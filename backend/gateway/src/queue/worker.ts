import { Job } from 'bull';
import { JobData, ServiceName } from '@x402-solintel/types';
import { serviceQueue } from './queue';
import { TokenCheckService } from '../services/token-check.service';
import { receiptStore } from '../storage/receipts';
import { BaseAIService } from '../services/base.service';

// Initialize services
const services: Partial<Record<ServiceName, BaseAIService>> = {
  'token-check': new TokenCheckService(),
  // More services will be added here
};

/**
 * Process jobs from the queue
 */
serviceQueue.process(async (job: Job<JobData>) => {
  const { service, input, paymentReceipt } = job.data;

  console.log(`[WORKER] Processing job ${job.id} for service: ${service}`);

  try {
    // Get service instance
    const serviceInstance = services[service];

    if (!serviceInstance) {
      throw new Error(`Service not found: ${service}`);
    }

    // Update progress
    await job.progress(10);

    // Execute service
    const result = await serviceInstance.execute(input);

    // Update progress
    await job.progress(90);

    // Save receipt if payment was made
    if (paymentReceipt) {
      await receiptStore.save(paymentReceipt);
    }

    // Update progress
    await job.progress(100);

    console.log(`[WORKER] Job ${job.id} completed successfully`);

    return result;
  } catch (error) {
    console.error(`[WORKER] Job ${job.id} failed:`, error);
    throw error;
  }
});

console.log('[WORKER] Job processor started');
