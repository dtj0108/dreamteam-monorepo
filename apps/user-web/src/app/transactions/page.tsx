"use client"

import { useEffect, useState, useMemo } from "react"
import { format } from "date-fns"
import { DashboardLayout } from "@/components/dashboard-layout"
import { TransactionDataTable } from "./data-table"
import { getColumns } from "./columns"
import { TransactionForm } from "@/components/transactions/transaction-form"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import type { TransactionWithCategory, Account, Category } from "@/lib/types"

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editTransaction, setEditTransaction] = useState<TransactionWithCategory | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<TransactionWithCategory | null>(null)

  // Filters
  const [selectedAccount, setSelectedAccount] = useState<string>("all")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: undefined,
    to: undefined,
  })

  const loadData = async () => {
    try {
      // Build query params for transactions API
      const params = new URLSearchParams()
      if (selectedAccount !== "all") params.set("accountId", selectedAccount)
      if (dateRange.from) params.set("startDate", format(dateRange.from, "yyyy-MM-dd"))
      if (dateRange.to) params.set("endDate", format(dateRange.to, "yyyy-MM-dd"))

      const [transactionsRes, accountsRes, categoriesRes] = await Promise.all([
        fetch(`/api/transactions?${params}`, { cache: "no-store" }),
        fetch("/api/accounts", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ])

      const [transactionsData, accountsData, categoriesData] = await Promise.all([
        transactionsRes.json(),
        accountsRes.json(),
        categoriesRes.json(),
      ])

      setTransactions(transactionsData.transactions || [])
      setAccounts(accountsData.accounts || [])
      setCategories(categoriesData.categories || [])
    } catch (error) {
      console.error("Failed to load transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedAccount, dateRange])

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete) return

    try {
      // Use bulk-delete endpoint for single delete
      const response = await fetch("/api/transactions/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_ids: [transactionToDelete.id] }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete transaction")
      }

      await loadData()
    } catch (error) {
      console.error("Failed to delete transaction:", error)
    } finally {
      setDeleteDialogOpen(false)
      setTransactionToDelete(null)
    }
  }

  // Bulk operations
  const handleBulkAICategorize = async (selectedTransactions: TransactionWithCategory[]) => {
    try {
      // Get descriptions for AI categorization
      const descriptions = selectedTransactions.map((t) => t.description)

      // Call AI categorization API
      const categorizeResponse = await fetch("/api/transactions/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptions }),
      })

      if (!categorizeResponse.ok) {
        const errorData = await categorizeResponse.json()
        console.error("Categorize API error:", errorData)
        throw new Error(errorData.error || "Failed to categorize transactions")
      }

      const { suggestions } = await categorizeResponse.json()

      // Build updates: pair each transaction with its suggested category
      const updates = selectedTransactions.map((t, i) => ({
        id: t.id,
        categoryId: suggestions[i]?.categoryId || null,
      }))

      // Update each transaction individually (or batch if categories differ)
      // Group by category for efficiency
      const byCategory = updates.reduce((acc, u) => {
        const key = u.categoryId || "null"
        if (!acc[key]) acc[key] = []
        acc[key].push(u.id)
        return acc
      }, {} as Record<string, string[]>)

      // Bulk update each category group
      for (const [categoryId, ids] of Object.entries(byCategory)) {
        await fetch("/api/transactions/bulk-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transaction_ids: ids,
            category_id: categoryId === "null" ? null : categoryId,
          }),
        })
      }

      await loadData()
    } catch (error) {
      console.error("Failed to bulk AI categorize:", error)
    }
  }

  const handleBulkSetCategory = async (transactionIds: string[], categoryId: string | null) => {
    try {
      const response = await fetch("/api/transactions/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_ids: transactionIds,
          category_id: categoryId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update transactions")
      }

      await loadData()
    } catch (error) {
      console.error("Failed to bulk set category:", error)
    }
  }

  const handleBulkDelete = async (transactionIds: string[]) => {
    try {
      const response = await fetch("/api/transactions/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_ids: transactionIds }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete transactions")
      }

      await loadData()
    } catch (error) {
      console.error("Failed to bulk delete:", error)
    }
  }

  // Memoize columns with action handlers
  const columns = useMemo(
    () =>
      getColumns({
        onEdit: (transaction) => setEditTransaction(transaction),
        onDelete: (transaction) => {
          setTransactionToDelete(transaction)
          setDeleteDialogOpen(true)
        },
      }),
    []
  )

  return (
    <DashboardLayout breadcrumbs={[{ label: "Transactions" }]}>
      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <TransactionDataTable
          columns={columns}
          data={transactions}
          accounts={accounts}
          categories={categories}
          selectedAccount={selectedAccount}
          dateRange={dateRange}
          onAccountChange={setSelectedAccount}
          onDateRangeChange={setDateRange}
          onAddTransaction={() => setAddDialogOpen(true)}
          onBulkAICategorize={handleBulkAICategorize}
          onBulkSetCategory={handleBulkSetCategory}
          onBulkDelete={handleBulkDelete}
        />
      )}

      {/* Add Transaction Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <TransactionForm
            onSuccess={() => {
              setAddDialogOpen(false)
              loadData()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog
        open={!!editTransaction}
        onOpenChange={(open) => !open && setEditTransaction(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          {editTransaction && (
            <TransactionForm
              transaction={editTransaction}
              onSuccess={() => {
                setEditTransaction(null)
                loadData()
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This will update
              your account balance. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTransaction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}
