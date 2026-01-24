"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useWorkspace } from "@/providers/workspace-provider"
import { Plus, Pencil, ArrowLeft } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { TransactionTable } from "@/components/transactions/transaction-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { AccountForm } from "@/components/accounts/account-form"
import { TransactionForm } from "@/components/transactions/transaction-form"
// Using API routes instead of direct database queries for proper workspace filtering
import { getSupabaseClient } from "@/lib/supabase"
import type { Account, TransactionWithCategory } from "@/lib/types"
import { ACCOUNT_TYPE_LABELS } from "@/lib/types"

export default function AccountDetailPage() {
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const params = useParams()
  const router = useRouter()
  const accountId = params.id as string

  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addTransactionOpen, setAddTransactionOpen] = useState(false)
  const [editTransaction, setEditTransaction] = useState<TransactionWithCategory | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<TransactionWithCategory | null>(null)

  const loadData = async () => {
    try {
      // Fetch account and transactions via API for proper workspace filtering
      const [accountRes, transactionsRes] = await Promise.all([
        fetch(`/api/accounts`, { cache: 'no-store' }),
        fetch(`/api/transactions?account_id=${accountId}`, { cache: 'no-store' }),
      ])

      if (accountRes.ok) {
        const accountsData = await accountRes.json()
        // Find the specific account from the response
        const foundAccount = accountsData.accounts?.find((a: Account) => a.id === accountId)
        setAccount(foundAccount || null)
      }

      if (transactionsRes.ok) {
        const txData = await transactionsRes.json()
        setTransactions(txData.transactions || [])
      }
    } catch (error) {
      console.error('Failed to load account:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Wait for workspace to be loaded before fetching
    if (workspaceLoading) return
    loadData()
  }, [workspaceLoading, accountId, currentWorkspace?.id])

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete) return

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionToDelete.id)

      if (error) throw error
      await loadData() // Reload to update balance
    } catch (error) {
      console.error('Failed to delete transaction:', error)
    } finally {
      setDeleteDialogOpen(false)
      setTransactionToDelete(null)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  if (loading) {
    return (
      <DashboardLayout breadcrumbs={[{ label: "Accounts", href: "/accounts" }, { label: "Loading..." }]}>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    )
  }

  if (!account) {
    return (
      <DashboardLayout breadcrumbs={[{ label: "Accounts", href: "/accounts" }, { label: "Not Found" }]}>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Account not found</h2>
          <p className="text-muted-foreground mb-4">This account may have been deleted.</p>
          <Button asChild variant="outline">
            <Link href="/accounts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Accounts
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const isLiability = account.type === 'credit_card' || account.type === 'loan'

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Accounts", href: "/accounts" },
        { label: account.name }
      ]}
    >
      <div className="space-y-6">
        {/* Account Summary Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{account.name}</CardTitle>
                <CardDescription>
                  {ACCOUNT_TYPE_LABELS[account.type]}
                  {account.institution && ` • ${account.institution}`}
                  {account.last_four && ` ••••${account.last_four}`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={`text-3xl font-bold ${isLiability && account.balance !== 0 ? 'text-rose-600' : ''}`}>
                    {isLiability && account.balance !== 0 && '-'}
                    {formatCurrency(Math.abs(account.balance), account.currency)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Current Balance
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button onClick={() => setAddTransactionOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Transaction
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Transactions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Transactions</CardTitle>
                <CardDescription>
                  {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TransactionTable
              transactions={transactions}
              onEdit={(tx) => setEditTransaction(tx)}
              onDelete={(tx) => {
                setTransactionToDelete(tx)
                setDeleteDialogOpen(true)
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Edit Account Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
          </DialogHeader>
          <AccountForm 
            account={account} 
            onSuccess={() => {
              setEditDialogOpen(false)
              loadData()
            }} 
          />
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={addTransactionOpen} onOpenChange={setAddTransactionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <TransactionForm 
            accountId={accountId}
            onSuccess={() => {
              setAddTransactionOpen(false)
              loadData()
            }} 
          />
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={!!editTransaction} onOpenChange={(open) => !open && setEditTransaction(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          {editTransaction && (
            <TransactionForm 
              transaction={editTransaction}
              accountId={accountId}
              onSuccess={() => {
                setEditTransaction(null)
                loadData()
              }} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Transaction Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? 
              This will update your account balance. This action cannot be undone.
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


