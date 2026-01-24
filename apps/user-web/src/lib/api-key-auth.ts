import { nanoid } from "nanoid"
import bcrypt from "bcryptjs"
import { createAdminClient } from "@dreamteam/database/server"

const KEY_PREFIX = "sk_live_"
const BCRYPT_COST = 12

export interface ApiKeyContext {
  workspaceId: string
  keyId: string
  keyName: string
}

/**
 * Generate a new API key with its hash and prefix
 */
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomPart = nanoid(48)
  const key = `${KEY_PREFIX}${randomPart}`
  const prefix = key.substring(0, 15) // "sk_live_" + first 7 chars
  const hash = bcrypt.hashSync(key, BCRYPT_COST)

  return { key, prefix, hash }
}

/**
 * Validate an API key from Authorization header
 * Header format: Authorization: Bearer sk_live_...
 *
 * Returns the workspace context if valid, null otherwise
 */
export async function validateApiKey(
  authHeader: string | null
): Promise<ApiKeyContext | null> {
  if (!authHeader?.startsWith(`Bearer ${KEY_PREFIX}`)) {
    return null
  }

  const apiKey = authHeader.substring(7) // Remove "Bearer "
  const prefix = apiKey.substring(0, 15) // "sk_live_" + 7 chars

  const supabase = createAdminClient()

  // Find active keys with matching prefix
  const { data: keys, error } = await supabase
    .from("workspace_api_keys")
    .select("id, workspace_id, name, key_hash")
    .eq("key_prefix", prefix)
    .eq("is_revoked", false)

  if (error || !keys?.length) {
    return null
  }

  // Filter out expired keys
  const now = new Date()
  const validKeys = keys.filter((k: { expires_at: string | null }) => {
    if (!k.expires_at) return true
    return new Date(k.expires_at) > now
  })

  if (!validKeys.length) {
    return null
  }

  // Verify against hash (there could be multiple with same prefix)
  for (const key of validKeys) {
    const isValid = await bcrypt.compare(apiKey, key.key_hash)
    if (isValid) {
      // Update last_used_at asynchronously (don't block response)
      supabase
        .from("workspace_api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", key.id)
        .then(() => {})
        .catch(() => {})

      return {
        workspaceId: key.workspace_id,
        keyId: key.id,
        keyName: key.name,
      }
    }
  }

  return null
}
