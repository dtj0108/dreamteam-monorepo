'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, Zap, Loader2 } from 'lucide-react'
import { type CreditBundle, SMS_BUNDLES, MINUTES_BUNDLES, formatAddOnPrice } from '@/types/addons'

// Threshold options for SMS credits
const SMS_THRESHOLD_OPTIONS = [
  { value: 25, label: '25 credits' },
  { value: 50, label: '50 credits' },
  { value: 100, label: '100 credits' },
  { value: 200, label: '200 credits' },
  { value: 500, label: '500 credits' },
]

// Threshold options for call minutes
const MINUTES_THRESHOLD_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 25, label: '25 minutes' },
  { value: 50, label: '50 minutes' },
  { value: 100, label: '100 minutes' },
]

interface AutoReplenishSettingsProps {
  type: 'sms' | 'minutes'
  enabled: boolean
  threshold: number
  bundle: CreditBundle | null
  hasPaymentMethod: boolean
  canManageBilling: boolean
  onUpdate: (enabled: boolean, threshold?: number, bundle?: CreditBundle) => Promise<void>
  isUpdating?: boolean
}

export function AutoReplenishSettings({
  type,
  enabled,
  threshold,
  bundle,
  hasPaymentMethod,
  canManageBilling,
  onUpdate,
  isUpdating = false,
}: AutoReplenishSettingsProps) {
  const [localEnabled, setLocalEnabled] = useState(enabled)
  const [localThreshold, setLocalThreshold] = useState(threshold)
  const [localBundle, setLocalBundle] = useState<CreditBundle>(bundle ?? 'starter')

  const thresholdOptions = type === 'sms' ? SMS_THRESHOLD_OPTIONS : MINUTES_THRESHOLD_OPTIONS
  const bundles = type === 'sms' ? SMS_BUNDLES : MINUTES_BUNDLES
  const unitLabel = type === 'sms' ? 'credits' : 'minutes'

  const handleToggle = async (checked: boolean) => {
    setLocalEnabled(checked)
    if (checked) {
      await onUpdate(true, localThreshold, localBundle)
    } else {
      await onUpdate(false)
    }
  }

  const handleThresholdChange = async (value: string) => {
    const newThreshold = parseInt(value, 10)
    setLocalThreshold(newThreshold)
    if (localEnabled) {
      await onUpdate(true, newThreshold, localBundle)
    }
  }

  const handleBundleChange = async (value: string) => {
    const newBundle = value as CreditBundle
    setLocalBundle(newBundle)
    if (localEnabled) {
      await onUpdate(true, localThreshold, newBundle)
    }
  }

  // If user doesn't have billing permission, don't show the settings
  if (!canManageBilling) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">Auto-Replenish</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch
              checked={localEnabled}
              onCheckedChange={handleToggle}
              disabled={!hasPaymentMethod || isUpdating}
            />
          </div>
        </div>
        <CardDescription>
          Automatically purchase {unitLabel} when your balance runs low
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!hasPaymentMethod ? (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">
                Payment method required
              </p>
              <p className="text-amber-600 dark:text-amber-500">
                Add a payment method to enable auto-replenish. Your card will be saved after your first purchase.
              </p>
            </div>
          </div>
        ) : localEnabled ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`${type}-threshold`}>When balance falls below</Label>
                <Select
                  value={localThreshold.toString()}
                  onValueChange={handleThresholdChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger id={`${type}-threshold`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {thresholdOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${type}-bundle`}>Automatically purchase</Label>
                <Select
                  value={localBundle}
                  onValueChange={handleBundleChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger id={`${type}-bundle`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(bundles) as CreditBundle[]).map((bundleKey) => {
                      const bundleConfig = bundles[bundleKey]
                      const amount = type === 'sms'
                        ? (bundleConfig as typeof SMS_BUNDLES.starter).credits
                        : (bundleConfig as typeof MINUTES_BUNDLES.starter).minutes
                      return (
                        <SelectItem key={bundleKey} value={bundleKey}>
                          {bundleKey.charAt(0).toUpperCase() + bundleKey.slice(1)} - {formatAddOnPrice(bundleConfig.price)} ({amount.toLocaleString()} {unitLabel})
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Your card will be charged automatically when your {unitLabel} balance drops below the threshold.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Enable auto-replenish to never run out of {unitLabel}. We&apos;ll automatically purchase more when your balance is low.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
