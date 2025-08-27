import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/auth/session';
import { CommentService } from '@/comments/service';
import { createCommentSchema } from '@/validation/schemas';
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
  const contextLogger = createContextLogger({ requestId, route: `/api/incidents/${params.id}/comments` });
  
  try {
      const user = await getAuthenticatedUser(request);


      const { searchParams } = new URL(request.url);
      const cursor = searchParams.get('cursor') || undefined;
      const limit = parseInt(searchParams.get('limit') || '20');

      const result = await CommentService.getIncidentComments(user, params.id, cursor, limit);

      contextLogger.info('Comments listed', { 
        userId: user.id, 
        incidentId: params.id,
        count: result.data.length,
      });

      return NextResponse.json(result);

    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        contextLogger.warn('Comments list validation error', { error: error.message });
        return NextResponse.json(
          createErrorResponse(error),
          { status: error.statusCode }
        );
      }

      contextLogger.error('Comments list error', error as Error);
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
        { status: 500 }
      );
    }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  const contextLogger = createContextLogger({ requestId, route: `/api/incidents/${params.id}/comments` });
  
  try {
      const user = await getAuthenticatedUser(request);
      const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';


      const body = await request.json();
      const data = createCommentSchema.parse(body);

      const comment = await CommentService.createComment(user, params.id, data, ip, userAgent);

      contextLogger.info('Comment created', { 
        userId: user.id, 
        incidentId: params.id,
        commentId: comment.id,
      });

      return NextResponse.json(comment, { status: 201 });

    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        contextLogger.warn('Comment creation validation error', { error: error.message });
        return NextResponse.json(
          createErrorResponse(error),
          { status: error.statusCode }
        );
      }

      contextLogger.error('Comment creation error', error as Error);
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
        { status: 500 }
      );
    }
}
