import { NextRequest, NextResponse } from 'next/server';
import { IncidentService } from '@/incidents/service';
import { logger, createContextLogger } from '@/lib/logger';
import { cookies } from 'next/headers';
import { SessionService } from '@/auth/session';
import { RBACService } from '@/auth/rbac';
import { AuthenticationError } from '@/lib/errors';
import { prisma } from '@/db/client';

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  const contextLogger = createContextLogger({ requestId, route: '/api/incidents/stats' });

  try {
    const sessionToken = cookies().get('session-token')?.value;
    if (!sessionToken) {
      throw new AuthenticationError('You must be logged in to view stats.');
    }

    const user = await SessionService.validateSession(sessionToken);
    if (!user) {
      throw new AuthenticationError('Invalid session.');
    }

    const where = RBACService.getIncidentFilter(user);

    // Get incident counts by status
    const stats = await prisma.incident.groupBy({
      by: ['status'],
      where,
      _count: {
        id: true,
      },
    });

    // Get total count
    const totalCount = await prisma.incident.count({ where });

    // Transform the data into a more usable format
    const statusCounts = {
      total: totalCount,
      open: 0,
      in_progress: 0,
      resolved: 0,
    };

    stats.forEach((stat) => {
      switch (stat.status) {
        case 'OPEN':
          statusCounts.open = stat._count.id;
          break;
        case 'IN_PROGRESS':
          statusCounts.in_progress = stat._count.id;
          break;
        case 'RESOLVED':
          statusCounts.resolved = stat._count.id;
          break;
      }
    });

    contextLogger.info('Incident stats retrieved', { 
      userId: user.id,
      role: user.role,
      total: statusCounts.total,
      open: statusCounts.open,
      inProgress: statusCounts.in_progress,
      resolved: statusCounts.resolved
    });

    return NextResponse.json(statusCounts);

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return new NextResponse(
        JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: error.message } }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    contextLogger.error('Failed to retrieve incident stats', error as Error);
    return new NextResponse(
      JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve incident statistics' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
