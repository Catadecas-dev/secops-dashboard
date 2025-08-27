import { prisma } from '@/db/client';
import { cacheService } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { RBACService, requireIncidentAccess, User } from '@/auth/rbac';
import { AuditService } from '@/auth/audit';
import {
  CreateCommentInput,
  CommentResponse,
  PaginatedResponse,
} from '@/validation/schemas';

export class CommentService {
  static async createComment(
    user: User,
    incidentId: string,
    data: CreateCommentInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<CommentResponse> {
      // Verify incident exists and user can comment

      // Verify incident exists and user can comment
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
      });

      if (!incident) {
        throw new NotFoundError('Incident');
      }

      if (!RBACService.canCreateComment(user, incident)) {
        throw new ValidationError('Insufficient permissions to comment on this incident');
      }

      const comment = await prisma.incidentComment.create({
        data: {
          incidentId,
          authorId: user.id,
          body: data.body,
        },
        include: {
          author: {
            select: { id: true, email: true, role: true },
          },
        },
      });

      // Invalidate incident cache
      await cacheService.invalidateIncidentCache(incidentId);

      // Audit log
      await AuditService.logCommentCreate(
        user,
        comment.id,
        incidentId,
        ipAddress,
        userAgent
      );

      logger.info('Comment created', {
        commentId: comment.id,
        incidentId,
        userId: user.id,
      });

      return this.mapToResponse(comment);
  }

  static async getIncidentComments(
    user: User,
    incidentId: string,
    cursor?: string,
    limit: number = 20
  ): Promise<PaginatedResponse<CommentResponse>> {
      // Verify incident exists and user can view comments

      // Verify incident exists and user can view comments
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
      });

      if (!incident) {
        throw new NotFoundError('Incident');
      }

      if (!RBACService.canViewComments(user, incident)) {
        throw new ValidationError('Insufficient permissions to view comments');
      }

      // Generate cache key
      const cacheKey = `incident:${incidentId}:comments:${cursor || 'start'}:${limit}`;

      // Try cache first
      const cached = await cacheService.get<PaginatedResponse<CommentResponse>>(cacheKey);
      if (cached) {
        return cached;
      }

      const where: any = { incidentId };

      if (cursor) {
        where.id = { lt: cursor };
      }

      const comments = await prisma.incidentComment.findMany({
        where,
        include: {
          author: {
            select: { id: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
      });

      const hasMore = comments.length > limit;
      const data = comments.slice(0, limit);
      const nextCursor = hasMore ? data[data.length - 1]?.id || null : null;

      const response: PaginatedResponse<CommentResponse> = {
        data: data.map(this.mapToResponse),
        pagination: {
          nextCursor,
          hasMore,
        },
      };

      // Cache for 2 minutes
      await cacheService.set(cacheKey, response, 120);

      return response;
  }

  static async deleteComment(
    user: User,
    commentId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {

      const comment = await prisma.incidentComment.findUnique({
        where: { id: commentId },
      });

      if (!comment) {
        throw new NotFoundError('Comment');
      }

      if (!RBACService.canDeleteComment(user, comment)) {
        throw new ValidationError('Insufficient permissions to delete this comment');
      }

      await prisma.incidentComment.delete({
        where: { id: commentId },
      });

      // Invalidate incident cache
      await cacheService.invalidateIncidentCache(comment.incidentId);

      logger.info('Comment deleted', {
        commentId,
        incidentId: comment.incidentId,
        userId: user.id,
      });
  }

  private static mapToResponse(comment: any): CommentResponse {
    return {
      id: comment.id,
      incidentId: comment.incidentId,
      authorId: comment.authorId,
      body: comment.body,
      createdAt: comment.createdAt,
      author: {
        id: comment.author.id,
        email: comment.author.email,
        role: comment.author.role,
      },
    };
  }
}
