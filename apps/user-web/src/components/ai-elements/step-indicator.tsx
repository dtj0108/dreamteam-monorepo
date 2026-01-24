"use client"

interface StepIndicatorProps {
  step: number
  total: number
  action: string
}

export function StepIndicator({ step, total, action }: StepIndicatorProps) {
  return (
    <div className="my-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="font-medium">Step {step}/{total}</span>
      <span>·</span>
      <span>{action}</span>
    </div>
  )
}
