import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

// Key derived once from env var
let _key: Buffer | null = null
function getKey(): Buffer {
  if (_key) return _key
  const secret = process.env.BOT_TOKEN_ENCRYPTION_KEY
  if (!secret) throw new Error('BOT_TOKEN_ENCRYPTION_KEY is not set')
  _key = scryptSync(secret, 'vika-token-v1', 32)
  return _key
}

const ALGO = 'aes-256-cbc'

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decryptToken(stored: string): string {
  // Plaintext fallback for tokens stored before encryption was added
  if (!stored.includes(':') || stored.length < 35) return stored
  try {
    const [ivHex, encHex] = stored.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const enc = Buffer.from(encHex, 'hex')
    const decipher = createDecipheriv(ALGO, getKey(), iv)
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
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
