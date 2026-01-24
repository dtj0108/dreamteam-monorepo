/**
 * Encryption utilities for CRM OAuth tokens.
 *
 * Uses AES-256-GCM which provides:
 * - Confidentiality: Data is encrypted
 * - Authentication: Tampering is detected via auth tag
 *
 * Format: iv:authTag:ciphertext (all hex-encoded)
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 128 bits
const AUTH_TAG_LENGTH = 16 // 128 bits

/**
 * Get the CRM encryption key from environment.
 * Key must be 32 bytes (256 bits) hex-encoded = 64 hex characters.
 * Falls back to PLAID_TOKEN_ENCRYPTION_KEY if CRM key not set.
 */
function getCRMEncryptionKey(): Buffer {
  const key = process.env.CRM_TOKEN_ENCRYPTION_KEY || process.env.PLAID_TOKEN_ENCRYPTION_KEY

  if (!key) {
    throw new Error(
      'CRM_TOKEN_ENCRYPTION_KEY is not set. Generate with: openssl rand -hex 32'
    )
  }

  if (key.length !== 64) {
    throw new Error(
      `CRM_TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes). Got ${key.length} characters.`
    )
  }

  return Buffer.from(key, 'hex')
}

/**
 * Encrypt a plaintext string (e.g., OAuth access token).
 */
export function encryptCRMToken(plaintext: string): string {
  const key = getCRMEncryptionKey()
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypt an encrypted string back to plaintext.
 */
export function decryptCRMToken(encrypted: string): string {
  const key = getCRMEncryptionKey()

  const parts = encrypted.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format. Expected iv:authTag:ciphertext')
  }

  const [ivHex, authTagHex, ciphertext] = parts

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length. Expected ${IV_LENGTH}, got ${iv.length}`)
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(
      `Invalid auth tag length. Expected ${AUTH_TAG_LENGTH}, got ${authTag.length}`
    )
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
