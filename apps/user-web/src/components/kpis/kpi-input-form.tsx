"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Save } from "lucide-react"
import type { IndustryType, KPIInput, CreateKPIInputInput } from "@/lib/types"

interface KPIInputFormProps {
  industryType: IndustryType
  period: { start: string; end: string; label: string }
  currentValues: KPIInput | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (values: CreateKPIInputInput) => Promise<void>
}

interface FieldConfig {
  key: keyof CreateKPIInputInput
  label: string
  type: "number" | "currency" | "percent"
  industries: IndustryType[]
}

const FIELD_CONFIGS: FieldConfig[] = [
  // SaaS fields
  { key: "customer_count", label: "Customer Count", type: "number", industries: ["saas"] },
  { key: "churned_customers", label: "Churned Customers", type: "number", industries: ["saas"] },
  { key: "customer_acquisition_cost", label: "Customer Acquisition Cost", type: "currency", industries: ["saas"] },
  { key: "lifetime_value", label: "Customer Lifetime Value", type: "currency", industries: ["saas"] },
  
  // Retail fields
  { key: "inventory_value", label: "Inventory Value", type: "currency", industries: ["retail"] },
  { key: "units_sold", label: "Units Sold", type: "number", industries: ["retail"] },
  
  // Service fields
  { key: "billable_hours", label: "Billable Hours", type: "number", industries: ["service"] },
  { key: "employee_count", label: "Team Size", type: "number", industries: ["service"] },
  { key: "utilization_target", label: "Utilization Target (%)", type: "percent", industries: ["service"] },
]

export function KPIInputForm({
  industryType,
  period,
  currentValues,
  open,
  onOpenChange,
  onSave,
}: KPIInputFormProps) {
  const [loading, setLoading] = useState(false)
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    FIELD_CONFIGS.forEach(field => {
      const currentVal = currentValues?.[field.key as keyof KPIInput]
      initial[field.key] = currentVal != null ? String(currentVal) : ""
    })
    return initial
  })
  
  const fields = FIELD_CONFIGS.filter(f => f.industries.includes(industryType))
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const input: CreateKPIInputInput = {
        period_start: period.start,
        period_end: period.end,
      }
      
      fields.forEach(field => {
        const val = values[field.key]
        if (val !== "") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (input as any)[field.key] = parseFloat(val)
        }
      })
      
      await onSave(input)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }
  
  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }))
  }
  
  if (industryType === "general") {
    return null // General doesn't have manual inputs
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update KPI Values</DialogTitle>
          <DialogDescription>
            Enter your metrics for {period.label}. These values help calculate your industry-specific KPIs.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {fields.map(field => (
              <div key={field.key} className="grid gap-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <div className="relative">
                  {field.type === "currency" && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                  )}
                  <Input
                    id={field.key}
                    type="number"
                    step={field.type === "percent" ? "0.1" : "1"}
                    min="0"
                    className={field.type === "currency" ? "pl-7" : ""}
                    value={values[field.key]}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.type === "currency" ? "0" : "0"}
                  />
                  {field.type === "percent" && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      %
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Values
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

