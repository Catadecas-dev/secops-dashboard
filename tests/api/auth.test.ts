import { createMocks } from 'node-mocks-http'
import { POST as loginHandler } from '@/app/api/auth/login/route'
import { POST as logoutHandler } from '@/app/api/auth/logout/route'
import { prisma } from '@/db/client'
import { PasswordService } from '@/auth/password'

// Mock Prisma
jest.mock('@/db/client', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}))

describe('/api/auth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        passwordHash: await PasswordService.hash('password123'),
        role: 'CLIENT_USER',
      }

      const mockSession = {
        id: 'session-1',
        sessionToken: 'token-123',
        userId: '1',
        expires: new Date(Date.now() + 86400000),
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.session.create as jest.Mock).mockResolvedValue(mockSession)
      ;(prisma.user.update as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      })

      const response = await loginHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toEqual({
        id: '1',
        email: 'test@example.com',
        role: 'CLIENT_USER',
      })
    })

    it('should reject invalid credentials', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      })

      const response = await loginHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('AUTHENTICATION_ERROR')
    })

    it('should validate request body', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          email: 'invalid-email',
          password: '123', // too short
        },
      })

      const response = await loginHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        role: 'CLIENT_USER',
      }

      const mockSession = {
        id: 'session-1',
        sessionToken: 'token-123',
        userId: '1',
        expires: new Date(Date.now() + 86400000),
        user: mockUser,
        updatedAt: new Date(),
      }

      ;(prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession)
      ;(prisma.session.delete as jest.Mock).mockResolvedValue({})
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: 'session-token=token-123',
        },
      })

      const response = await logoutHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle logout without session', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      })

      const response = await logoutHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
