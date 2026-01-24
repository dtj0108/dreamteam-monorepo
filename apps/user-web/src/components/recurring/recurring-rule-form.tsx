"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { useWorkspace } from "@/providers/workspace-provider"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { getSupabaseClient } from "@/lib/supabase"
import type {
  Account,
  RecurringRule,
  RecurringFrequency,
  CreateRecurringRuleInput,
  FREQUENCY_LABELS
} from "@/lib/types"

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 Weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

interface RecurringRuleFormProps {
  rule?: RecurringRule
  onSuccess?: () => void
  onCancel?: () => void
}

export function RecurringRuleForm({ rule, onSuccess, onCancel }: RecurringRuleFormProps) {
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>(
    rule ? (rule.amount > 0 ? 'income' : 'expense') : 'expense'
  )

  const [formData, setFormData] = useState<CreateRecurringRuleInput>({
    account_id: rule?.account_id || '',
    category_id: rule?.category_id || undefined,
    amount: rule ? Math.abs(rule.amount) : 0,
    description: rule?.description || '',
    frequency: rule?.frequency || 'monthly',
    next_date: rule?.next_date || format(new Date(), 'yyyy-MM-dd'),
    end_date: rule?.end_date || undefined,
  })

  const [nextDate, setNextDate] = useState<Date>(
    rule ? new Date(rule.next_date) : new Date()
  )

  const [endDate, setEndDate] = useState<Date | undefined>(
    rule?.end_date ? new Date(rule.end_date) : undefined
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
      const supabase = getSupabaseClient()
      const actualAmount = transactionType === 'expense'
        ? -Math.abs(formData.amount)
        : Math.abs(formData.amount)

      const payload = {
        account_id: formData.account_id,
        category_id: formData.category_id,
        amount: actualAmount,
        description: formData.description,
        frequency: formData.frequency,
        next_date: format(nextDate, 'yyyy-MM-dd'),
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
      }

      if (rule) {
        const { error } = await supabase
          .from('recurring_rules')
          .update(payload)
          .eq('id', rule.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('recurring_rules')
          .insert(payload)
        if (error) throw error
      }

      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recurring rule')
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

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="e.g., Rent payment, Monthly salary"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

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

        {/* Frequency */}
        <div className="space-y-2">
          <Label>Frequency</Label>
          <Select
            value={formData.frequency}
            onValueChange={(value: RecurringFrequency) => setFormData({ ...formData, frequency: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map((freq) => (
                <SelectItem key={freq.value} value={freq.value}>
                  {freq.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Account */}
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

      {/* Category */}
      <div className="space-y-2">
        <Label>Category</Label>
        <CategoryPicker
          value={formData.category_id}
          onChange={(categoryId) => setFormData({ ...formData, category_id: categoryId })}
          type={transactionType}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Next Date */}
        <div className="space-y-2">
          <Label>Next Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !nextDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {nextDate ? format(nextDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={nextDate}
                onSelect={(d) => d && setNextDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date (optional) */}
        <div className="space-y-2">
          <Label>End Date (optional)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : "No end date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : (rule ? 'Save Changes' : 'Create Rule')}
        </Button>
      </div>
    </form>
  )
}


