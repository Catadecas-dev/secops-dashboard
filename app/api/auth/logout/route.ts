import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/auth/session';
import { AuditService } from '@/auth/audit';
import { createContextLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  const contextLogger = createContextLogger({ requestId, route: '/api/auth/logout' });
  
  try {
      const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      

      const sessionToken = request.cookies.get('session-token')?.value;

      if (sessionToken) {
        // Get user info before destroying session for audit log
        const user = await SessionService.validateSession(sessionToken);
        
        if (user) {
          await AuditService.logLogout(user, ip, userAgent);
          contextLogger.info('User logged out', { userId: user.id });
        }

        await SessionService.destroySession(sessionToken);
      }

      // Clear session cookie
      const response = NextResponse.json({ success: true });
      response.cookies.set('session-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });

      return response;

    } catch (error) {
      contextLogger.error('Logout error', error as Error);
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
        { status: 500 }
      );
    }
}
