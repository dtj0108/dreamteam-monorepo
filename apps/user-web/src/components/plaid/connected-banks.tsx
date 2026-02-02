"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlaidLinkButton } from './plaid-link-button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Loader2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Building2,
} from 'lucide-react'
import { toast } from 'sonner'

interface PlaidAccount {
  id: string
  name: string
  type: string
  balance: number
  last_four: string | null
  is_plaid_linked: boolean
}

interface PlaidItem {
  id: string
  plaid_item_id: string
  institution_name: string
  status: 'good' | 'error' | 'pending'
  error_code?: string
  error_message?: string
  last_successful_update?: string
  created_at: string
  accounts: PlaidAccount[]
}

interface ConnectedBanksProps {
  onAccountsChange?: () => void
}

export function ConnectedBanks({ onAccountsChange }: ConnectedBanksProps) {
  const [items, setItems] = useState<PlaidItem[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<PlaidItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/plaid/accounts')
      const data = await res.json()
      setItems(data.items || [])
    } catch (error) {
      console.error('Failed to fetch Plaid items:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const handleSync = async (itemId: string) => {
    setSyncing(itemId)
    try {
      const res = await fetch('/api/plaid/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plaidItemId: itemId }),
      })
      const data = await res.json()
      if (data.success) {
        const { added = 0, modified = 0, removed = 0, categorized = 0 } = data
        const totalChanges = added + modified + removed

        if (totalChanges > 0) {
          const parts: string[] = []
          if (added > 0) parts.push(`${added} added`)
          if (modified > 0) parts.push(`${modified} updated`)
          if (removed > 0) parts.push(`${removed} removed`)
          let message = `Sync complete - ${parts.join(', ')}`
          if (categorized > 0) {
            message += ` (${categorized} auto-categorized)`
          }
          toast.success(message)
        } else {
          toast.info('Already up to date')
        }
      } else {
        toast.error(data.error || 'Sync failed')
      }
      await fetchItems()
      onAccountsChange?.()
    } catch (error) {
      console.error('Sync failed:', error)
      toast.error('Failed to sync transactions')
    } finally {
      setSyncing(null)
    }
  }

  const handleDelete = async () => {
    if (!itemToDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/plaid/items/${itemToDelete.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setItems(items.filter((i) => i.id !== itemToDelete.id))
        onAccountsChange?.()
      }
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'good':
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            Connected
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Error
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="secondary">
            <RefreshCw className="mr-1 h-3 w-3" />
            Needs Attention
          </Badge>
        )
      default:
        return null
    }
  }

  const formatLastSync = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return null // Don't show anything if no banks connected
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-semibold">Connected Banks</CardTitle>
          <PlaidLinkButton
            onSuccess={() => {
              fetchItems()
              onAccountsChange?.()
            }}
            variant="outline"
            size="sm"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium">{item.institution_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.accounts.length} account{item.accounts.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {getStatusBadge(item.status)}
              </div>

              {item.status === 'error' && item.error_message && (
                <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
                  <p className="text-sm text-destructive">
                    {item.error_message}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  Last synced: {formatLastSync(item.last_successful_update)}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(item.id)}
                    disabled={syncing === item.id}
                  >
                    {syncing === item.id ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-3 w-3" />
                    )}
                    Sync
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setItemToDelete(item)
                      setDeleteDialogOpen(true)
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Bank</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect {itemToDelete?.institution_name}?
              Your existing accounts and transactions will be preserved, but
              automatic syncing will stop.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
