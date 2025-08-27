import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.AUTH_SECRET = 'test-secret-key-for-testing-purposes-only'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NODE_ENV = 'test'

// Mock telemetry
jest.mock('@/lib/telemetry', () => ({
  initTelemetry: jest.fn(),
  shutdownTelemetry: jest.fn(),
  tracer: {
    startSpan: jest.fn(() => ({
      setAttributes: jest.fn(),
      setStatus: jest.fn(),
      recordException: jest.fn(),
      end: jest.fn(),
    })),
    startActiveSpan: jest.fn((name, options, fn) => fn({
      setAttributes: jest.fn(),
      setStatus: jest.fn(),
      recordException: jest.fn(),
      end: jest.fn(),
    })),
  },
  withSpan: jest.fn((name, fn) => fn({
    setAttributes: jest.fn(),
    setStatus: jest.fn(),
    recordException: jest.fn(),
    end: jest.fn(),
  })),
  httpRequestDuration: { add: jest.fn() },
  httpRequestCount: { add: jest.fn() },
  authenticationAttempts: { add: jest.fn() },
  incidentOperations: { add: jest.fn() },
}))

// Mock Redis
jest.mock('@/lib/redis', () => ({
  getRedisClient: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(() => []),
    ping: jest.fn(),
    quit: jest.fn(),
    pipeline: jest.fn(() => ({
      incr: jest.fn(),
      expire: jest.fn(),
      exec: jest.fn(() => [[null, 1]]),
    })),
  })),
  closeRedisConnection: jest.fn(),
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
    invalidateIncidentCache: jest.fn(),
  },
}))

// Global test timeout
jest.setTimeout(10000)
