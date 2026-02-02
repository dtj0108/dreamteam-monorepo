"use client"

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertCircle, RefreshCw, Plus, Loader2 } from 'lucide-react'

export interface ExistingPlaidItem {
  id: string
  institutionName: string
  accountCount: number
  status: string
}

interface DuplicateConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingItem: ExistingPlaidItem
  onUpdateExisting: () => void
  onAddNew: () => void
  loading?: boolean
}

export function DuplicateConnectionDialog({
  open,
  onOpenChange,
  existingItem,
  onUpdateExisting,
  onAddNew,
  loading = false,
}: DuplicateConnectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!loading}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Bank Already Connected</DialogTitle>
          </div>
          <DialogDescription>
            You already have <strong>{existingItem.institutionName}</strong> connected
            {existingItem.accountCount > 0 && (
              <> with {existingItem.accountCount} account{existingItem.accountCount !== 1 ? 's' : ''}</>
            )}.
            {existingItem.status !== 'good' && (
              <span className="block mt-1 text-amber-600">
                Note: The existing connection has issues that may need attention.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            onClick={onUpdateExisting}
            disabled={loading}
            className="w-full justify-start"
            variant="outline"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            <div className="text-left">
              <div className="font-medium">Update Connection</div>
              <div className="text-xs text-muted-foreground">
                Refresh credentials for the existing connection
              </div>
            </div>
          </Button>

          <Button
            onClick={onAddNew}
            disabled={loading}
            className="w-full justify-start"
            variant="outline"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            <div className="text-left">
              <div className="font-medium">Add as New</div>
              <div className="text-xs text-muted-foreground">
                Create a separate connection (for multiple logins)
              </div>
            </div>
          </Button>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
