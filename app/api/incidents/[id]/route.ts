import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/auth/session';
import { IncidentService } from '@/incidents/service';
import { updateIncidentSchema } from '@/validation/schemas';
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  const contextLogger = createContextLogger({ requestId, route: `/api/incidents/${params.id}` });
  
  try {
      const user = await getAuthenticatedUser(request);
      const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';


      const incident = await IncidentService.getIncident(user, params.id, ip, userAgent);


      contextLogger.info('Incident retrieved', { 
        userId: user.id, 
        incidentId: params.id,
      });

      return NextResponse.json(incident);

    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        contextLogger.warn('Incident get validation error', { error: error.message });
        return NextResponse.json(
          createErrorResponse(error),
          { status: error.statusCode }
        );
      }

      contextLogger.error('Incident get error', error as Error);
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
        { status: 500 }
      );
    }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  const contextLogger = createContextLogger({ requestId, route: `/api/incidents/${params.id}` });
  
  try {
      const user = await getAuthenticatedUser(request);
      const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';


      const body = await request.json();
      const data = updateIncidentSchema.parse(body);

      const incident = await IncidentService.updateIncident(user, params.id, data, ip, userAgent);


      contextLogger.info('Incident updated', { 
        userId: user.id, 
        incidentId: params.id,
        changes: Object.keys(data),
      });

      return NextResponse.json(incident);

    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        contextLogger.warn('Incident update validation error', { error: error.message });
        return NextResponse.json(
          createErrorResponse(error),
          { status: error.statusCode }
        );
      }

      contextLogger.error('Incident update error', error as Error);
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
        { status: 500 }
      );
    }
}
