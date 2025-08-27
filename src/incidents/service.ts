import { prisma } from '@/db/client';
import { cacheService } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { RBACService, requireIncidentAccess, User } from '@/auth/rbac';
import { AuditService } from '@/auth/audit';
import {
  CreateIncidentInput,
  UpdateIncidentInput,
  IncidentQuery,
  IncidentResponse,
  PaginatedResponse,
} from '@/validation/schemas';
import { Incident, Status, Severity } from '@prisma/client';

export class IncidentService {
  static async createIncident(
    user: User,
    data: CreateIncidentInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<IncidentResponse> {

      if (!RBACService.canCreateIncident(user)) {
        throw new ValidationError('Insufficient permissions to create incident');
      }

      const incident = await prisma.incident.create({
        data: {
          title: data.title,
          description: data.description,
          severity: data.severity,
          source: data.source,
          createdById: user.id,
        },
        include: {
          createdBy: {
            select: { id: true, email: true, role: true },
          },
        },
      });

      // Invalidate cache
      await cacheService.invalidateIncidentCache();

      // Audit log
      await AuditService.logIncidentCreate(
        user,
        incident.id,
        { title: data.title, severity: data.severity },
        ipAddress,
        userAgent
      );

      logger.info('Incident created', {
        incidentId: incident.id,
        userId: user.id,
        severity: data.severity,
      });

      return this.mapToResponse(incident);
  }

  static async getIncident(
    user: User,
    id: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<IncidentResponse> {

      // Try cache first
      const cacheKey = `incident:${id}`;
      const cached = await cacheService.get<IncidentResponse>(cacheKey);
      if (cached) {
        requireIncidentAccess(user, { id, createdById: cached.createdById }, 'view');
        return cached;
      }

      const incident = await prisma.incident.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: { id: true, email: true, role: true },
          },
        },
      });

      if (!incident) {
        throw new NotFoundError('Incident');
      }

      requireIncidentAccess(user, incident, 'view');

      const response = this.mapToResponse(incident);

      // Cache for 5 minutes
      await cacheService.set(cacheKey, response, 300);

      // Audit log for sensitive data access
      await AuditService.logIncidentView(user, id, ipAddress, userAgent);

      return response;
  }

  static async updateIncident(
    user: User,
    id: string,
    data: UpdateIncidentInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<IncidentResponse> {

      const existingIncident = await prisma.incident.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: { id: true, email: true, role: true },
          },
        },
      });

      if (!existingIncident) {
        throw new NotFoundError('Incident');
      }

      requireIncidentAccess(user, existingIncident, 'update');

      // Validate status transitions
      if (data.status && data.status !== existingIncident.status) {
        if (!RBACService.canTransitionStatus(
          user,
          existingIncident,
          existingIncident.status,
          data.status
        )) {
          throw new ValidationError(
            `Cannot transition from ${existingIncident.status} to ${data.status}`
          );
        }
      }

      const incident = await prisma.incident.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        include: {
          createdBy: {
            select: { id: true, email: true, role: true },
          },
        },
      });

      // Invalidate cache
      await cacheService.invalidateIncidentCache(id);

      // Audit log
      await AuditService.logIncidentUpdate(
        user,
        id,
        data,
        ipAddress,
        userAgent
      );

      logger.info('Incident updated', {
        incidentId: id,
        userId: user.id,
        changes: Object.keys(data),
      });

      return this.mapToResponse(incident);
  }

  static async listIncidents(
    user: User,
    query: IncidentQuery,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PaginatedResponse<IncidentResponse>> {

      // Generate cache key
      // Build where clause first to determine cache key
      const where: any = {
        ...RBACService.getIncidentFilter(user),
      };

      // Generate cache key that includes the RBAC filter
      const cacheKey = `incidents:list:${JSON.stringify({
        filter: where,
        ...query,
      })}`;

      // Try cache first
      const cached = await cacheService.get<PaginatedResponse<IncidentResponse>>(cacheKey);
      if (cached) {
        return cached;
      }

      if (query.status) {
        where.status = query.status;
      }

      if (query.severity) {
        where.severity = query.severity;
      }

      if (query.q) {
        // Full-text search using PostgreSQL's tsvector
        where.OR = [
          {
            title: {
              contains: query.q,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: query.q,
              mode: 'insensitive',
            },
          },
        ];
      }

      if (query.cursor) {
        where.id = {
          lt: query.cursor,
        };
      }

      const incidents = await prisma.incident.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit + 1, // Take one extra to check if there are more
      });

      const hasMore = incidents.length > query.limit;
      const data = incidents.slice(0, query.limit);
      const nextCursor = hasMore ? data[data.length - 1]?.id || null : null;

      const response: PaginatedResponse<IncidentResponse> = {
        data: data.map(this.mapToResponse),
        pagination: {
          nextCursor,
          hasMore,
        },
      };

      // Cache for 2 minutes
      await cacheService.set(cacheKey, response, 120);

      // Audit log for search operations
      if (query.q) {
        await AuditService.logIncidentSearch(
          user,
          query,
          data.length,
          ipAddress,
          userAgent
        );
      }

      return response;
  }

  static async deleteIncident(
    user: User,
    id: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {

      const incident = await prisma.incident.findUnique({
        where: { id },
      });

      if (!incident) {
        throw new NotFoundError('Incident');
      }

      requireIncidentAccess(user, incident, 'delete');

      await prisma.incident.delete({
        where: { id },
      });

      // Invalidate cache
      await cacheService.invalidateIncidentCache(id);

      logger.info('Incident deleted', {
        incidentId: id,
        userId: user.id,
      });
  }

  private static mapToResponse(incident: any): IncidentResponse {
    return {
      id: incident.id,
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      status: incident.status,
      source: incident.source,
      createdById: incident.createdById,
      createdAt: incident.createdAt,
      updatedAt: incident.updatedAt,
      createdBy: {
        id: incident.createdBy.id,
        email: incident.createdBy.email,
        role: incident.createdBy.role,
      },
    };
  }
}
