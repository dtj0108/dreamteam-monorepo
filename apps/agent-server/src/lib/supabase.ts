/**
 * Supabase Client Utilities for Express Server
 *
 * Provides standalone Supabase clients that don't depend on Next.js.
 * Supports both cookie-based auth (web) and Bearer token auth (mobile).
 */

import { createServerClient } from "@supabase/ssr"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Request } from "express"

/**
 * Parse cookies from the Cookie header string
 */
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {}
  return Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...v] = c.trim().split("=")
      return [key, v.join("=")]
    })
  )
}

/**
 * Creates an admin Supabase client that bypasses RLS
 * Use with caution - this has full database access
 */
export function createAdminClient(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * Creates a Supabase client authenticated with a Bearer token
 * Used to verify user identity and fetch their profile
 */
export function createAuthenticatedClient(accessToken: string): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * Creates a Supabase client from cookies (for web browser requests)
 * Uses @supabase/ssr for proper cookie handling
 */
function createCookieClient(cookies: Record<string, string>) {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(cookies).map(([name, value]) => ({
            name,
            value,
          }))
        },
        setAll() {
          // Express doesn't need to set cookies in this context
        },
      },
    }
  )
}

/**
 * Session user type matching the auth package
 */
export interface SessionUser {
  id: string
  email: string
  name: string
  phone: string
  companyName?: string | null
  industryType?: string
}

/**
 * Authenticate a request using cookies first (web), then Bearer token (mobile)
 * This mirrors the Next.js API route authentication approach
 */
export async function authenticateRequest(
  req: Request
): Promise<SessionUser | null> {
  // 1. Try cookie-based auth first (web browsers)
  const cookieHeader = req.headers.cookie
  if (cookieHeader) {
    console.log("[Auth] Trying cookie-based auth...")
    const cookies = parseCookies(cookieHeader)

    // Check if we have Supabase auth cookies
    const hasSupabaseCookies = Object.keys(cookies).some((name) =>
      name.startsWith("sb-") && name.includes("-auth-token")
    )

    if (hasSupabaseCookies) {
      console.log("[Auth] Found Supabase auth cookies, attempting auth...")
      const supabase = createCookieClient(cookies)

      const { data: { user }, error } = await supabase.auth.getUser()

      if (user && !error) {
        console.log("[Auth] Cookie auth successful, user:", user.id)

        // Fetch profile data
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("name, phone, company_name, industry_type")
          .eq("id", user.id)
          .single()

        if (profileError) {
          console.log("[Auth] Profile fetch failed:", profileError.message)
          return null
        }

        return {
          id: user.id,
          email: user.email || "",
          name: profile?.name || user.user_metadata?.name || "",
          phone: profile?.phone || user.user_metadata?.phone || "",
          companyName: profile?.company_name,
          industryType: profile?.industry_type,
        }
      } else {
        console.log("[Auth] Cookie auth failed:", error?.message || "no user")
      }
    }
  }

  // 2. Fall back to Bearer token auth (mobile apps)
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith("Bearer ")) {
    console.log("[Auth] Trying Bearer token auth...")
    const token = authHeader.slice(7)
    const supabase = createAuthenticatedClient(token)

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.log("[Auth] getUser failed:", error?.message || "no user")
      return null
    }

    console.log("[Auth] Bearer auth successful, user:", user.id)

    // Fetch profile data
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("name, phone, company_name, industry_type")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.log("[Auth] Profile fetch failed:", profileError.message)
      return null
    }

    return {
      id: user.id,
      email: user.email || "",
      name: profile?.name || user.user_metadata?.name || "",
      phone: profile?.phone || user.user_metadata?.phone || "",
      companyName: profile?.company_name,
      industryType: profile?.industry_type,
    }
  }

  console.log("[Auth] No valid authentication method found")
  return null
}
