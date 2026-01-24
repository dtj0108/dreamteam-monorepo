"use client"

import { useState, useCallback, useEffect } from 'react'
import { usePlaidLink, PlaidLinkOnSuccessMetadata } from 'react-plaid-link'
import { Button } from '@/components/ui/button'
import { Loader2, Link as LinkIcon, RefreshCw } from 'lucide-react'

interface PlaidLinkButtonProps {
  onSuccess?: (accounts: unknown[]) => void
  onExit?: () => void
  accessToken?: string // For update mode
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function PlaidLinkButton({
  onSuccess,
  onExit,
  accessToken,
  variant = 'default',
  size = 'default',
  className,
}: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [exchanging, setExchanging] = useState(false)

  const fetchLinkToken = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/plaid/link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      })
      const data = await res.json()
      if (data.linkToken) {
        setLinkToken(data.linkToken)
      } else if (data.error) {
        console.error('Link token error:', data.error)
      }
    } catch (error) {
      console.error('Failed to get link token:', error)
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  const onPlaidSuccess = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      setExchanging(true)
      try {
        const res = await fetch('/api/plaid/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicToken,
            institutionId: metadata.institution?.institution_id,
            institutionName: metadata.institution?.name,
          }),
        })
        const data = await res.json()
        if (data.success) {
          onSuccess?.(data.accounts || [])
        } else {
          console.error('Exchange failed:', data.error)
        }
      } catch (error) {
        console.error('Failed to exchange token:', error)
      } finally {
        setExchanging(false)
        setLinkToken(null) // Reset link token after use
      }
    },
    [onSuccess]
  )

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: () => {
      onExit?.()
      setLinkToken(null) // Reset link token on exit
    },
  })

  // Auto-open when link token is fetched and ready
  useEffect(() => {
    if (linkToken && ready) {
      open()
    }
  }, [linkToken, ready, open])

  const handleClick = async () => {
    if (!linkToken) {
      await fetchLinkToken()
    } else if (ready) {
      open()
    }
  }

  const isLoading = loading || exchanging
  const isUpdate = !!accessToken

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : isUpdate ? (
        <RefreshCw className="mr-2 h-4 w-4" />
      ) : (
        <LinkIcon className="mr-2 h-4 w-4" />
      )}
      {isLoading
        ? exchanging
          ? 'Connecting...'
          : 'Loading...'
        : isUpdate
          ? 'Fix Connection'
          : 'Connect Bank'}
    </Button>
  )
}
