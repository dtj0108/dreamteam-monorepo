'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Phone, ExternalLink, Hash, DollarSign, CheckCircle, PhoneCall, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { type PhoneNumberSubscription, type TwilioNumberWithBilling, formatAddOnPrice, PHONE_PRICING } from '@/types/addons'
import { cn } from '@/lib/utils'

interface PhoneBillingCardProps {
  subscription: PhoneNumberSubscription | null
  numbers: TwilioNumberWithBilling[]
  className?: string
}

function formatPhoneNumber(number: string): string {
  const cleaned = number.replace(/\D/g, '')
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return number
}

export function PhoneBillingCard({
  subscription,
  numbers,
  className,
}: PhoneBillingCardProps) {
  const hasNumbers = numbers.length > 0
  const monthlyTotal = subscription?.monthly_total_cents ?? 0
  const isActive = subscription?.status === 'active'

  return (
    <div className={cn('space-y-6', className)}>
      {/* Consolidated Summary + Pricing Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-sky-50">
                <Phone className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Phone Numbers</CardTitle>
                <CardDescription>Monthly subscription for active numbers</CardDescription>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/sales/settings/phone-numbers">
                Manage Numbers
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats with icons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/40">
              <div className="p-2 rounded-lg bg-sky-100">
                <Hash className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{subscription?.total_numbers ?? 0}</div>
                <div className="text-sm text-muted-foreground">Total Numbers</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/40">
              <div className="p-2 rounded-lg bg-emerald-100">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{formatAddOnPrice(monthlyTotal)}</div>
                <div className="text-sm text-muted-foreground">Monthly Cost</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/40">
              <div className={cn(
                'p-2 rounded-lg',
                isActive ? 'bg-emerald-100' : 'bg-slate-100'
              )}>
                <CheckCircle className={cn(
                  'h-5 w-5',
                  isActive ? 'text-emerald-600' : 'text-slate-400'
                )} />
              </div>
              <div>
                <Badge
                  variant={isActive ? 'default' : 'secondary'}
                  className={cn(
                    'mt-1',
                    isActive && 'bg-emerald-500 hover:bg-emerald-600'
                  )}
                >
                  {subscription?.status ?? 'No subscription'}
                </Badge>
                <div className="text-sm text-muted-foreground mt-1">Status</div>
              </div>
            </div>
          </div>

          {/* Inline pricing */}
          <div className="flex items-center gap-6 pt-4 border-t">
            <div className="text-sm text-muted-foreground">Pricing:</div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-normal">Local</Badge>
              <span className="font-semibold text-sm">{formatAddOnPrice(PHONE_PRICING.local)}/mo</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-normal">Toll-Free</Badge>
              <span className="font-semibold text-sm">{formatAddOnPrice(PHONE_PRICING.tollFree)}/mo</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Numbers List */}
      {hasNumbers && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Numbers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Monthly Cost</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numbers.map((number, index) => (
                  <TableRow key={number.id} className={cn(index % 2 === 1 && 'bg-muted/30')}>
                    <TableCell className="font-mono text-sm">
                      {formatPhoneNumber(number.phone_number)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {number.number_type === 'tollFree' ? 'Toll-Free' : number.number_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatAddOnPrice(number.monthly_price_cents)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={number.billing_status === 'active' ? 'default' : 'secondary'}
                        className={cn(
                          'capitalize',
                          number.billing_status === 'active' && 'bg-emerald-500 hover:bg-emerald-600'
                        )}
                      >
                        {number.billing_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Enhanced empty state */}
      {!hasNumbers && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="rounded-full bg-sky-50 w-20 h-20 mx-auto flex items-center justify-center mb-6">
              <Phone className="h-10 w-10 text-sky-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No phone numbers yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Purchase a phone number to start making calls and sending texts to your leads and contacts.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <PhoneCall className="h-4 w-4" />
                Make calls
              </div>
              <div className="hidden sm:block text-muted-foreground">•</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                Send SMS
              </div>
            </div>
            <Button asChild size="lg">
              <Link href="/sales/settings/phone-numbers">
                Get a Phone Number
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
