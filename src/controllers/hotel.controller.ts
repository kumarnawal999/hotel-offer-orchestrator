import { Request, Response } from 'express';
import { z } from 'zod';
import { TemporalClientService } from '../temporal/client';
import { SupplierService } from '../services/supplier.service';
import { RedisService } from '../services/redis.service';
import { logger } from '../utils/logger';

const hotelQuerySchema = z.object({
  city: z.string({ required_error: 'Query parameter "city" is required' }).min(1, 'City cannot be empty'),
  minPrice: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? parseFloat(val) : undefined))
    .refine((val) => val === undefined || (!isNaN(val) && val >= 0), {
      message: 'minPrice must be a non-negative number',
    }),
  maxPrice: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? parseFloat(val) : undefined))
    .refine((val) => val === undefined || (!isNaN(val) && val >= 0), {
      message: 'maxPrice must be a non-negative number',
    }),
  allowPartial: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  directMode: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export class HotelController {
  public static async getHotels(req: Request, res: Response): Promise<void> {
    const parseResult = hotelQuerySchema.safeParse(req.query);

    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    const { city, minPrice, maxPrice, allowPartial, directMode } = parseResult.data;

    // Validate minPrice <= maxPrice if both are provided
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      res.status(400).json({
        error: 'Invalid price range',
        message: `minPrice (${minPrice}) cannot be greater than maxPrice (${maxPrice})`,
      });
      return;
    }

    try {
      logger.info(`Received hotel search request for city: "${city}"`, { minPrice, maxPrice });

      // Direct mode flag can be used for rapid local testing without Temporal server
      if (directMode) {
        logger.info('Direct mode activated: executing deduplication and Redis storage directly');
        const [offersA, offersB] = await Promise.all([
          SupplierService.fetchSupplierAHotels(city, { allowPartial }),
          SupplierService.fetchSupplierBHotels(city, { allowPartial }),
        ]);
        const deduplicated = SupplierService.deduplicateHotels(offersA, offersB);
        const redisService = RedisService.getInstance();
        await redisService.saveHotels(city, deduplicated);
        const filtered = await redisService.filterHotels(city, minPrice, maxPrice);
        res.status(200).json(filtered);
        return;
      }

      // Default: Orchestrated via Temporal Workflow as required
      const temporalService = TemporalClientService.getInstance();
      const hotels = await temporalService.executeHotelAggregationWorkflow({
        city,
        minPrice,
        maxPrice,
        allowPartial,
      });

      res.status(200).json(hotels);
    } catch (error: any) {
      logger.error('Failed to process hotel aggregation:', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message || 'An error occurred during hotel offer orchestration',
      });
    }
  }
}
