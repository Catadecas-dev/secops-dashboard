import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/auth/session';
import { IncidentService } from '@/incidents/service';
import { createIncidentSchema, incidentQuerySchema } from '@/validation/schemas';
import { ValidationError, AuthenticationError, createErrorResponse } from '@/lib/errors';
import { createContextLogger } from '@/lib/logger';

async function getAuthenticatedUser(request: NextRequest) {
  const sessionToken = request.cookies.get('session-token')?.value;
  if (!sessionToken) {
    throw new AuthenticationError();
  }

  const user = await SessionService.validateSession(sessionToken);
  if (!user) {
    throw new AuthenticationError();
  }

  return user;
}

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  const contextLogger = createContextLogger({ requestId, route: '/api/incidents' });
  
  try {
      const user = await getAuthenticatedUser(request);
      const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';


      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const queryParams = {
        status: searchParams.get('status') || undefined,
        severity: searchParams.get('severity') || undefined,
        q: searchParams.get('q') || undefined,
        cursor: searchParams.get('cursor') || undefined,
        limit: searchParams.get('limit') || undefined,
      };

      const query = incidentQuerySchema.parse(queryParams);

      const result = await IncidentService.listIncidents(user, query, ip, userAgent);


      contextLogger.info('Incidents listed', { 
        userId: user.id, 
        count: result.data.length,
        hasMore: result.pagination.hasMore,
      });

      return NextResponse.json(result);

    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        contextLogger.warn('Incidents list validation error', { error: error.message });
        return NextResponse.json(
          createErrorResponse(error),
          { status: error.statusCode }
        );
      }

      contextLogger.error('Incidents list error', error as Error);
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
        { status: 500 }
      );
    }
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  const contextLogger = createContextLogger({ requestId, route: '/api/incidents' });
  
  try {
      const user = await getAuthenticatedUser(request);
      const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';


      const body = await request.json();
      const data = createIncidentSchema.parse(body);

      const incident = await IncidentService.createIncident(user, data, ip, userAgent);


      contextLogger.info('Incident created', { 
        userId: user.id, 
        incidentId: incident.id,
        severity: data.severity,
      });

      return NextResponse.json(incident, { status: 201 });

    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        contextLogger.warn('Incident creation validation error', { error: error.message });
        return NextResponse.json(
          createErrorResponse(error),
          { status: error.statusCode }
        );
      }

      contextLogger.error('Incident creation error', error as Error);
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
        { status: 500 }
      );
    }
}
