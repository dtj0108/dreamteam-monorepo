"use client"

import { useState } from "react"
import { Sparkles, Tag, Trash2, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AIProcessingOverlay } from "./ai-processing-overlay"
import type { TransactionWithCategory, Category } from "@/lib/types"

interface BulkActionBarProps {
  selectedTransactions: TransactionWithCategory[]
  categories: Category[]
  onClearSelection: () => void
  onAICategorize: () => Promise<void>
  onSetCategory: (categoryId: string | null) => Promise<void>
  onDelete: () => Promise<void>
  onOpenCategoryPicker: () => void
}

export function BulkActionBar({
  selectedTransactions,
  onClearSelection,
  onAICategorize,
  onDelete,
  onOpenCategoryPicker,
}: BulkActionBarProps) {
  const [aiLoading, setAiLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const count = selectedTransactions.length

  if (count === 0) return null

  const handleAICategorize = async () => {
    setAiLoading(true)
    try {
      await onAICategorize()
    } finally {
      setAiLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      await onDelete()
      setShowDeleteConfirm(false)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-2 rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg px-4 py-3">
          {/* Selection count */}
          <div className="flex items-center gap-2 pr-4 border-r">
            <span className="text-sm font-medium">
              {count} selected
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAICategorize}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              AI Categorize
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onOpenCategoryPicker}
            >
              <Tag className="h-4 w-4 mr-2" />
              Set Category
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* AI Processing Overlay */}
      <AIProcessingOverlay
        isOpen={aiLoading}
        transactionCount={count}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {count} transaction{count !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected
              transaction{count !== 1 ? 's' : ''} from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

