'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type CreditBundle,
  SMS_BUNDLES,
  MINUTES_BUNDLES,
  formatAddOnPrice,
} from '@/types/addons'

interface BundlesGridProps {
  type: 'sms' | 'minutes'
  onPurchase: (bundle: CreditBundle) => void
  isPurchasing: boolean
  className?: string
}

const BUNDLE_NAMES: Record<CreditBundle, string> = {
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
}

const BUNDLE_DESCRIPTIONS: Record<CreditBundle, string> = {
  starter: 'Perfect for getting started',
  growth: 'Best value for growing teams',
  pro: 'Maximum savings for high volume',
}

// Differentiated features per tier for SMS
const SMS_FEATURES: Record<CreditBundle, string[]> = {
  starter: ['500 credits', 'Great for trying out', 'Never expires'],
  growth: ['2,000 credits', 'Most popular choice', 'Priority delivery', 'Never expires'],
  pro: ['10,000 credits', 'Dedicated support', 'Bulk sending', 'Never expires'],
}

// Differentiated features per tier for Minutes
const MINUTES_FEATURES: Record<CreditBundle, string[]> = {
  starter: ['100 minutes', 'Great for trying out', 'Never expires'],
  growth: ['500 minutes', 'Most popular choice', 'HD voice quality', 'Never expires'],
  pro: ['2,000 minutes', 'Dedicated support', 'Priority routing', 'Never expires'],
}

export function BundlesGrid({
  type,
  onPurchase,
  isPurchasing,
  className,
}: BundlesGridProps) {
  const bundles = type === 'sms' ? SMS_BUNDLES : MINUTES_BUNDLES
  const unit = type === 'sms' ? 'credits' : 'minutes'
  const perUnit = type === 'sms' ? 'credit' : 'min'

  const bundleKeys: CreditBundle[] = ['starter', 'growth', 'pro']

  const features = type === 'sms' ? SMS_FEATURES : MINUTES_FEATURES

  return (
    <div className={cn('grid gap-4 md:grid-cols-3', className)}>
      {bundleKeys.map((bundle) => {
        const config = bundles[bundle]
        const isPopular = bundle === 'growth'
        const isPro = bundle === 'pro'

        // Calculate savings with proper type narrowing
        let savings: number | null = null
        let perUnitCost: number

        if (type === 'sms') {
          const smsConfig = config as typeof SMS_BUNDLES.starter
          const starterConfig = SMS_BUNDLES.starter
          perUnitCost = smsConfig.perCredit
          if (bundle !== 'starter') {
            savings = Math.round((1 - smsConfig.perCredit / starterConfig.perCredit) * 100)
          }
        } else {
          const minutesConfig = config as typeof MINUTES_BUNDLES.starter
          const starterConfig = MINUTES_BUNDLES.starter
          perUnitCost = minutesConfig.perMinute
          if (bundle !== 'starter') {
            savings = Math.round((1 - minutesConfig.perMinute / starterConfig.perMinute) * 100)
          }
        }

        const bundleFeatures = features[bundle]

        return (
          <Card
            key={bundle}
            className={cn(
              'relative flex flex-col transition-all duration-200 hover:shadow-lg hover:border-sky-300 overflow-visible',
              isPopular && 'border-sky-300 ring-2 ring-sky-200 bg-sky-50/30',
              isPro && 'bg-gradient-to-br from-slate-50 to-slate-100'
            )}
          >
            {/* Popular badge - fixed for mobile with z-index */}
            {isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <Badge className="bg-sky-500 hover:bg-sky-500 shadow-sm">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
            )}

            {/* Savings badge for Growth/Pro */}
            {savings && (
              <div className="absolute top-3 right-3">
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Save {savings}%
                </Badge>
              </div>
            )}

            <CardHeader className={cn(isPopular && 'pt-6')}>
              <CardTitle className="text-xl">{BUNDLE_NAMES[bundle]}</CardTitle>
              <CardDescription>{BUNDLE_DESCRIPTIONS[bundle]}</CardDescription>
            </CardHeader>

            <CardContent className="flex-1">
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      {formatAddOnPrice(config.price)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {formatAddOnPrice(perUnitCost)}/{perUnit}
                  </div>
                </div>

                <div className="space-y-2.5">
                  {bundleFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Check className={cn(
                        'h-4 w-4 shrink-0',
                        index === 0 ? 'text-sky-500' : 'text-emerald-500'
                      )} />
                      <span className={index === 0 ? 'font-medium' : ''}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>

            <CardFooter>
              <Button
                className={cn(
                  'w-full',
                  isPopular && 'bg-sky-600 hover:bg-sky-700'
                )}
                variant={isPopular ? 'default' : 'outline'}
                onClick={() => onPurchase(bundle)}
                disabled={isPurchasing}
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Buy ${BUNDLE_NAMES[bundle]}`
                )}
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
