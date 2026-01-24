/**
 * One-time migration script to encrypt existing Plaid access tokens.
 *
 * Usage:
 *   Run from apps/finance: npx tsx scripts/encrypt-existing-tokens.ts
 */

import { createClient } from '@supabase/supabase-js'
import { createCipheriv, randomBytes } from 'crypto'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Parse .env.local manually
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../.env.local')
    const content = readFileSync(envPath, 'utf8')
    const env: Record<string, string> = {}

    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const match = trimmed.match(/^([^=]+)=(.*)$/)
      if (match) {
        env[match[1]] = match[2]
      }
    }
    return env
  } catch {
    return {}
  }
}

const localEnv = loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || localEnv.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || localEnv.SUPABASE_SERVICE_ROLE_KEY
const ENCRYPTION_KEY = process.env.PLAID_TOKEN_ENCRYPTION_KEY || localEnv.PLAID_TOKEN_ENCRYPTION_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!ENCRYPTION_KEY) {
  console.error('Missing PLAID_TOKEN_ENCRYPTION_KEY')
  console.error('Generate one with: openssl rand -hex 32')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Inline encryption function
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function encryptToken(plaintext: string): string {
  const key = Buffer.from(ENCRYPTION_KEY!, 'hex')
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

function isEncryptedToken(token: string): boolean {
  const parts = token.split(':')
  if (parts.length !== 3) return false
  const [iv, authTag] = parts
  return (
    iv.length === IV_LENGTH * 2 &&
    authTag.length === AUTH_TAG_LENGTH * 2 &&
    /^[0-9a-f]+$/i.test(iv) &&
    /^[0-9a-f]+$/i.test(authTag)
  )
}

interface PlaidItem {
  id: string
  plaid_access_token: string
  encrypted_access_token: string | null
}

async function migrateTokens() {
  console.log('Starting Plaid access token encryption migration...\n')

  const { data: items, error } = await supabase
    .from('plaid_items')
    .select('id, plaid_access_token, encrypted_access_token')

  if (error) {
    console.error('Failed to fetch plaid_items:', error)
    process.exit(1)
  }

  if (!items || items.length === 0) {
    console.log('No plaid_items found. Nothing to migrate.')
    return
  }

  console.log(`Found ${items.length} plaid_items to process.\n`)

  let encrypted = 0
  let skipped = 0
  let failed = 0

  for (const item of items as PlaidItem[]) {
    try {
      if (item.encrypted_access_token && isEncryptedToken(item.encrypted_access_token)) {
        console.log(`[SKIP] ${item.id} - Already encrypted`)
        skipped++
        continue
      }

      if (!item.plaid_access_token) {
        console.log(`[SKIP] ${item.id} - No plaintext token`)
        skipped++
        continue
      }

      if (isEncryptedToken(item.plaid_access_token)) {
        console.log(`[SKIP] ${item.id} - Token already in encrypted format`)
        skipped++
        continue
      }

      const encryptedToken = encryptToken(item.plaid_access_token)

      const { error: updateError } = await supabase
        .from('plaid_items')
        .update({ encrypted_access_token: encryptedToken })
        .eq('id', item.id)

      if (updateError) {
        console.error(`[FAIL] ${item.id} - Update failed:`, updateError)
        failed++
        continue
      }

      console.log(`[OK] ${item.id} - Encrypted successfully`)
      encrypted++
    } catch (err) {
      console.error(`[FAIL] ${item.id} - Exception:`, err)
      failed++
    }
  }

  console.log('\n--- Migration Summary ---')
  console.log(`Total items:     ${items.length}`)
  console.log(`Encrypted:       ${encrypted}`)
  console.log(`Skipped:         ${skipped}`)
  console.log(`Failed:          ${failed}`)

  if (failed > 0) {
    console.log('\n⚠️  Some items failed. Review the errors above and re-run if needed.')
    process.exit(1)
  }

  console.log('\n✅ Migration complete!')
}

migrateTokens().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
