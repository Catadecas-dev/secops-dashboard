import { getRedisClient } from './redis';
import { RateLimitError } from './errors';
import { logger } from './logger';
import { env } from '@/config/env';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (identifier: string) => string;
}

export class RateLimiter {
  private redis = getRedisClient();

  async checkLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = config.keyGenerator ? config.keyGenerator(identifier) : `rate_limit:${identifier}`;
    const window = Math.floor(Date.now() / config.windowMs);
    const windowKey = `${key}:${window}`;

    try {
      const pipeline = this.redis.pipeline();
      pipeline.incr(windowKey);
      pipeline.expire(windowKey, Math.ceil(config.windowMs / 1000));
      
      const results = await pipeline.exec();
      const count = results?.[0]?.[1] as number || 0;

      const allowed = count <= config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - count);
      const resetTime = (window + 1) * config.windowMs;

      if (!allowed) {
        logger.warn('Rate limit exceeded', {
          identifier,
          count,
          maxRequests: config.maxRequests,
          windowMs: config.windowMs,
        });
      }

      return { allowed, remaining, resetTime };
    } catch (error) {
      logger.error('Rate limit check failed', error as Error, { identifier });
      // Fail open - allow request if Redis is down
      return { allowed: true, remaining: config.maxRequests, resetTime: Date.now() + config.windowMs };
    }
  }

  async enforceLimit(identifier: string, config: RateLimitConfig): Promise<void> {
    const result = await this.checkLimit(identifier, config);
    
    if (!result.allowed) {
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`
      );
    }
  }
}

export const rateLimiter = new RateLimiter();

// Predefined rate limit configurations
export const RATE_LIMITS = {
  LOGIN: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    keyGenerator: (ip: string) => `login:${ip}`,
  },
  API_WRITE: {
    windowMs: 60000, // 1 minute
    maxRequests: 30,
    keyGenerator: (userId: string) => `api_write:${userId}`,
  },
  API_READ: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    keyGenerator: (userId: string) => `api_read:${userId}`,
  },
} as const;
