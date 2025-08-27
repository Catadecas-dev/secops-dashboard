import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/client';
import { PasswordService } from '@/auth/password';
import { SessionService } from '@/auth/session';
import { AuditService } from '@/auth/audit';
import { loginSchema } from '@/validation/schemas';
import { ValidationError, AuthenticationError, createErrorResponse } from '@/lib/errors';
import { logger, createContextLogger } from '@/lib/logger';
import { env } from '@/config/env';

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  const contextLogger = createContextLogger({ requestId, route: '/api/auth/login' });
  
  try {
      const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      

      const body = await request.json();
      const { email, password } = loginSchema.parse(body);

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });


      if (!user) {
        contextLogger.warn('Login attempt with invalid email', { email, ip });
        throw new AuthenticationError('Invalid credentials');
      }

      // Verify password
      const isValidPassword = await PasswordService.verify(user.passwordHash, password);
      if (!isValidPassword) {
        contextLogger.warn('Login attempt with invalid password', { userId: user.id, ip });
        throw new AuthenticationError('Invalid credentials');
      }

      // Create session
      const sessionToken = await SessionService.createSession(user.id);

      // Audit log
      await AuditService.logLogin(
        { id: user.id, email: user.email, role: user.role },
        ip,
        userAgent
      );

      contextLogger.info('User logged in successfully', { userId: user.id });

      // Set session cookie
      const response = NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      });

      response.cookies.set('session-token', sessionToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: env.SESSION_MAX_AGE,
        path: '/',
      });

      return response;

    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        contextLogger.warn('Login validation error', { error: error.message });
        return NextResponse.json(
          createErrorResponse(error),
          { status: error.statusCode }
        );
      }

      contextLogger.error('Login error', error as Error);
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
        { status: 500 }
      );
    }
}
