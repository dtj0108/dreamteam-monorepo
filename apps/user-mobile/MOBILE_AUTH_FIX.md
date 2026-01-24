# Mobile App Authentication Fix

## Problem

The mobile app sends authentication via `Authorization: Bearer <token>` header, but the Next.js server only reads authentication from cookies. This causes all API calls from the mobile app to be rejected (redirected to login page).

### Current Behavior

**Mobile App sends:**
```
GET /api/leads?workspaceId=xxx
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Server does:**
```typescript
// packages/database/src/server.ts
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()  // ❌ Only reads cookies, ignores Authorization header
      }
    }
  })
}
```

**Result:** Server doesn't find session cookies → redirects to login page → returns HTML instead of JSON.

---

## Solution

Modify the server's Supabase client creation to also accept Bearer tokens from the `Authorization` header. This allows both:
- **Web app**: Uses cookies (existing behavior)
- **Mobile app**: Uses Bearer token in header

### Option 1: Create a Hybrid Server Client (Recommended)

Create a new function that checks for Bearer token first, falls back to cookies.

**File: `packages/database/src/server.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'

/**
 * Creates a Supabase client that works with both:
 * - Cookie-based auth (web app)
 * - Bearer token auth (mobile app)
 */
export async function createServerSupabaseClient() {
  const headerStore = await headers()
  const authHeader = headerStore.get('authorization')

  // Check for Bearer token (mobile app)
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)

    // Create a client with the provided access token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    return supabase
  }

  // Fall back to cookie-based auth (web app)
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore errors in Server Components
          }
        },
      },
    }
  )
}
```

### Option 2: Middleware Approach

Add middleware that converts Bearer tokens to a format the existing server client can use.

**File: `middleware.ts`**

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  // If Bearer token is present, set it as a cookie for the request
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const response = NextResponse.next()

    // The server client will read this cookie
    response.cookies.set('sb-access-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    })

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*'
}
```

---

## Testing

After implementing, test with curl:

```bash
# Get a valid token from Supabase
TOKEN="your-supabase-access-token"

# Test the leads endpoint
curl -H "Authorization: Bearer $TOKEN" \
  "https://financebro-finance.vercel.app/api/leads?workspaceId=3559717e-5e99-4381-b9c3-7011333114da"

# Should return JSON: {"leads": [...]}
# Instead of HTML login page
```

---

## Why This Happens

| Client | Auth Method | Why |
|--------|-------------|-----|
| Web (Browser) | Cookies | `@supabase/ssr` sets HTTP-only cookies after login |
| Mobile (React Native) | Bearer Token | No cookie support, uses `AsyncStorage` + header |

The `@supabase/ssr` package is designed for server-side rendering with cookies. Mobile apps can't use cookies, so they send the JWT token directly in the `Authorization` header.

---

## Security Notes

1. **Token Validation**: Supabase validates the JWT signature server-side, so accepting Bearer tokens is secure.

2. **Same Token**: The Bearer token is the same Supabase access token that would be in the cookie - just transmitted differently.

3. **RLS Still Works**: Row Level Security policies use `auth.uid()` which works with both cookie and Bearer token auth.

---

## Files to Modify

| File | Change |
|------|--------|
| `packages/database/src/server.ts` | Add Bearer token support to `createServerSupabaseClient()` |

That's it! One file change enables mobile app authentication.
