import { z } from 'zod';
import { Role, Severity, Status } from '@prisma/client';

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.nativeEnum(Role).optional().default(Role.CLIENT_USER),
});

// Incident schemas
export const createIncidentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().min(1, 'Description is required'),
  severity: z.nativeEnum(Severity),
  source: z.string().optional(),
});

export const updateIncidentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  severity: z.nativeEnum(Severity).optional(),
  status: z.nativeEnum(Status).optional(),
  source: z.string().optional(),
});

export const incidentQuerySchema = z.object({
  status: z.nativeEnum(Status).optional(),
  severity: z.nativeEnum(Severity).optional(),
  q: z.string().optional(), // search query
  cursor: z.string().optional(), // for pagination
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Comment schemas
export const createCommentSchema = z.object({
  body: z.string().min(1, 'Comment body is required'),
});

// Pagination schemas
export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Response schemas
export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.nativeEnum(Role),
  createdAt: z.date(),
  lastLoginAt: z.date().nullable(),
});

export const incidentResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  severity: z.nativeEnum(Severity),
  status: z.nativeEnum(Status),
  source: z.string().nullable(),
  createdById: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: userResponseSchema.pick({ id: true, email: true, role: true }),
});

export const commentResponseSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  authorId: z.string(),
  body: z.string(),
  createdAt: z.date(),
  author: userResponseSchema.pick({ id: true, email: true, role: true }),
});

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      nextCursor: z.string().nullable(),
      hasMore: z.boolean(),
      total: z.number().optional(),
    }),
  });

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;
export type IncidentQuery = z.infer<typeof incidentQuerySchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type IncidentResponse = z.infer<typeof incidentResponseSchema>;
export type CommentResponse = z.infer<typeof commentResponseSchema>;
export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    total?: number;
  };
};
