"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, Mail, Trash2, RefreshCw, AlertCircle } from 'lucide-react'
import { NylasConnectButton } from './nylas-connect-button'

interface NylasGrant {
  id: string
  grantId: string
  provider: 'google' | 'microsoft'
  email: string
  status: 'active' | 'error' | 'expired'
  errorCode?: string
  errorMessage?: string
  lastSyncAt?: string
  createdAt: string
}

interface ConnectedEmailAccountsProps {
  className?: string
}

/**
 * Component to display and manage connected email/calendar accounts.
 *
 * Shows:
 * - List of connected accounts with status
 * - Buttons to connect new accounts
 * - Disconnect functionality
 */
export function ConnectedEmailAccounts({ className }: ConnectedEmailAccountsProps) {
  const [grants, setGrants] = useState<NylasGrant[]>([])
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchGrants = useCallback(async () => {
    try {
      const res = await fetch('/api/nylas/grants')
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to fetch connected accounts')
        return
      }

      setGrants(data.grants || [])
      setError(null)
    } catch (err) {
      setError('Failed to load connected accounts')
      console.error('Failed to fetch grants:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGrants()
  }, [fetchGrants])

  const handleDisconnect = async (grantId: string) => {
    setDisconnecting(grantId)
    try {
      const res = await fetch(`/api/nylas/grants/${grantId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to disconnect')
      }

      // Remove from local state
      setGrants((prev) => prev.filter((g) => g.id !== grantId))
    } catch (err) {
      console.error('Failed to disconnect:', err)
      setError(err instanceof Error ? err.message : 'Failed to disconnect account')
    } finally {
      setDisconnecting(null)
    }
  }

  const getStatusBadge = (grant: NylasGrant) => {
    switch (grant.status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const getProviderIcon = (provider: string) => {
    // Using Mail icon for both for now - could use custom icons
    return <Mail className="h-5 w-5" />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email & Calendar
        </CardTitle>
        <CardDescription>
          Connect your email and calendar to sync messages and events.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Connected accounts */}
        {grants.length > 0 && (
          <div className="space-y-3">
            {grants.map((grant) => (
              <div
                key={grant.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  {getProviderIcon(grant.provider)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{grant.email}</span>
                      {getStatusBadge(grant)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {grant.provider === 'google' ? 'Google' : 'Microsoft'} •
                      Connected {formatDate(grant.createdAt)}
                    </div>
                    {grant.errorMessage && (
                      <div className="text-sm text-destructive mt-1">
                        {grant.errorMessage}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {grant.status !== 'active' && (
                    <NylasConnectButton
                      provider={grant.provider}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reconnect
                    </NylasConnectButton>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={disconnecting === grant.id}
                      >
                        {disconnecting === grant.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Account</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to disconnect {grant.email}? You can reconnect it later.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDisconnect(grant.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Connect buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          <NylasConnectButton
            provider="google"
            variant="outline"
            onSuccess={fetchGrants}
          />
          <NylasConnectButton
            provider="microsoft"
            variant="outline"
            onSuccess={fetchGrants}
          />
        </div>

        {grants.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">
            No accounts connected. Connect your Google or Microsoft account to get started.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
