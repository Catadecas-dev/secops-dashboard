import winston from 'winston';
import { env } from '@/config/env';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { level, message, timestamp, ...meta } = info;
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta,
    };
    return JSON.stringify(logEntry);
  })
);

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: env.NODE_ENV === 'development' 
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        : logFormat,
    }),
  ],
});

export interface LogContext {
  requestId?: string;
  userId?: string;
  route?: string;
  latencyMs?: number;
  status?: number;
  [key: string]: any;
}

export function createContextLogger(context: LogContext) {
  return {
    debug: (message: string, meta?: Record<string, any>) => 
      logger.debug(message, { ...context, ...meta }),
    info: (message: string, meta?: Record<string, any>) => 
      logger.info(message, { ...context, ...meta }),
    warn: (message: string, meta?: Record<string, any>) => 
      logger.warn(message, { ...context, ...meta }),
    error: (message: string, error?: Error, meta?: Record<string, any>) => 
      logger.error(message, { ...context, error: error?.stack, ...meta }),
  };
}
