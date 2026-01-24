/**
 * Encryption utilities for sensitive data like Plaid access tokens.
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
 * Get the encryption key from environment.
 * Key must be 32 bytes (256 bits) hex-encoded = 64 hex characters.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.PLAID_TOKEN_ENCRYPTION_KEY

  if (!key) {
    throw new Error(
      'PLAID_TOKEN_ENCRYPTION_KEY is not set. Generate with: openssl rand -hex 32'
    )
  }

  if (key.length !== 64) {
    throw new Error(
      `PLAID_TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes). Got ${key.length} characters.`
    )
  }

  return Buffer.from(key, 'hex')
}

/**
 * Encrypt a plaintext string (e.g., Plaid access token).
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey()
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
 *
 * @param encrypted - Encrypted string in format: iv:authTag:ciphertext
 * @returns Original plaintext string
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
export function decryptToken(encrypted: string): string {
  const key = getEncryptionKey()

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

/**
 * Check if a string looks like an encrypted token (vs plaintext).
 * Useful during migration when some tokens may still be plaintext.
 *
 * @param token - Token string to check
 * @returns true if token appears to be encrypted
 */
export function isEncryptedToken(token: string): boolean {
  // Encrypted format: iv:authTag:ciphertext
  // iv = 32 hex chars, authTag = 32 hex chars, ciphertext = variable
  const parts = token.split(':')
  if (parts.length !== 3) return false

  const [iv, authTag] = parts

  // Check if iv and authTag are valid hex and correct length
  return (
    iv.length === IV_LENGTH * 2 &&
    authTag.length === AUTH_TAG_LENGTH * 2 &&
    /^[0-9a-f]+$/i.test(iv) &&
    /^[0-9a-f]+$/i.test(authTag)
  )
}

/**
 * Safely get a decrypted token, handling both encrypted and plaintext.
 * This is useful during migration when some tokens may still be plaintext.
 *
 * @param token - Token that may be encrypted or plaintext
 * @returns Decrypted/plaintext token
 */
export function getAccessToken(token: string): string {
  if (isEncryptedToken(token)) {
    return decryptToken(token)
  }
  // Token is still plaintext (during migration)
  return token
}
