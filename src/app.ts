import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { mainRouter } from './routes';
import { logger } from './utils/logger';

export function createApp(): express.Application {
  const app = express();

  // Standard middleware
  app.use(cors());
  app.use(express.json());

  // Request logging middleware
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info(`[HTTP] ${req.method} ${req.originalUrl}`);
    next();
  });

  // Welcome / API Documentation root endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      title: 'Hotel Offer Orchestrator API',
      version: '1.0.0',
      description:
        'Aggregates overlapping hotel offers from Supplier A and Supplier B, deduplicates by best price using Temporal.io orchestration, and stores & filters offers via Redis Sorted Sets.',
      endpoints: {
        hotelSearch: 'GET /api/hotels?city=delhi',
        priceFilter: 'GET /api/hotels?city=delhi&minPrice=5000&maxPrice=6000',
        supplierA: 'GET /supplierA/hotels?city=delhi',
        supplierB: 'GET /supplierB/hotels?city=delhi',
        healthCheck: 'GET /health',
      },
      status: 'operational',
    });
  });

  // Mount main routes
  app.use(mainRouter);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Endpoint ${req.method} ${req.originalUrl} does not exist.`,
    });
  });

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled Application Error:', { error: err.message, stack: err.stack });
    res.status(err.status || 500).json({
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred.',
    });
  });

  return app;
}
