"use client"

import { useState, useCallback, useEffect } from 'react'
import { usePlaidLink, PlaidLinkOnSuccessMetadata } from 'react-plaid-link'
import { Button } from '@/components/ui/button'
import { Loader2, Link as LinkIcon, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { DuplicateConnectionDialog, ExistingPlaidItem } from './duplicate-connection-dialog'

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

  // Duplicate detection state
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [duplicateItem, setDuplicateItem] = useState<ExistingPlaidItem | null>(null)
  const [pendingPublicToken, setPendingPublicToken] = useState<string | null>(null)
  const [pendingMetadata, setPendingMetadata] = useState<PlaidLinkOnSuccessMetadata | null>(null)
  const [dialogLoading, setDialogLoading] = useState(false)

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

  const exchangeToken = useCallback(
    async (
      publicToken: string,
      metadata: PlaidLinkOnSuccessMetadata,
      options?: { forceNew?: boolean; replaceExisting?: string }
    ) => {
      const res = await fetch('/api/plaid/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicToken,
          institutionId: metadata.institution?.institution_id,
          institutionName: metadata.institution?.name,
          forceNew: options?.forceNew,
          replaceExisting: options?.replaceExisting,
        }),
      })
      return res.json()
    },
    []
  )

  const onPlaidSuccess = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      setExchanging(true)
      try {
        const data = await exchangeToken(publicToken, metadata)

        // Check for duplicate detection response
        if (data.duplicateDetected) {
          // Store pending data and show dialog
          setPendingPublicToken(publicToken)
          setPendingMetadata(metadata)
          setDuplicateItem(data.existingItem)
          setDuplicateDialogOpen(true)
          setExchanging(false)
          return
        }

        if (data.success) {
          const accountCount = data.accounts?.length || 0
          toast.success('Bank connected', {
            description: `Added ${accountCount} account${accountCount !== 1 ? 's' : ''} from ${metadata.institution?.name || 'the bank'}.`,
          })
          onSuccess?.(data.accounts || [])
        } else {
          console.error('Exchange failed:', data.error)
          toast.error('Connection failed', {
            description: data.error || 'Failed to connect the bank.',
          })
        }
      } catch (error) {
        console.error('Failed to exchange token:', error)
        toast.error('Connection failed', {
          description: 'An unexpected error occurred.',
        })
      } finally {
        setExchanging(false)
        setLinkToken(null) // Reset link token after use
      }
    },
    [exchangeToken, onSuccess]
  )

  const handleUpdateExisting = useCallback(async () => {
    if (!pendingPublicToken || !pendingMetadata || !duplicateItem) return

    setDialogLoading(true)
    try {
      const data = await exchangeToken(pendingPublicToken, pendingMetadata, {
        replaceExisting: duplicateItem.id,
      })

      if (data.success) {
        setDuplicateDialogOpen(false)
        toast.success('Connection updated', {
          description: `${duplicateItem.institutionName} credentials have been refreshed.`,
        })
        onSuccess?.([]) // Connection updated, no new accounts
      } else {
        console.error('Update failed:', data.error)
        toast.error('Update failed', {
          description: data.error || 'Failed to update the connection.',
        })
      }
    } catch (error) {
      console.error('Failed to update connection:', error)
      toast.error('Update failed', {
        description: 'An unexpected error occurred.',
      })
    } finally {
      setDialogLoading(false)
      clearPendingState()
    }
  }, [pendingPublicToken, pendingMetadata, duplicateItem, exchangeToken, onSuccess])

  const handleAddNew = useCallback(async () => {
    if (!pendingPublicToken || !pendingMetadata) return

    setDialogLoading(true)
    try {
      const data = await exchangeToken(pendingPublicToken, pendingMetadata, {
        forceNew: true,
      })

      if (data.success) {
        setDuplicateDialogOpen(false)
        const accountCount = data.accounts?.length || 0
        toast.success('Bank connected', {
          description: `Added ${accountCount} account${accountCount !== 1 ? 's' : ''} from ${pendingMetadata.institution?.name || 'the bank'}.`,
        })
        onSuccess?.(data.accounts || [])
      } else {
        console.error('Add new failed:', data.error)
        toast.error('Connection failed', {
          description: data.error || 'Failed to add the new connection.',
        })
      }
    } catch (error) {
      console.error('Failed to add new connection:', error)
      toast.error('Connection failed', {
        description: 'An unexpected error occurred.',
      })
    } finally {
      setDialogLoading(false)
      clearPendingState()
    }
  }, [pendingPublicToken, pendingMetadata, exchangeToken, onSuccess])

  const clearPendingState = useCallback(() => {
    setPendingPublicToken(null)
    setPendingMetadata(null)
    setDuplicateItem(null)
    setLinkToken(null)
  }, [])

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setDuplicateDialogOpen(open)
    if (!open) {
      clearPendingState()
    }
  }, [clearPendingState])

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
    <>
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

      {duplicateItem && (
        <DuplicateConnectionDialog
          open={duplicateDialogOpen}
          onOpenChange={handleDialogOpenChange}
          existingItem={duplicateItem}
          onUpdateExisting={handleUpdateExisting}
          onAddNew={handleAddNew}
          loading={dialogLoading}
        />
      )}
    </>
  )
}
