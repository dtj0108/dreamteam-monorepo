'use client'

import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare, Phone, PhoneCall } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type WorkspaceSMSCredits,
  type WorkspaceCallMinutesWithDisplay,
  type PhoneNumberSubscription,
  formatAddOnPrice,
  isSMSBalanceLow,
  isCallMinutesLow,
} from '@/types/addons'

interface AddonsOverviewProps {
  smsCredits: WorkspaceSMSCredits | null
  callMinutes: WorkspaceCallMinutesWithDisplay | null
  phoneSubscription: PhoneNumberSubscription | null
  className?: string
}

interface QuickStatCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  subtitle?: string
  isLow?: boolean
}

function QuickStatCard({ icon: Icon, label, value, subtitle, isLow }: QuickStatCardProps) {
  return (
    <Card className={cn(
      'relative overflow-hidden transition-all',
      isLow && 'ring-1 ring-amber-300 bg-amber-50/30'
    )}>
      {isLow && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
      )}
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            isLow ? 'bg-amber-100' : 'bg-sky-50'
          )}>
            <Icon className={cn(
              'h-5 w-5',
              isLow ? 'text-amber-600' : 'text-sky-600'
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-muted-foreground truncate">{label}</div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </span>
              {subtitle && (
                <span className="text-sm text-muted-foreground">{subtitle}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AddonsOverview({
  smsCredits,
  callMinutes,
  phoneSubscription,
  className,
}: AddonsOverviewProps) {
  const smsIsLow = smsCredits ? isSMSBalanceLow(smsCredits) : false
  // WorkspaceCallMinutesWithDisplay extends WorkspaceCallMinutes, so we can pass it directly
  const minutesIsLow = callMinutes ? isCallMinutesLow(callMinutes) : false

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-4', className)}>
      <QuickStatCard
        icon={MessageSquare}
        label="SMS Credits"
        value={smsCredits?.balance ?? 0}
        isLow={smsIsLow}
      />
      <QuickStatCard
        icon={Phone}
        label="Call Minutes"
        value={callMinutes?.balance_minutes ?? 0}
        isLow={minutesIsLow}
      />
      <QuickStatCard
        icon={PhoneCall}
        label="Phone Numbers"
        value={phoneSubscription?.total_numbers ?? 0}
        subtitle={phoneSubscription?.monthly_total_cents
          ? `${formatAddOnPrice(phoneSubscription.monthly_total_cents)}/mo`
          : undefined
        }
      />
    </div>
  )
}
