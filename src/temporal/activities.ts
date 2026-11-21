import { Context } from '@temporalio/activity';
import { RedisService } from '../services/redis.service';
import { SupplierService } from '../services/supplier.service';
import { DeduplicatedHotel, SupplierHotel } from '../types/hotel.types';
import { logger } from '../utils/logger';

/**
 * Activity to fetch hotel offers from Supplier A.
 * Includes activity context logging, error handling and retry tracking.
 */
export async function fetchSupplierAHotelsActivity(
  city: string,
  options?: { simulateDown?: boolean; allowPartial?: boolean }
): Promise<SupplierHotel[]> {
  const info = Context.current().info;
  logger.info(
    `[Activity: fetchSupplierAHotelsActivity] Started for city: ${city} (Attempt: ${info.attempt}, WorkflowId: ${info.workflowExecution.workflowId})`
  );

  try {
    const hotels = await SupplierService.fetchSupplierAHotels(city, options);
    logger.info(`[Activity: fetchSupplierAHotelsActivity] Success. Retrieved ${hotels.length} hotels.`);
    return hotels;
  } catch (error: any) {
    logger.error(`[Activity: fetchSupplierAHotelsActivity] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Activity to fetch hotel offers from Supplier B.
 * Includes activity context logging, error handling and retry tracking.
 */
export async function fetchSupplierBHotelsActivity(
  city: string,
  options?: { simulateDown?: boolean; allowPartial?: boolean }
): Promise<SupplierHotel[]> {
  const info = Context.current().info;
  logger.info(
    `[Activity: fetchSupplierBHotelsActivity] Started for city: ${city} (Attempt: ${info.attempt}, WorkflowId: ${info.workflowExecution.workflowId})`
  );

  try {
    const hotels = await SupplierService.fetchSupplierBHotels(city, options);
    logger.info(`[Activity: fetchSupplierBHotelsActivity] Success. Retrieved ${hotels.length} hotels.`);
    return hotels;
  } catch (error: any) {
    logger.error(`[Activity: fetchSupplierBHotelsActivity] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Activity to save the deduplicated hotels list into Redis Sorted Set.
 */
export async function saveHotelsToRedisActivity(
  city: string,
  hotels: DeduplicatedHotel[]
): Promise<void> {
  const info = Context.current().info;
  logger.info(
    `[Activity: saveHotelsToRedisActivity] Storing ${hotels.length} hotels in Redis for city: ${city} (WorkflowId: ${info.workflowExecution.workflowId})`
  );

  try {
    const redisService = RedisService.getInstance();
    await redisService.saveHotels(city, hotels);
    logger.info(`[Activity: saveHotelsToRedisActivity] Successfully saved hotels to Redis for city: ${city}`);
  } catch (error: any) {
    logger.error(`[Activity: saveHotelsToRedisActivity] Failed to save to Redis: ${error.message}`);
    throw error;
  }
}

/**
 * Activity to filter hotels from Redis Sorted Set by price range.
 * This executes price filtering natively inside Redis via ZRANGEBYSCORE.
 */
export async function filterHotelsInRedisActivity(
  city: string,
  minPrice?: number,
  maxPrice?: number
): Promise<DeduplicatedHotel[]> {
  const info = Context.current().info;
  logger.info(
    `[Activity: filterHotelsInRedisActivity] Querying Redis for city: ${city}, price range: [${minPrice ?? 'min'}, ${maxPrice ?? 'max'}] (WorkflowId: ${info.workflowExecution.workflowId})`
  );

  try {
    const redisService = RedisService.getInstance();
    const filteredHotels = await redisService.filterHotels(city, minPrice, maxPrice);
    logger.info(
      `[Activity: filterHotelsInRedisActivity] Successfully queried Redis, found ${filteredHotels.length} matching hotels.`
    );
    return filteredHotels;
  } catch (error: any) {
    logger.error(`[Activity: filterHotelsInRedisActivity] Error querying Redis: ${error.message}`);
    throw error;
  }
}
