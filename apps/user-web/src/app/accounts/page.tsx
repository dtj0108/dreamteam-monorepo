"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useWorkspace } from "@/providers/workspace-provider"
import { Plus, HelpCircle } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AccountCard } from "@/components/accounts/account-card"
import { BalanceSummary } from "@/components/accounts/balance-summary"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
// Using API routes instead of direct database queries for proper workspace filtering
import { getSupabaseClient } from "@/lib/supabase"
import { calculateBalanceSummary, type Account, type AccountType } from "@/lib/types"
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
import { PlaidLinkButton } from "@/components/plaid/plaid-link-button"
import { ConnectedBanks } from "@/components/plaid/connected-banks"

const ACCOUNT_TYPE_ORDER: AccountType[] = [
  'checking',
  'savings',
  'cash',
  'investment',
  'credit_card',
  'loan',
  'other',
]

export default function AccountsPage() {
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)

  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/accounts', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error('Failed to load accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Wait for workspace to be loaded before fetching
    if (workspaceLoading) return
    loadAccounts()
  }, [workspaceLoading, currentWorkspace?.id])

  const handleDelete = async () => {
    if (!accountToDelete) return

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountToDelete.id)

      if (error) throw error
      setAccounts(accounts.filter(a => a.id !== accountToDelete.id))
    } catch (error) {
      console.error('Failed to delete account:', error)
    } finally {
      setDeleteDialogOpen(false)
      setAccountToDelete(null)
    }
  }

  const handleToggleActive = async (account: Account) => {
    try {
      const supabase = getSupabaseClient()
      const newActiveState = !account.is_active
      const { error } = await supabase
        .from('accounts')
        .update({ is_active: newActiveState })
        .eq('id', account.id)

      if (error) throw error

      // Update local state
      setAccounts(accounts.map(a =>
        a.id === account.id ? { ...a, is_active: newActiveState } : a
      ))
    } catch (error) {
      console.error('Failed to toggle account active status:', error)
    }
  }

  const summary = calculateBalanceSummary(accounts)

  // Group accounts by type
  const groupedAccounts = ACCOUNT_TYPE_ORDER.reduce((acc, type) => {
    const typeAccounts = accounts.filter(a => a.type === type)
    if (typeAccounts.length > 0) {
      acc[type] = typeAccounts
    }
    return acc
  }, {} as Record<AccountType, Account[]>)

  const TYPE_LABELS: Record<AccountType, string> = {
    checking: 'Checking Accounts',
    savings: 'Savings Accounts',
    cash: 'Cash',
    investment: 'Investments',
    credit_card: 'Credit Cards',
    loan: 'Loans',
    other: 'Other Accounts',
  }

  return (
    <DashboardLayout
      breadcrumbs={[{ label: "Accounts" }]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
            <p className="text-muted-foreground">
              Manage your financial accounts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/learn/accounts">
                <HelpCircle className="mr-2 h-4 w-4" />
                Need help?
              </Link>
            </Button>
            <PlaidLinkButton
              onSuccess={loadAccounts}
              variant="outline"
            />
            <Button asChild>
              <Link href="/accounts/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Link>
            </Button>
          </div>
        </div>

        {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No accounts yet</h2>
          <p className="text-muted-foreground mb-4 max-w-sm">
            Add your first account to start tracking your finances.
          </p>
          <Button asChild>
            <Link href="/accounts/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Account
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <BalanceSummary summary={summary} />

          <ConnectedBanks onAccountsChange={loadAccounts} />

          {Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
            <div key={type}>
              <h2 className="text-lg font-semibold mb-3">
                {TYPE_LABELS[type as AccountType]}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {typeAccounts.map(account => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onToggleActive={handleToggleActive}
                    onDelete={(acc) => {
                      setAccountToDelete(acc)
                      setDeleteDialogOpen(true)
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{accountToDelete?.name}"? 
              This will also delete all transactions associated with this account.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}


