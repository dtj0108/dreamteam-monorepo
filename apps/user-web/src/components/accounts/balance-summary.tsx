"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet } from "lucide-react"
import type { BalanceSummary as BalanceSummaryType } from "@/lib/types"

interface BalanceSummaryProps {
  summary: BalanceSummaryType
  currency?: string
}

export function BalanceSummary({ summary, currency = 'USD' }: BalanceSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${summary.totalBalance < 0 ? 'text-rose-600' : ''}`}>
            {formatCurrency(summary.totalBalance)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total across all accounts
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(summary.totalAssets)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Cash, savings & investments
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
          <TrendingDown className="h-4 w-4 text-rose-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-rose-600">
            {formatCurrency(summary.totalLiabilities)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Credit cards & loans
          </p>
        </CardContent>
      </Card>
    </div>
  )
}


