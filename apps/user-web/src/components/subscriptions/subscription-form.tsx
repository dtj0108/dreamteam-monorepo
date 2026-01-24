"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { format } from "date-fns"
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
import { cn } from "@/lib/utils"
import { getCategories } from "@/lib/queries"
import type {
  Category,
  SubscriptionWithCategory,
  CreateSubscriptionInput,
  RecurringFrequency,
} from "@/lib/types"
import { FREQUENCY_LABELS } from "@/lib/types"

interface SubscriptionFormProps {
  subscription?: SubscriptionWithCategory
  onSuccess: () => void
  onCancel: () => void
}

interface FormData {
  name: string
  merchant_pattern: string
  amount: string
  frequency: RecurringFrequency
  next_renewal_date: string
  category_id: string
  reminder_days_before: string
  notes: string
}

export function SubscriptionForm({
  subscription,
  onSuccess,
  onCancel,
}: SubscriptionFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    subscription?.next_renewal_date
      ? new Date(subscription.next_renewal_date)
      : undefined
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: subscription?.name || "",
      merchant_pattern: subscription?.merchant_pattern || "",
      amount: subscription?.amount ? Math.abs(subscription.amount).toString() : "",
      frequency: subscription?.frequency || "monthly",
      next_renewal_date: subscription?.next_renewal_date || "",
      category_id: subscription?.category_id || "",
      reminder_days_before: subscription?.reminder_days_before?.toString() || "3",
      notes: subscription?.notes || "",
    },
  })

  const frequency = watch("frequency")

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategories()
        // Only expense categories for subscriptions
        setCategories(data.filter((c) => c.type === "expense"))
      } catch (error) {
        console.error("Failed to load categories:", error)
      }
    }
    loadCategories()
  }, [])

  useEffect(() => {
    if (selectedDate) {
      setValue("next_renewal_date", format(selectedDate, "yyyy-MM-dd"))
    }
  }, [selectedDate, setValue])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError(null)
    try {
      const input: CreateSubscriptionInput = {
        name: data.name,
        merchant_pattern: data.merchant_pattern || data.name.toLowerCase(),
        amount: -Math.abs(parseFloat(data.amount)), // Subscriptions are expenses (negative)
        frequency: data.frequency,
        next_renewal_date: data.next_renewal_date,
        category_id: data.category_id || undefined,
        reminder_days_before: parseInt(data.reminder_days_before) || 3,
        notes: data.notes || undefined,
      }

      const url = subscription
        ? `/api/subscriptions/${subscription.id}`
        : "/api/subscriptions"
      const method = subscription ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to save subscription")
      }

      onSuccess()
    } catch (err) {
      console.error("Failed to save subscription:", err)
      setError(err instanceof Error ? err.message : "Failed to save subscription")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Subscription Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Netflix, Spotify"
            {...register("name", { required: "Name is required" })}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount *</Label>
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
              {...register("amount", {
                required: "Amount is required",
                min: { value: 0.01, message: "Amount must be greater than 0" },
              })}
            />
          </div>
          {errors.amount && (
            <p className="text-sm text-destructive">{errors.amount.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Frequency */}
        <div className="space-y-2">
          <Label>Billing Frequency *</Label>
          <Select
            value={frequency}
            onValueChange={(value) =>
              setValue("frequency", value as RecurringFrequency)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Next Renewal Date */}
        <div className="space-y-2">
          <Label>Next Renewal Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <input type="hidden" {...register("next_renewal_date", { required: "Please select a date" })} />
          {errors.next_renewal_date && (
            <p className="text-sm text-destructive">{errors.next_renewal_date.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Category */}
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={watch("category_id")}
            onValueChange={(value) => setValue("category_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Reminder Days */}
        <div className="space-y-2">
          <Label htmlFor="reminder_days_before">Remind Me Before</Label>
          <Select
            value={watch("reminder_days_before")}
            onValueChange={(value) => setValue("reminder_days_before", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select days" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 day before</SelectItem>
              <SelectItem value="3">3 days before</SelectItem>
              <SelectItem value="7">1 week before</SelectItem>
              <SelectItem value="14">2 weeks before</SelectItem>
              <SelectItem value="30">1 month before</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Merchant Pattern (Advanced) */}
      <div className="space-y-2">
        <Label htmlFor="merchant_pattern">
          Merchant Pattern{" "}
          <span className="text-muted-foreground text-xs">(for matching transactions)</span>
        </Label>
        <Input
          id="merchant_pattern"
          placeholder="e.g., netflix"
          {...register("merchant_pattern")}
        />
        <p className="text-xs text-muted-foreground">
          Leave blank to auto-generate from subscription name
        </p>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Any additional notes..."
          rows={2}
          {...register("notes")}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? "Saving..."
            : subscription
            ? "Update Subscription"
            : "Add Subscription"}
        </Button>
      </div>
    </form>
  )
}

