import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/client';
import { getRedisClient } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    // More comprehensive readiness checks
    const checks = await Promise.allSettled([
      // Database write test
      prisma.user.count(),
      
      // Redis write/read test
      (async () => {
        const redis = getRedisClient();
        const testKey = `readyz:${Date.now()}`;
        await redis.set(testKey, 'test', 'EX', 10);
        const result = await redis.get(testKey);
        await redis.del(testKey);
        if (result !== 'test') throw new Error('Redis read/write test failed');
      })(),
    ]);

    const dbCheck = checks[0];
    const redisCheck = checks[1];

    const allHealthy = checks.every(check => check.status === 'fulfilled');

    return NextResponse.json(
      {
        status: allHealthy ? 'ready' : 'not ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbCheck.status === 'fulfilled' ? 'ok' : 'error',
          redis: redisCheck.status === 'fulfilled' ? 'ok' : 'error',
        },
        ...(dbCheck.status === 'rejected' && { databaseError: dbCheck.reason?.message }),
        ...(redisCheck.status === 'rejected' && { redisError: redisCheck.reason?.message }),
      },
      { status: allHealthy ? 200 : 503 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
