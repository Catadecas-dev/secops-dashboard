import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/auth/session';
import { rateLimiter, RATE_LIMITS } from '@/lib/rate-limit';
import { logger, createContextLogger } from '@/lib/logger';
import { env } from '@/config/env';
import { v4 as uuidv4 } from 'uuid';

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const requestId = uuidv4();
  const contextLogger = createContextLogger({ requestId });

  // Add request ID to headers
  const response = NextResponse.next();
  response.headers.set('X-Request-ID', requestId);

  try {
    const { pathname, origin } = request.nextUrl;
    const method = request.method;
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Origin validation for API routes
    if (pathname.startsWith('/api/')) {
      const allowedOrigins = [env.NEXTAUTH_URL];
      const requestOrigin = request.headers.get('origin');
      
      if (requestOrigin && !allowedOrigins.includes(requestOrigin)) {
        contextLogger.warn('Invalid origin', { origin: requestOrigin, ip });
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    // Rate limiting for login endpoint
    if (pathname === '/api/auth/login' && method === 'POST') {
      try {
        await rateLimiter.enforceLimit(ip, RATE_LIMITS.LOGIN);
      } catch (error) {
        contextLogger.warn('Login rate limit exceeded', { ip, userAgent });
        return new NextResponse(
          JSON.stringify({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many login attempts' } }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Rate limiting for API write operations
    if (pathname.startsWith('/api/') && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      const sessionToken = request.cookies.get('session-token')?.value;
      let user = null;
      
      if (sessionToken) {
        try {
          user = await SessionService.validateSession(sessionToken);
        } catch (error) {
          // Session validation failed
        }
      }
      
      if (user?.id) {
        try {
          await rateLimiter.enforceLimit(user.id, RATE_LIMITS.API_WRITE);
        } catch (error) {
          contextLogger.warn('API write rate limit exceeded', { ip, pathname, userId: user.id });
          return new NextResponse(
            JSON.stringify({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } }),
            { status: 429, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Rate limiting for API read operations
    if (pathname.startsWith('/api/') && method === 'GET') {
      const sessionToken = request.cookies.get('session-token')?.value;
      let user = null;
      
      if (sessionToken) {
        try {
          user = await SessionService.validateSession(sessionToken);
        } catch (error) {
          // Session validation failed
        }
      }
      
      if (user?.id) {
        try {
          await rateLimiter.enforceLimit(user.id, RATE_LIMITS.API_READ);
        } catch (error) {
          contextLogger.warn('API read rate limit exceeded', { userId: user.id, ip });
          return new NextResponse(
            JSON.stringify({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } }),
            { status: 429, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Authentication check for protected routes
    if (pathname.startsWith('/dashboard') || 
        (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/') && !pathname.startsWith('/api/internal/'))) {
      
      const sessionToken = request.cookies.get('session-token')?.value;
      let user = null;
      
      if (sessionToken) {
        try {
          user = await SessionService.validateSession(sessionToken);
        } catch (error) {
          // Session validation failed
        }
      }
      
      if (!user) {
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ error: { code: 'AUTHENTICATION_ERROR', message: 'Authentication required' } }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        } else {
          return NextResponse.redirect(new URL('/login', request.url));
        }
      }
    }

    // CSRF protection for state-changing operations
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) && 
        pathname.startsWith('/api/') && 
        !pathname.startsWith('/api/auth/login')) {
      const csrfToken = request.headers.get('x-csrf-token');
      const sessionCsrfToken = request.cookies.get('session-csrf-token')?.value;
      
      if (!csrfToken || !sessionCsrfToken || csrfToken !== sessionCsrfToken) {
        contextLogger.warn('CSRF token validation failed', { ip, pathname });
        return new NextResponse(
          JSON.stringify({ error: { code: 'CSRF_ERROR', message: 'Invalid CSRF token' } }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const latencyMs = Date.now() - startTime;
    contextLogger.info('Request processed', {
      method,
      pathname,
      status: response.status,
      latencyMs,
      ip,
      userAgent,
    });

    return response;

  } catch (error) {
    const latencyMs = Date.now() - startTime;
    contextLogger.error('Middleware error', error as Error, {
      pathname: request.nextUrl.pathname,
      method: request.method,
      latencyMs,
    });

    return new NextResponse(
      JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     * - logout (logout page)
     */
    '/((?!_next/static|_next/image|favicon.ico|login|logout).*)',
  ],
};
