"use client"

import { useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NylasConnectButtonProps {
  provider: 'google' | 'microsoft'
  onSuccess?: () => void
  onError?: (error: string) => void
  className?: string
  children?: React.ReactNode
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

// Google "G" logo - official colors
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

// Microsoft logo - 4 colored squares
function MicrosoftLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}

/**
 * Initiates Nylas OAuth flow for connecting email/calendar.
 */
async function initiateOAuth(
  provider: 'google' | 'microsoft',
  onError?: (error: string) => void
) {
  try {
    const res = await fetch('/api/nylas/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    })

    const data = await res.json()

    if (!res.ok) {
      const errorMessage = data.error || 'Failed to start authentication'
      onError?.(errorMessage)
      console.error('Nylas auth error:', errorMessage)
      return false
    }

    if (data.authUrl) {
      window.location.href = data.authUrl
      return true
    } else {
      const errorMessage = 'No auth URL returned'
      onError?.(errorMessage)
      console.error('Nylas auth error:', errorMessage)
      return false
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Connection failed'
    onError?.(errorMessage)
    console.error('Failed to connect:', error)
    return false
  }
}

/**
 * Google branded "Sign in with Google" button
 * Follows Google's brand guidelines
 */
export function GoogleSignInButton({
  onSuccess,
  onError,
  className,
}: Omit<NylasConnectButtonProps, 'provider'>) {
  const [loading, setLoading] = useState(false)

  const handleClick = useCallback(async () => {
    setLoading(true)
    await initiateOAuth('google', onError)
    setLoading(false)
  }, [onError])

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        "inline-flex items-center justify-center gap-3 px-4 py-2.5 rounded-md",
        "bg-white text-[#3c4043] font-medium text-sm",
        "border border-[#dadce0]",
        "hover:bg-[#f8f9fa] hover:border-[#d2e3fc]",
        "focus:outline-none focus:ring-2 focus:ring-[#4285f4] focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-colors duration-200",
        "shadow-sm",
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <GoogleLogo className="h-5 w-5" />
      )}
      <span>{loading ? 'Connecting...' : 'Sign in with Google'}</span>
    </button>
  )
}

/**
 * Microsoft branded "Sign in with Microsoft" button
 * Follows Microsoft's brand guidelines
 */
export function MicrosoftSignInButton({
  onSuccess,
  onError,
  className,
}: Omit<NylasConnectButtonProps, 'provider'>) {
  const [loading, setLoading] = useState(false)

  const handleClick = useCallback(async () => {
    setLoading(true)
    await initiateOAuth('microsoft', onError)
    setLoading(false)
  }, [onError])

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        "inline-flex items-center justify-center gap-3 px-4 py-2.5 rounded-md",
        "bg-white text-[#5e5e5e] font-medium text-sm",
        "border border-[#8c8c8c]",
        "hover:bg-[#f3f3f3]",
        "focus:outline-none focus:ring-2 focus:ring-[#0078d4] focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-colors duration-200",
        "shadow-sm",
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <MicrosoftLogo className="h-5 w-5" />
      )}
      <span>{loading ? 'Connecting...' : 'Sign in with Microsoft'}</span>
    </button>
  )
}

// Legacy exports for backwards compatibility
export function NylasConnectButton(props: NylasConnectButtonProps) {
  if (props.provider === 'google') {
    return <GoogleSignInButton {...props} />
  }
  return <MicrosoftSignInButton {...props} />
}

export function GoogleConnectButton(props: Omit<NylasConnectButtonProps, 'provider'>) {
  return <GoogleSignInButton {...props} />
}

export function MicrosoftConnectButton(props: Omit<NylasConnectButtonProps, 'provider'>) {
  return <MicrosoftSignInButton {...props} />
}
