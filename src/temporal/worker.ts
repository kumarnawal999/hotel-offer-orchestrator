import { NativeConnection, Worker } from '@temporalio/worker';
import { config } from '../config/env';
import * as activities from './activities';
import { logger } from '../utils/logger';

let workerInstance: Worker | null = null;

export async function runWorker(): Promise<Worker> {
  logger.info(`Starting Temporal Worker on task queue: ${config.temporal.taskQueue}...`);
  logger.info(`Connecting worker to Temporal server: ${config.temporal.address}`);

  const connection = await NativeConnection.connect({
    address: config.temporal.address,
  });

  const worker = await Worker.create({
    connection,
    namespace: config.temporal.namespace,
    taskQueue: config.temporal.taskQueue,
    workflowsPath: require.resolve('./workflows'),
    activities,
  });

  workerInstance = worker;
  logger.info('Temporal Worker created. Starting poll loop...');

  // Run the worker (non-blocking when awaited in background or blocking when executed standalone)
  worker.run().catch((err) => {
    logger.error('Temporal Worker encountered an error:', { error: err.message });
  });

  logger.info(`Temporal Worker is actively listening for tasks on queue: ${config.temporal.taskQueue}`);
  return worker;
}

export function getWorker(): Worker | null {
  return workerInstance;
}

// If executed directly via CLI (e.g. `npm run worker`)
if (require.main === module) {
  runWorker().catch((err) => {
    logger.error('Failed to start worker:', err);
    process.exit(1);
  });
}
