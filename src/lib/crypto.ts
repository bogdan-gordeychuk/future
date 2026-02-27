import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGO = 'aes-256-cbc'

export function encryptToken(plaintext: string): string {
  const secret = process.env.BOT_TOKEN_ENCRYPTION_KEY
  if (!secret) throw new Error('BOT_TOKEN_ENCRYPTION_KEY is not set')
  // Per-token random salt for key derivation
  const salt = randomBytes(16)
  const iv = randomBytes(16)
  const key = scryptSync(secret, salt, 32)
  const cipher = createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  // New format: salt:iv:ciphertext (all hex)
  return `${salt.toString('hex')}:${iv.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptToken(stored: string): string {
  // Plaintext fallback for tokens stored before encryption was added
  if (!stored.includes(':') || stored.length < 35) return stored
  try {
    const parts = stored.split(':')
    const secret = process.env.BOT_TOKEN_ENCRYPTION_KEY
    if (!secret) throw new Error('BOT_TOKEN_ENCRYPTION_KEY is not set')

    if (parts.length === 3) {
      // New format: salt:iv:ciphertext
      const [saltHex, ivHex, encHex] = parts
      const salt = Buffer.from(saltHex, 'hex')
      const iv = Buffer.from(ivHex, 'hex')
      const key = scryptSync(secret, salt, 32)
      const enc = Buffer.from(encHex, 'hex')
      const decipher = createDecipheriv(ALGO, key, iv)
      return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
    } else if (parts.length === 2) {
      // Legacy format: iv:ciphertext (fixed salt 'vika-token-v1')
      const [ivHex, encHex] = parts
      const iv = Buffer.from(ivHex, 'hex')
      const key = scryptSync(secret, 'vika-token-v1', 32)
      const enc = Buffer.from(encHex, 'hex')
      const decipher = createDecipheriv(ALGO, key, iv)
      return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
    } else {
      // Unknown format — assume plaintext (migration period)
      return stored
    }
  } catch {
    // If decryption fails, assume plaintext (migration period)
    return stored
  }
}

/** Returns last 6 chars of decrypted token for UI display */
export function maskToken(stored: string): string {
  const plain = decryptToken(stored)
  return '•••••••••••••••' + plain.slice(-6)
}
