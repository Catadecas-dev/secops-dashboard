import { RBACService, requireIncidentAccess } from '@/auth/rbac'
import { Role } from '@prisma/client'
import { AuthorizationError } from '@/lib/errors'

describe('RBACService', () => {
  const clientUser = { id: '1', email: 'user@test.com', role: Role.CLIENT_USER }
  const clientAdmin = { id: '2', email: 'admin@test.com', role: Role.CLIENT_ADMIN }
  const analyst = { id: '3', email: 'analyst@test.com', role: Role.ANALYST }

  describe('hasRole', () => {
    it('should allow users with sufficient role', () => {
      expect(RBACService.hasRole(analyst, Role.CLIENT_USER)).toBe(true)
      expect(RBACService.hasRole(analyst, Role.CLIENT_ADMIN)).toBe(true)
      expect(RBACService.hasRole(analyst, Role.ANALYST)).toBe(true)
      
      expect(RBACService.hasRole(clientAdmin, Role.CLIENT_USER)).toBe(true)
      expect(RBACService.hasRole(clientAdmin, Role.CLIENT_ADMIN)).toBe(true)
      
      expect(RBACService.hasRole(clientUser, Role.CLIENT_USER)).toBe(true)
    })

    it('should deny users with insufficient role', () => {
      expect(RBACService.hasRole(clientUser, Role.CLIENT_ADMIN)).toBe(false)
      expect(RBACService.hasRole(clientUser, Role.ANALYST)).toBe(false)
      expect(RBACService.hasRole(clientAdmin, Role.ANALYST)).toBe(false)
    })
  })

  describe('canViewIncident', () => {
    const incident = { createdById: '1' }

    it('should allow analysts to view any incident', () => {
      expect(RBACService.canViewIncident(analyst, incident)).toBe(true)
    })

    it('should allow users to view their own incidents', () => {
      expect(RBACService.canViewIncident(clientUser, incident)).toBe(true)
    })

    it('should deny users from viewing others incidents', () => {
      const otherIncident = { createdById: '999' }
      expect(RBACService.canViewIncident(clientUser, otherIncident)).toBe(false)
    })
  })

  describe('canUpdateIncident', () => {
    const incident = { createdById: '1' }

    it('should allow analysts to update any incident', () => {
      expect(RBACService.canUpdateIncident(analyst, incident)).toBe(true)
    })

    it('should allow client admins to update incidents', () => {
      expect(RBACService.canUpdateIncident(clientAdmin, incident)).toBe(true)
    })

    it('should allow users to update their own incidents', () => {
      expect(RBACService.canUpdateIncident(clientUser, incident)).toBe(true)
    })

    it('should deny users from updating others incidents', () => {
      const otherIncident = { createdById: '999' }
      expect(RBACService.canUpdateIncident(clientUser, otherIncident)).toBe(false)
    })
  })

  describe('canTransitionStatus', () => {
    const incident = { createdById: '1' }

    it('should allow analysts any status transition', () => {
      expect(RBACService.canTransitionStatus(analyst, incident, 'OPEN', 'CLOSED')).toBe(true)
    })

    it('should allow client admins limited transitions', () => {
      expect(RBACService.canTransitionStatus(clientAdmin, incident, 'OPEN', 'IN_PROGRESS')).toBe(true)
      expect(RBACService.canTransitionStatus(clientAdmin, incident, 'IN_PROGRESS', 'RESOLVED')).toBe(true)
      expect(RBACService.canTransitionStatus(clientAdmin, incident, 'OPEN', 'CLOSED')).toBe(false)
    })

    it('should allow users limited transitions on their own incidents', () => {
      expect(RBACService.canTransitionStatus(clientUser, incident, 'IN_PROGRESS', 'RESOLVED')).toBe(true)
      expect(RBACService.canTransitionStatus(clientUser, incident, 'OPEN', 'RESOLVED')).toBe(false)
    })
  })

  describe('requireIncidentAccess', () => {
    const incident = { id: '1', createdById: '1' }

    it('should not throw for valid access', () => {
      expect(() => requireIncidentAccess(clientUser, incident, 'view')).not.toThrow()
      expect(() => requireIncidentAccess(analyst, incident, 'delete')).not.toThrow()
    })

    it('should throw AuthorizationError for invalid access', () => {
      const otherIncident = { id: '2', createdById: '999' }
      expect(() => requireIncidentAccess(clientUser, otherIncident, 'view'))
        .toThrow(AuthorizationError)
      expect(() => requireIncidentAccess(clientUser, incident, 'delete'))
        .toThrow(AuthorizationError)
    })
  })
})
