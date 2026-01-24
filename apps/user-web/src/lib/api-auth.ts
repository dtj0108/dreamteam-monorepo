import { getSession } from "@dreamteam/auth/session"
import { createClient } from "@supabase/supabase-js"
import { validateApiKey, type ApiKeyContext } from "./api-key-auth"

export type AuthContext =
  | { type: "session"; userId: string; workspaceId?: string }
  | { type: "api_key"; workspaceId: string; keyId: string; keyName: string }

/**
 * Get authentication context from API key, Bearer JWT token, or cookie session
 *
 * Authentication methods (checked in order):
 * 1. API key (Bearer sk_live_...) - for integrations
 * 2. Supabase JWT (Bearer eyJ...) - for mobile apps
 * 3. Cookie session - for web app
 */
export async function getAuthContext(
  request: Request
): Promise<AuthContext | null> {
  const authHeader = request.headers.get("authorization")

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7)

    // 1. Check for API key (sk_live_...)
    if (token.startsWith("sk_live_")) {
      const apiKeyContext = await validateApiKey(authHeader)
      if (apiKeyContext) {
        return { type: "api_key", ...apiKeyContext }
      }
      // Invalid API key - don't fall back
      return null
    }

    // 2. Check for Supabase JWT (mobile auth)
    // JWTs start with "eyJ" (base64-encoded JSON header)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (user && !error) {
      return { type: "session", userId: user.id }
    }
    // Invalid JWT - don't fall back to cookie
    return null
  }

  // 3. Fall back to cookie session (web)
  const session = await getSession()
  if (session?.id) {
    return { type: "session", userId: session.id }
  }

  return null
}

/**
 * Helper to check if auth context is from an API key
 */
export function isApiKeyAuth(
  auth: AuthContext
): auth is Extract<AuthContext, { type: "api_key" }> {
  return auth.type === "api_key"
}

/**
 * Helper to check if auth context is from a session
 */
export function isSessionAuth(
  auth: AuthContext
): auth is Extract<AuthContext, { type: "session" }> {
  return auth.type === "session"
}
