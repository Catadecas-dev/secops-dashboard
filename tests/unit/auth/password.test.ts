import { PasswordService } from '@/auth/password'

describe('PasswordService', () => {
  describe('hash', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123!'
      const hash = await PasswordService.hash(password)
      
      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50)
    })

    it('should generate different hashes for the same password', async () => {
      const password = 'testPassword123!'
      const hash1 = await PasswordService.hash(password)
      const hash2 = await PasswordService.hash(password)
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verify', () => {
    it('should verify a correct password', async () => {
      const password = 'testPassword123!'
      const hash = await PasswordService.hash(password)
      
      const isValid = await PasswordService.verify(hash, password)
      expect(isValid).toBe(true)
    })

    it('should reject an incorrect password', async () => {
      const password = 'testPassword123!'
      const wrongPassword = 'wrongPassword123!'
      const hash = await PasswordService.hash(password)
      
      const isValid = await PasswordService.verify(hash, wrongPassword)
      expect(isValid).toBe(false)
    })

    it('should handle invalid hash gracefully', async () => {
      const password = 'testPassword123!'
      const invalidHash = 'invalid-hash'
      
      const isValid = await PasswordService.verify(invalidHash, password)
      expect(isValid).toBe(false)
    })
  })
})
