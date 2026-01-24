'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, MessageSquare, Phone, TrendingUp, Activity, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CreditsBalanceCardProps {
  type: 'sms' | 'minutes'
  balance: number
  lifetimeUsed: number
  lifetimeTotal: number
  isLow: boolean
  onTopUp?: () => void
  className?: string
}

function getProgressColor(percentRemaining: number): string {
  if (percentRemaining > 50) return 'bg-emerald-500'
  if (percentRemaining > 20) return 'bg-amber-500'
  return 'bg-red-500'
}

function getProgressBgColor(percentRemaining: number): string {
  if (percentRemaining > 50) return 'bg-emerald-100'
  if (percentRemaining > 20) return 'bg-amber-100'
  return 'bg-red-100'
}

export function CreditsBalanceCard({
  type,
  balance,
  lifetimeUsed,
  lifetimeTotal,
  isLow,
  onTopUp,
  className,
}: CreditsBalanceCardProps) {
  const Icon = type === 'sms' ? MessageSquare : Phone
  const title = type === 'sms' ? 'SMS Credits' : 'Call Minutes'
  const unit = type === 'sms' ? 'credits' : 'minutes'

  // Calculate percentage of lifetime credits remaining
  const percentRemaining = lifetimeTotal > 0
    ? Math.round((balance / lifetimeTotal) * 100)
    : 0

  // Calculate usage percentage
  const usagePercent = lifetimeTotal > 0
    ? Math.round((lifetimeUsed / lifetimeTotal) * 100)
    : 0

  // Determine if balance is critical (< 20%)
  const isCritical = percentRemaining < 20 && lifetimeTotal > 0

  const progressColor = getProgressColor(percentRemaining)
  const progressBgColor = getProgressBgColor(percentRemaining)

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {isLow && (
        <div className={cn(
          'absolute top-0 left-0 right-0 h-1.5',
          isCritical ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
        )} />
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2.5 rounded-lg',
              isLow ? (isCritical ? 'bg-red-50' : 'bg-amber-50') : 'bg-sky-50'
            )}>
              <Icon className={cn(
                'h-5 w-5',
                isLow ? (isCritical ? 'text-red-600' : 'text-amber-600') : 'text-sky-600'
              )} />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>Current balance</CardDescription>
            </div>
          </div>
          {isLow && (
            <Badge
              variant="outline"
              className={cn(
                isCritical
                  ? 'text-red-600 border-red-300 bg-red-50'
                  : 'text-amber-600 border-amber-300 bg-amber-50'
              )}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              {isCritical ? 'Critical' : 'Low Balance'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">
                {balance.toLocaleString()}
              </span>
              <span className="text-muted-foreground">{unit}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining</span>
              <span className={cn(
                'font-medium',
                isCritical && 'text-red-600',
                !isCritical && isLow && 'text-amber-600'
              )}>
                {percentRemaining}%
              </span>
            </div>
            <div className={cn('h-2 rounded-full overflow-hidden', progressBgColor)}>
              <div
                className={cn('h-full rounded-full transition-all duration-500', progressColor)}
                style={{ width: `${Math.min(percentRemaining, 100)}%` }}
              />
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded bg-emerald-100">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">Lifetime Purchased</div>
                <div className="text-lg font-semibold">{lifetimeTotal.toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded bg-blue-100">
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">Total Used</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold">{lifetimeUsed.toLocaleString()}</span>
                  {lifetimeTotal > 0 && (
                    <span className="text-sm text-muted-foreground">({usagePercent}%)</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {isLow && onTopUp && (
            <Button
              size="sm"
              variant={isCritical ? 'default' : 'outline'}
              className={cn(
                'w-full',
                isCritical && 'bg-red-600 hover:bg-red-700'
              )}
              onClick={onTopUp}
            >
              <Zap className="h-4 w-4 mr-2" />
              Top Up Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
