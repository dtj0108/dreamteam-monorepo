"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

interface ExitPlan {
  id?: string
  target_valuation: number | null
  current_valuation: number | null
  target_multiple: number | null
  target_runway: number | null
  target_exit_date: string | null
  notes: string | null
}

interface ExitPlanFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exitPlan: ExitPlan | null
  onSubmit: (data: Partial<ExitPlan>) => Promise<void>
}

export function ExitPlanForm({ open, onOpenChange, exitPlan, onSubmit }: ExitPlanFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    target_valuation: '',
    current_valuation: '',
    target_multiple: '5.0',
    target_runway: '',
    target_exit_date: null as Date | null,
    notes: '',
  })

  useEffect(() => {
    if (exitPlan) {
      setFormData({
        target_valuation: exitPlan.target_valuation?.toString() || '',
        current_valuation: exitPlan.current_valuation?.toString() || '',
        target_multiple: exitPlan.target_multiple?.toString() || '5.0',
        target_runway: exitPlan.target_runway?.toString() || '',
        target_exit_date: exitPlan.target_exit_date ? new Date(exitPlan.target_exit_date) : null,
        notes: exitPlan.notes || '',
      })
    }
  }, [exitPlan, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await onSubmit({
        target_valuation: formData.target_valuation ? parseFloat(formData.target_valuation) : null,
        current_valuation: formData.current_valuation ? parseFloat(formData.current_valuation) : null,
        target_multiple: formData.target_multiple ? parseFloat(formData.target_multiple) : null,
        target_runway: formData.target_runway ? parseFloat(formData.target_runway) : null,
        target_exit_date: formData.target_exit_date ? format(formData.target_exit_date, 'yyyy-MM-dd') : null,
        notes: formData.notes || null,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save exit plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Exit Plan</DialogTitle>
          <DialogDescription>
            Define your exit strategy and targets
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Valuation Section */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/50">
            <h3 className="font-medium text-sm">Valuation</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target_valuation">Target Valuation</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="target_valuation"
                    type="number"
                    min="0"
                    step="1000"
                    className="pl-7"
                    placeholder="10,000,000"
                    value={formData.target_valuation}
                    onChange={(e) => setFormData({ ...formData, target_valuation: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_valuation">Current Valuation</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="current_valuation"
                    type="number"
                    min="0"
                    step="1000"
                    className="pl-7"
                    placeholder="5,000,000"
                    value={formData.current_valuation}
                    onChange={(e) => setFormData({ ...formData, current_valuation: e.target.value })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Update after funding rounds or offers</p>
              </div>
            </div>
          </div>

          {/* Revenue Multiple */}
          <div className="space-y-2">
            <Label htmlFor="target_multiple">Revenue Multiple Target</Label>
            <div className="relative">
              <Input
                id="target_multiple"
                type="number"
                min="0.1"
                step="0.1"
                placeholder="5.0"
                value={formData.target_multiple}
                onChange={(e) => setFormData({ ...formData, target_multiple: e.target.value })}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">×</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your implied valuation = ARR × this multiple
            </p>
          </div>

          {/* Runway */}
          <div className="space-y-2">
            <Label htmlFor="target_runway">Target Cash Runway</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="target_runway"
                type="number"
                min="0"
                step="1000"
                className="pl-7"
                placeholder="500,000"
                value={formData.target_runway}
                onChange={(e) => setFormData({ ...formData, target_runway: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Cash reserves needed before exit
            </p>
          </div>

          {/* Target Exit Date */}
          <div className="space-y-2">
            <Label>Target Exit Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.target_exit_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.target_exit_date 
                    ? format(formData.target_exit_date, "MMMM d, yyyy") 
                    : "Select target date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.target_exit_date || undefined}
                  onSelect={(date) => setFormData({ ...formData, target_exit_date: date || null })}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Strategy Notes</Label>
            <Textarea
              id="notes"
              placeholder="Potential acquirers, exit timeline considerations, milestones needed..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Exit Plan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

