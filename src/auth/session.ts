import { randomBytes } from 'crypto';
import { prisma } from '@/db/client';
import { logger } from '@/lib/logger';
import { AuthenticationError } from '@/lib/errors';
import { User } from './rbac';
import { env } from '@/config/env';

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  createdAt: Date;
  lastAccessedAt: Date;
}

export class SessionService {
  static async createSession(userId: string): Promise<string> {
    try {
      const sessionToken = randomBytes(32).toString('hex');
      const session = await prisma.session.create({
        data: {
          sessionToken,
          userId,
          expires: new Date(Date.now() + env.SESSION_MAX_AGE * 1000),
        },
      });

      // Update last login
      await prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() },
      });

      logger.info('Session created', { userId, sessionId: session.id });
      return session.sessionToken;
    } catch (error) {
      logger.error('Session creation failed', error as Error, { userId });
      throw new Error('Session creation failed');
    }
  }

  static async validateSession(sessionToken: string): Promise<User | null> {
    try {
      const session = await prisma.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });

      if (!session || session.expires < new Date()) {
        if (session) {
          await this.destroySession(sessionToken);
        }
        return null;
      }

      // Check if session needs refresh
      const shouldRefresh = 
        Date.now() - session.updatedAt.getTime() > env.SESSION_UPDATE_AGE * 1000;

      if (shouldRefresh) {
        await prisma.session.update({
          where: { sessionToken },
          data: { 
            updatedAt: new Date(),
            expires: new Date(Date.now() + env.SESSION_MAX_AGE * 1000),
          },
        });
      }

      return {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
      };
    } catch (error) {
      logger.error('Session validation failed', error as Error, { sessionToken });
      return null;
    }
  }

  static async destroySession(sessionToken: string): Promise<void> {
    try {
      await prisma.session.delete({
        where: { sessionToken },
      });
      logger.info('Session destroyed', { sessionToken });
    } catch (error) {
      logger.error('Session destruction failed', error as Error, { sessionToken });
    }
  }

  static async destroyAllUserSessions(userId: string): Promise<void> {
    try {
      await prisma.session.deleteMany({
        where: { userId },
      });
      logger.info('All user sessions destroyed', { userId });
    } catch (error) {
      logger.error('User session cleanup failed', error as Error, { userId });
    }
  }

  static async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await prisma.session.deleteMany({
        where: {
          expires: {
            lt: new Date(),
          },
        },
      });
      logger.info('Expired sessions cleaned up', { count: result.count });
    } catch (error) {
      logger.error('Session cleanup failed', error as Error);
    }
  }
}
