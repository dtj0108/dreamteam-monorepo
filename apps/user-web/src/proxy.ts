// Supabase SSR middleware for authentication
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that don't require authentication
const publicRoutes = [
  '/',  // Landing page is public (shows dashboard for logged-in users)
  '/login',
  '/signup',
  '/verify',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/verify-otp',
  '/api/auth/send-otp',
  '/api/auth/me',
  '/api/auth/complete-signup', // Guest checkout signup completion (pay first, sign up after)
  '/api/team/invites/check', // Allow checking for invites during signup
  '/api/twilio/voice',      // Twilio webhook endpoints (must be public)
  '/api/twilio/sms',        // Twilio SMS webhook
  '/api/twilio/recording',  // Twilio recording callback
  '/api/twilio/status',     // Twilio status callback
  '/api/plaid/webhook',     // Plaid webhook endpoint (must be public)
  '/api/nylas/webhook',     // Nylas webhook endpoint (must be public)
  '/api/og',                // Open Graph image generation (must be public)
  '/api/test',              // Test route
  '/api/make',              // Make.com integration (handles own auth via API keys)
  '/api/checkout',          // Public checkout (guest checkout for pay-first flow)
  '/api/billing/webhook',   // Stripe webhook (handles own auth via signature)
  '/api/agent-chat',        // Proxied to Railway (handles own auth)
  '/api/plans',             // Public pricing plans endpoint
  '/api/cron',              // Cron endpoints (handle own auth via CRON_SECRET)
  '/api/support',           // Support form (handles own auth, returns JSON 401)
  '/pricing',
  '/about',
  '/contact',
  '/products',
  '/demo',
  '/learn',
  '/api/contact',
]

// Routes that require 2FA to be complete (after login)
// Note: '/' is handled specially - it's public but shows dashboard content for logged-in users
const protected2FARoutes = [
  '/accounts',
  '/transactions',
  '/analytics',
  '/budgets',
  '/goals',
  '/subscriptions',
  '/kpis',
  '/team',
  '/sales',
  '/settings',
  '/account',
  '/billing',
  '/customize',
  '/notifications',
]

// Routes that don't require a workspace (user must be able to access these to create/join one)
const noWorkspaceRoutes = [
  '/workspaces/new',
  '/workspaces/join',
  '/invite',
]

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const pathname = request.nextUrl.pathname

  // Check if it's a static asset - skip proxy entirely
  const isStaticAsset = pathname.startsWith('/_next') || 
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  
  if (isStaticAsset) {
    return supabaseResponse
  }

  // Handle API requests with Bearer token (mobile app)
  if (pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      // Mobile app with Bearer token - let it through
      // The API route will validate the token with Supabase
      return NextResponse.next()
    }
  }

  // Check if it's a public route early
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Refresh session if expired - required for Server Components
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    // If there's an auth error on a public route, just continue
    if (userError && isPublicRoute) {
      return supabaseResponse
    }

    // If user is not logged in and trying to access protected route
    if (!user && !isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }

    // If user is logged in but trying to access login/signup pages
    if (user && (pathname === '/login' || pathname === '/signup')) {
      try {
        // Check if they need to complete 2FA
        const { data: profile } = await supabase
          .from('profiles')
          .select('pending_2fa')
          .eq('id', user.id)
          .single()

        if (profile?.pending_2fa) {
          // Redirect to verify page
          const url = request.nextUrl.clone()
          url.pathname = '/verify'
          return NextResponse.redirect(url)
        }
      } catch {
        // If profile query fails, redirect to home anyway
      }

      // 2FA complete or check failed, redirect to dashboard
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Check if user needs 2FA for protected routes (skip in development)
    const isDev = process.env.NODE_ENV === 'development'
    if (!isDev && user && protected2FARoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('pending_2fa, phone')
          .eq('id', user.id)
          .single()

        if (profile?.pending_2fa) {
          const url = request.nextUrl.clone()
          url.pathname = '/verify'
          // Include phone number so the verify page can send OTP
          if (profile.phone) {
            url.searchParams.set('phone', profile.phone)
            url.searchParams.set('userId', user.id)
          }
          return NextResponse.redirect(url)
        }
      } catch {
        // If profile query fails (e.g., column doesn't exist), allow access
        // This handles the case where migration hasn't been run yet
      }
    }

    // Workspace validation - skip for routes that don't require a workspace
    if (user && !noWorkspaceRoutes.some(route => pathname.startsWith(route))) {
      const currentWorkspaceId = request.cookies.get('current_workspace_id')?.value

      if (!currentWorkspaceId) {
        // Check if user has any workspaces
        const { data: memberships } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('profile_id', user.id)
          .limit(1)

        if (!memberships || memberships.length === 0) {
          // No workspaces, redirect to create one
          if (!pathname.startsWith('/workspaces')) {
            const url = request.nextUrl.clone()
            url.pathname = '/workspaces/new'
            return NextResponse.redirect(url)
          }
        } else {
          // Has workspaces but no cookie, set cookie to first workspace
          const { data: profile } = await supabase
            .from('profiles')
            .select('default_workspace_id')
            .eq('id', user.id)
            .single()

          const workspaceId = profile?.default_workspace_id || memberships[0].workspace_id

          supabaseResponse.cookies.set('current_workspace_id', workspaceId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 365,
          })
        }
      }
    }

    return supabaseResponse
  } catch (error) {
    // If proxy fails entirely, allow the request through for public routes
    // or redirect to login for protected routes
    console.error('Proxy error:', error)
    
    if (isPublicRoute) {
      return supabaseResponse
    }
    
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
