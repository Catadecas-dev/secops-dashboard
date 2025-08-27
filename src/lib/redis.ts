import Redis from 'ioredis';
import { env } from '@/config/env';
import { logger } from './logger';

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      retryStrategy: (times) => {
        // Simple fixed delay
        return 100;
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('error', (error) => {
      logger.error('Redis connection error', error);
    });
  }

  return redis;
}

export async function closeRedisConnection() {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

// Cache helpers
export class CacheService {
  private redis: Redis;
  private defaultTTL = 300; // 5 minutes

  constructor() {
    this.redis = getRedisClient();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error', error as Error, { key });
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache set error', error as Error, { key, ttl });
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error('Cache delete error', error as Error, { key });
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      logger.error('Cache delete pattern error', error as Error, { pattern });
    }
  }

  // Cache invalidation helpers
  async invalidateIncidentCache(incidentId?: string): Promise<void> {
    const patterns = [
      'incidents:list:*',
      'incidents:search:*',
    ];

    if (incidentId) {
      patterns.push(`incident:${incidentId}:*`);
    }

    await Promise.all(patterns.map(pattern => this.delPattern(pattern)));
  }
}

export const cacheService = new CacheService();
