"use client"

import { useState } from "react"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
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
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { BUDGET_PERIOD_LABELS } from "@/lib/types"
import type { Category, BudgetPeriod, Budget } from "@/lib/types"

interface BudgetFormProps {
  budget?: Budget & { category: Category }
  categories: Category[]
  onSuccess?: () => void
}

const ALERT_THRESHOLDS = [
  { value: 50, label: "50% - Halfway" },
  { value: 80, label: "80% - Warning" },
  { value: 100, label: "100% - Over budget" },
]

export function BudgetForm({ budget, categories, onSuccess }: BudgetFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [categoryId, setCategoryId] = useState(budget?.category_id || "")
  const [amount, setAmount] = useState(budget?.amount?.toString() || "")
  const [period, setPeriod] = useState<BudgetPeriod>(budget?.period || "monthly")
  const [startDate, setStartDate] = useState<Date>(
    budget?.start_date ? new Date(budget.start_date) : new Date()
  )
  const [rollover, setRollover] = useState(budget?.rollover || false)
  const [alertThresholds, setAlertThresholds] = useState<number[]>([50, 80, 100])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload = {
        category_id: categoryId,
        amount: parseFloat(amount),
        period,
        start_date: format(startDate, "yyyy-MM-dd"),
        rollover,
        alert_thresholds: alertThresholds,
      }

      const url = budget ? `/api/budgets/${budget.id}` : "/api/budgets"
      const method = budget ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save budget")
      }

      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save budget")
    } finally {
      setLoading(false)
    }
  }

  const toggleThreshold = (threshold: number) => {
    setAlertThresholds((prev) =>
      prev.includes(threshold)
        ? prev.filter((t) => t !== threshold)
        : [...prev, threshold]
    )
  }

  const isValid = categoryId && amount && parseFloat(amount) > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        {budget ? (
          <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: budget.category.color }}
            />
            <span>{budget.category.name}</span>
          </div>
        ) : (
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  No categories available
                </div>
              ) : (
                categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Budget Amount</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            $
          </span>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="pl-7"
          />
        </div>
      </div>

      {/* Period */}
      <div className="space-y-2">
        <Label htmlFor="period">Budget Period</Label>
        <Select value={period} onValueChange={(v) => setPeriod(v as BudgetPeriod)}>
          <SelectTrigger id="period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(BUDGET_PERIOD_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Start Date */}
      <div className="space-y-2">
        <Label>Start Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => date && setStartDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Rollover */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="rollover">Rollover unused budget</Label>
          <p className="text-sm text-muted-foreground">
            Carry over remaining budget to the next period
          </p>
        </div>
        <Switch
          id="rollover"
          checked={rollover}
          onCheckedChange={setRollover}
        />
      </div>

      {/* Alert Thresholds */}
      {!budget && (
        <div className="space-y-3">
          <Label>Alert Thresholds</Label>
          <p className="text-sm text-muted-foreground">
            Get notified when spending reaches these levels
          </p>
          <div className="space-y-2">
            {ALERT_THRESHOLDS.map((threshold) => (
              <div
                key={threshold.value}
                className="flex items-center space-x-2"
              >
                <Checkbox
                  id={`threshold-${threshold.value}`}
                  checked={alertThresholds.includes(threshold.value)}
                  onCheckedChange={() => toggleThreshold(threshold.value)}
                />
                <label
                  htmlFor={`threshold-${threshold.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {threshold.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={!isValid || loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : budget ? (
          "Update Budget"
        ) : (
          "Create Budget"
        )}
      </Button>
    </form>
  )
}

