import * as argon2 from 'argon2';
import { logger } from '@/lib/logger';

export class PasswordService {
  private static readonly HASH_OPTIONS = {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,
    parallelism: 1,
  };

  static async hash(password: string): Promise<string> {
    try {
      return await argon2.hash(password, this.HASH_OPTIONS);
    } catch (error) {
      logger.error('Password hashing failed', error as Error);
      throw new Error('Password hashing failed');
    }
  }

  static async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      logger.error('Password verification failed', error as Error);
      return false;
    }
  }
}
