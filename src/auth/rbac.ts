import { Role } from '@prisma/client';
import { AuthorizationError } from '@/lib/errors';

export interface User {
  id: string;
  email: string;
  role: Role;
}

export interface AuthContext {
  user: User;
  requestId?: string;
}

// Role hierarchy: ANALYST > CLIENT_ADMIN > CLIENT_USER
const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.CLIENT_USER]: 1,
  [Role.CLIENT_ADMIN]: 2,
  [Role.ANALYST]: 3,
};

export class RBACService {
  static hasRole(user: User, requiredRole: Role): boolean {
    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole];
  }

  static requireRole(user: User, requiredRole: Role): void {
    if (!this.hasRole(user, requiredRole)) {
      throw new AuthorizationError(
        `Required role: ${requiredRole}, current role: ${user.role}`
      );
    }
  }

  // Incident permissions
  static canCreateIncident(user: User): boolean {
    return this.hasRole(user, Role.CLIENT_USER);
  }

  static canViewIncident(user: User, incident: { createdById: string }): boolean {
    // Analysts can view all incidents
    if (this.hasRole(user, Role.ANALYST)) {
      return true;
    }
    
    // Users can view their own incidents
    return user.id === incident.createdById;
  }

  static canUpdateIncident(user: User, incident: { createdById: string }): boolean {
    // Analysts can update all incidents
    if (this.hasRole(user, Role.ANALYST)) {
      return true;
    }
    
    // Client admins can update incidents in their organization
    if (this.hasRole(user, Role.CLIENT_ADMIN)) {
      return true;
    }
    
    // Users can update their own incidents (limited fields)
    return user.id === incident.createdById;
  }

  static canDeleteIncident(user: User, incident: { createdById: string }): boolean {
    // Only analysts can delete incidents
    return this.hasRole(user, Role.ANALYST);
  }

  // Comment permissions
  static canCreateComment(user: User, incident: { createdById: string }): boolean {
    // All authenticated users can comment on incidents they can view
    return this.canViewIncident(user, incident);
  }

  static canViewComments(user: User, incident: { createdById: string }): boolean {
    return this.canViewIncident(user, incident);
  }

  static canDeleteComment(user: User, comment: { authorId: string }): boolean {
    // Analysts can delete any comment, users can delete their own
    return this.hasRole(user, Role.ANALYST) || user.id === comment.authorId;
  }

  // Status transition permissions
  static canTransitionStatus(
    user: User,
    incident: { createdById: string },
    fromStatus: string,
    toStatus: string
  ): boolean {
    // Analysts can perform any status transition
    if (this.hasRole(user, Role.ANALYST)) {
      return true;
    }

    // Client admins have extended transition permissions
    if (this.hasRole(user, Role.CLIENT_ADMIN)) {
      const allowedTransitions = [
        'OPEN->IN_PROGRESS',
        'OPEN->RESOLVED',
        'IN_PROGRESS->OPEN',
        'IN_PROGRESS->RESOLVED',
      ];
      return allowedTransitions.includes(`${fromStatus}->${toStatus}`);
    }

    // Regular users can mark their own incidents as resolved from any status
    if (user.id === incident.createdById) {
      return toStatus === 'RESOLVED' || (fromStatus === 'OPEN' && toStatus === 'IN_PROGRESS');
    }

    return false;
  }

  // List/search permissions
  static getIncidentFilter(user: User): Record<string, any> {
    // Analysts can see all incidents
    if (this.hasRole(user, Role.ANALYST)) {
      return {};
    }

    // Other users can only see their own incidents
    return { createdById: user.id };
  }
}

// Middleware helper for route protection
export function requireAuth(requiredRole?: Role) {
  return (authContext: AuthContext | null) => {
    if (!authContext?.user) {
      throw new AuthorizationError('Authentication required');
    }

    if (requiredRole) {
      RBACService.requireRole(authContext.user, requiredRole);
    }

    return authContext;
  };
}

// Object-level authorization helpers
export function requireIncidentAccess(
  user: User,
  incident: { id: string; createdById: string },
  action: 'view' | 'update' | 'delete'
): void {
  switch (action) {
    case 'view':
      if (!RBACService.canViewIncident(user, incident)) {
        throw new AuthorizationError('Cannot view this incident');
      }
      break;
    case 'update':
      if (!RBACService.canUpdateIncident(user, incident)) {
        throw new AuthorizationError('Cannot update this incident');
      }
      break;
    case 'delete':
      if (!RBACService.canDeleteIncident(user, incident)) {
        throw new AuthorizationError('Cannot delete this incident');
      }
      break;
  }
}
