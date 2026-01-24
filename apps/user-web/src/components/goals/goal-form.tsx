"use client"

import { useState } from "react"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

interface Goal {
  id?: string
  type: 'revenue' | 'profit' | 'valuation' | 'runway' | 'revenue_multiple'
  name: string
  target_amount: number
  current_amount?: number
  start_date: string
  end_date: string
  notes?: string
}

interface GoalFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: Goal | null
  onSubmit: (goal: Omit<Goal, 'id'>) => Promise<void>
}

const GOAL_TYPES = [
  { value: 'revenue', label: 'Revenue Goal', description: 'Track total income' },
  { value: 'profit', label: 'Profit Goal', description: 'Track net profit' },
  { value: 'valuation', label: 'Valuation Target', description: 'Company valuation goal' },
  { value: 'runway', label: 'Runway Goal', description: 'Cash reserves target' },
  { value: 'revenue_multiple', label: 'Revenue Multiple', description: 'Exit multiple target' },
]

export function GoalForm({ open, onOpenChange, goal, onSubmit }: GoalFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<Omit<Goal, 'id'>>({
    type: goal?.type || 'revenue',
    name: goal?.name || '',
    target_amount: goal?.target_amount || 0,
    current_amount: goal?.current_amount || 0,
    start_date: goal?.start_date || format(new Date(), 'yyyy-MM-dd'),
    end_date: goal?.end_date || format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM-dd'),
    notes: goal?.notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await onSubmit(formData)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save goal')
    } finally {
      setLoading(false)
    }
  }

  const isManualGoal = formData.type === 'valuation'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{goal ? 'Edit Goal' : 'Create Goal'}</DialogTitle>
          <DialogDescription>
            {goal ? 'Update your goal details.' : 'Set a new business goal to track.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Goal Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Goal Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: Goal['type']) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select goal type" />
              </SelectTrigger>
              <SelectContent>
                {GOAL_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Goal Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Goal Name</Label>
            <Input
              id="name"
              placeholder="e.g., Q1 2025 Revenue Target"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* Target Amount */}
          <div className="space-y-2">
            <Label htmlFor="target_amount">
              {formData.type === 'revenue_multiple' ? 'Target Multiple' : 'Target Amount'}
            </Label>
            <div className="relative">
              {formData.type !== 'revenue_multiple' && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              )}
              <Input
                id="target_amount"
                type="number"
                min="0"
                step={formData.type === 'revenue_multiple' ? '0.1' : '1'}
                className={formData.type !== 'revenue_multiple' ? 'pl-7' : ''}
                placeholder={formData.type === 'revenue_multiple' ? 'e.g., 10' : 'e.g., 100000'}
                value={formData.target_amount || ''}
                onChange={(e) => setFormData({ ...formData, target_amount: parseFloat(e.target.value) || 0 })}
                required
              />
              {formData.type === 'revenue_multiple' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">x</span>
              )}
            </div>
          </div>

          {/* Current Amount (for manual goals) */}
          {isManualGoal && (
            <div className="space-y-2">
              <Label htmlFor="current_amount">Current Value</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="current_amount"
                  type="number"
                  min="0"
                  step="1"
                  className="pl-7"
                  placeholder="e.g., 5000000"
                  value={formData.current_amount || ''}
                  onChange={(e) => setFormData({ ...formData, current_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Update this manually as your valuation changes
              </p>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.start_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date ? format(new Date(formData.start_date), "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.start_date ? new Date(formData.start_date) : undefined}
                    onSelect={(date) => date && setFormData({ ...formData, start_date: format(date, 'yyyy-MM-dd') })}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.end_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.end_date ? format(new Date(formData.end_date), "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.end_date ? new Date(formData.end_date) : undefined}
                    onSelect={(date) => date && setFormData({ ...formData, end_date: format(date, 'yyyy-MM-dd') })}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional details about this goal..."
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (goal ? 'Save Changes' : 'Create Goal')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

