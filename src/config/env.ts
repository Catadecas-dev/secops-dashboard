import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Redis
  REDIS_URL: z.string().url(),
  
  // Auth
  AUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(5),
  
  // Session Configuration
  SESSION_MAX_AGE: z.coerce.number().default(86400), // 24 hours
  SESSION_UPDATE_AGE: z.coerce.number().default(3600), // 1 hour
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    // During build time, environment variables may not be available
    // Check if we're in a build context by looking for Next.js build indicators
    const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                       process.argv.some(arg => arg.includes('next') && arg.includes('build')) ||
                       process.env.NODE_ENV === undefined;
    
    if (isBuildTime) {
      console.warn('⚠️ Environment validation skipped during build');
      // Return a minimal config for build time
      return {
        DATABASE_URL: 'postgresql://postgres:password@postgres:5432/secops_dashboard',
        REDIS_URL: 'redis://redis:6379',
        AUTH_SECRET: 'p62ff1b5018a34edcc6f31c133d3f9682daa57a4e62ea68f002197de6918aaf6c',
        NEXTAUTH_URL: 'http://localhost:3000',
        OTEL_SERVICE_NAME: 'secops-dashboard',
        RATE_LIMIT_WINDOW_MS: 900000,
        RATE_LIMIT_MAX_REQUESTS: 5,
        SESSION_MAX_AGE: 86400,
        SESSION_UPDATE_AGE: 3600,
        NODE_ENV: 'development',
      } as Env;
    }
    console.error('❌ Invalid environment variables:', error);
    process.exit(1);
  }
}

export const env = validateEnv();
