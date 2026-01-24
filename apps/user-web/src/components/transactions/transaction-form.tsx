"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { useWorkspace } from "@/providers/workspace-provider"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CategoryPicker } from "@/components/categories/category-picker"
import { cn } from "@/lib/utils"
// Using API routes instead of direct database queries for proper workspace filtering
import type { Account, TransactionWithCategory, CreateTransactionInput } from "@/lib/types"

interface TransactionFormProps {
  transaction?: TransactionWithCategory
  accountId?: string
  onSuccess?: () => void
}

export function TransactionForm({ transaction, accountId, onSuccess }: TransactionFormProps) {
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>(
    transaction ? (transaction.amount > 0 ? 'income' : 'expense') : 'expense'
  )

  const [formData, setFormData] = useState<CreateTransactionInput>({
    account_id: transaction?.account_id || accountId || '',
    category_id: transaction?.category_id || undefined,
    amount: transaction ? Math.abs(transaction.amount) : 0,
    date: transaction?.date || format(new Date(), 'yyyy-MM-dd'),
    description: transaction?.description || '',
    notes: transaction?.notes || '',
  })

  const [date, setDate] = useState<Date>(
    transaction ? new Date(transaction.date) : new Date()
  )

  useEffect(() => {
    // Wait for workspace to be loaded before fetching
    if (workspaceLoading) return

    const loadAccounts = async () => {
      try {
        const res = await fetch('/api/accounts', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          const accountsList = data.accounts || []
          setAccounts(accountsList)
          // Set default account if not provided
          if (!formData.account_id && accountsList.length > 0) {
            setFormData(prev => ({ ...prev, account_id: accountsList[0].id }))
          }
        }
      } catch (error) {
        console.error('Failed to load accounts:', error)
      }
    }
    loadAccounts()
  }, [workspaceLoading, currentWorkspace?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Calculate actual amount (negative for expenses, positive for income)
      const actualAmount = transactionType === 'expense'
        ? -Math.abs(formData.amount)
        : Math.abs(formData.amount)

      const payload = {
        ...formData,
        amount: actualAmount,
        date: format(date, 'yyyy-MM-dd'),
      }

      if (transaction) {
        // Update existing transaction
        const res = await fetch(`/api/transactions/${transaction.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to update transaction')
      } else {
        // Create new transaction
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to create transaction')
      }

      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Transaction Type Toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={transactionType === 'expense' ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => setTransactionType('expense')}
        >
          Expense
        </Button>
        <Button
          type="button"
          variant={transactionType === 'income' ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => setTransactionType('income')}
        >
          Income
        </Button>
      </div>

      {/* Account Selection (only show if no accountId provided) */}
      {!accountId && (
        <div className="space-y-2">
          <Label htmlFor="account">Account</Label>
          <Select
            value={formData.account_id}
            onValueChange={(value) => setFormData({ ...formData, account_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="pl-7"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label>Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="e.g., Grocery shopping, Monthly salary"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>Category</Label>
        <CategoryPicker
          value={formData.category_id}
          onChange={(categoryId) => setFormData({ ...formData, category_id: categoryId })}
          type={transactionType}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="Add any additional details..."
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3 justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : (transaction ? 'Save Changes' : 'Add Transaction')}
        </Button>
      </div>
    </form>
  )
}


