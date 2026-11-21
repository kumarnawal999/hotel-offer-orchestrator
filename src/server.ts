import { createApp } from './app';
import { config } from './config/env';
import { runWorker } from './temporal/worker';
import { RedisService } from './services/redis.service';
import { logger } from './utils/logger';

async function bootstrap() {
  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info('====================================================');
    logger.info(` Hotel Offer Orchestrator Server running on port ${config.port}`);
    logger.info(` Environment: ${config.nodeEnv}`);
    logger.info(` Temporal Server: ${config.temporal.address}`);
    logger.info(` Redis Host: ${config.redis.host}:${config.redis.port}`);
    logger.info('====================================================');
  });

  // Background retry-loop for Temporal Worker initialization to ensure seamless Docker Compose boot
  const initTemporalWorker = async (retryCount = 0) => {
    try {
      logger.info('Initializing Temporal Worker...');
      await runWorker();
      logger.info('Temporal Worker started and ready to process workflows.');
    } catch (err: any) {
      if (retryCount < 25) {
        const backoffMs = Math.min(2000 * Math.pow(1.3, retryCount), 10000);
        logger.warn(
          `Temporal server not yet reachable (${err.message}). Retrying worker connection in ${Math.round(
            backoffMs / 1000
          )}s (attempt ${retryCount + 1}/25)...`
        );
        setTimeout(() => initTemporalWorker(retryCount + 1), backoffMs);
      } else {
        logger.error(
          'Temporal Worker failed to connect after multiple retries. API will remain active, but workflows will require Temporal server to be online.'
        );
      }
    }
  };

  initTemporalWorker();

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await RedisService.getInstance().disconnect();
        logger.info('Redis client disconnected.');
      } catch (e: any) {
        logger.error('Error disconnecting Redis:', e.message);
      }
      process.exit(0);
    });

    // Force exit after 10s if graceful shutdown hangs
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error('Fatal bootstrap error:', err);
  process.exit(1);
});
