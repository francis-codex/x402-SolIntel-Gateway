import Bull from 'bull';
import config from '../config';
import { JobData } from '@x402-solintel/types';

/**
 * Job queue for async processing
 */
export const serviceQueue = new Bull<JobData>('ai-services', config.redisUrl, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: false, // Keep failed jobs for debugging
  },
});

/**
 * Add job to queue
 */
export async function addJobToQueue(data: JobData): Promise<Bull.Job<JobData>> {
  const job = await serviceQueue.add(data, {
    timeout: 120000, // 120 seconds max processing time (increased for AI calls)
  });

  console.log(`[QUEUE] Job ${job.id} added for service: ${data.service}`);

  return job;
}

/**
 * Get job by ID
 */
export async function getJobById(jobId: string): Promise<Bull.Job<JobData> | null> {
  return await serviceQueue.getJob(jobId);
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<{
  status: string;
  progress?: number;
  result?: any;
  error?: string;
}> {
  const job = await getJobById(jobId);

  if (!job) {
    throw new Error('Job not found');
  }

  const state = await job.getState();

  if (state === 'completed') {
    return {
      status: 'completed',
      result: job.returnvalue,
    };
  }

  if (state === 'failed') {
    return {
      status: 'failed',
      error: job.failedReason,
    };
  }

  return {
    status: state,
    progress: job.progress(),
  };
}

// Error handling
serviceQueue.on('error', (error) => {
  console.error('[QUEUE] Error:', error);
});

serviceQueue.on('failed', (job, error) => {
  console.error(`[QUEUE] Job ${job.id} failed:`, error);
});

serviceQueue.on('completed', (job) => {
  console.log(`[QUEUE] Job ${job.id} completed successfully`);
});
