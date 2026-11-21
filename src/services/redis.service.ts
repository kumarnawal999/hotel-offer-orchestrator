import Redis from 'ioredis';
import { config } from '../config/env';
import { DeduplicatedHotel } from '../types/hotel.types';
import { logger } from '../utils/logger';

export class RedisService {
  private static instance: RedisService;
  private client: Redis;

  private constructor() {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy: (times) => {
        const delay = Math.min(times * 200, 2000);
        logger.warn(`Redis reconnect attempt #${times} in ${delay}ms`);
        return delay;
      },
      lazyConnect: false,
      enableOfflineQueue: true,
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      logger.info(`Connected to Redis at ${config.redis.host}:${config.redis.port}`);
    });

    this.client.on('error', (err) => {
      logger.error('Redis error:', { error: err.message });
    });
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  public getClient(): Redis {
    return this.client;
  }

  private getKey(city: string): string {
    return `hotels:${city.trim().toLowerCase()}`;
  }

  /**
   * Saves the deduplicated hotels list into a Redis Sorted Set (ZSET).
   * The price serves as the score to enable high-performance filtering inside Redis.
   */
  public async saveHotels(city: string, hotels: DeduplicatedHotel[]): Promise<void> {
    const key = this.getKey(city);
    const pipeline = this.client.pipeline();

    // Remove any previously stored offers for this city
    pipeline.del(key);

    if (hotels.length > 0) {
      // Add each hotel to the Sorted Set with price as the score
      hotels.forEach((hotel) => {
        const member = JSON.stringify(hotel);
        pipeline.zadd(key, hotel.price, member);
      });

      // Set key expiration (TTL)
      pipeline.expire(key, config.redis.ttlSeconds);
    }

    const results = await pipeline.exec();
    if (results) {
      for (const [err] of results) {
        if (err) {
          logger.error(`Error saving hotels to Redis for city ${city}:`, { error: err.message });
          throw err;
        }
      }
    }

    logger.info(`Saved ${hotels.length} hotels into Redis ZSET for city: ${city}`);
  }

  /**
   * Filters hotels by price range directly inside the Redis Sorted Set using ZRANGEBYSCORE.
   * This guarantees that filtering is executed in-engine by Redis.
   */
  public async filterHotels(
    city: string,
    minPrice?: number,
    maxPrice?: number
  ): Promise<DeduplicatedHotel[]> {
    const key = this.getKey(city);
    const min = minPrice !== undefined && minPrice !== null ? minPrice : '-inf';
    const max = maxPrice !== undefined && maxPrice !== null ? maxPrice : '+inf';

    logger.info(`Filtering hotels in Redis ZSET: key=${key}, minScore=${min}, maxScore=${max}`);

    // Query Redis sorted set by score range (price range)
    const members = await this.client.zrangebyscore(key, min, max);

    const hotels: DeduplicatedHotel[] = members.map((member) => {
      try {
        return JSON.parse(member) as DeduplicatedHotel;
      } catch (err) {
        logger.error('Failed to parse hotel member from Redis:', { member });
        throw err;
      }
    });

    logger.info(`Redis returned ${hotels.length} hotels for city ${city} within price [${min}, ${max}]`);
    return hotels;
  }

  /**
   * Ping Redis to test connection health and measure response time.
   */
  public async ping(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const response = await this.client.ping();
      const latencyMs = Date.now() - start;
      const healthy = response === 'PONG';
      return { healthy, latencyMs };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return { healthy: false, latencyMs, error: err.message };
    }
  }

  public async disconnect(): Promise<void> {
    await this.client.quit();
  }
}
