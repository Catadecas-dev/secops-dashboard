import { prisma } from '@/db/client';
import { logger } from '@/lib/logger';
import { User } from './rbac';

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  CREATE_INCIDENT = 'CREATE_INCIDENT',
  UPDATE_INCIDENT = 'UPDATE_INCIDENT',
  DELETE_INCIDENT = 'DELETE_INCIDENT',
  CREATE_COMMENT = 'CREATE_COMMENT',
  DELETE_COMMENT = 'DELETE_COMMENT',
  VIEW_INCIDENT = 'VIEW_INCIDENT',
  SEARCH_INCIDENTS = 'SEARCH_INCIDENTS',
}

export interface AuditLogData {
  userId?: string;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  static async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          details: data.details,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });

      logger.info('Audit log created', {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
      });
    } catch (error) {
      logger.error('Audit logging failed', error as Error, data);
    }
  }

  static async logLogin(user: User, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId: user.id,
      action: AuditAction.LOGIN,
      details: { email: user.email, role: user.role },
      ipAddress,
      userAgent,
    });
  }

  static async logLogout(user: User, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId: user.id,
      action: AuditAction.LOGOUT,
      details: { email: user.email },
      ipAddress,
      userAgent,
    });
  }

  static async logIncidentCreate(
    user: User,
    incidentId: string,
    details: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId: user.id,
      action: AuditAction.CREATE_INCIDENT,
      resource: 'incident',
      resourceId: incidentId,
      details,
      ipAddress,
      userAgent,
    });
  }

  static async logIncidentUpdate(
    user: User,
    incidentId: string,
    changes: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId: user.id,
      action: AuditAction.UPDATE_INCIDENT,
      resource: 'incident',
      resourceId: incidentId,
      details: { changes },
      ipAddress,
      userAgent,
    });
  }

  static async logCommentCreate(
    user: User,
    commentId: string,
    incidentId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId: user.id,
      action: AuditAction.CREATE_COMMENT,
      resource: 'comment',
      resourceId: commentId,
      details: { incidentId },
      ipAddress,
      userAgent,
    });
  }

  static async logIncidentView(
    user: User,
    incidentId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId: user.id,
      action: AuditAction.VIEW_INCIDENT,
      resource: 'incident',
      resourceId: incidentId,
      ipAddress,
      userAgent,
    });
  }

  static async logIncidentSearch(
    user: User,
    searchParams: Record<string, any>,
    resultCount: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId: user.id,
      action: AuditAction.SEARCH_INCIDENTS,
      resource: 'incident',
      details: { searchParams, resultCount },
      ipAddress,
      userAgent,
    });
  }
}
