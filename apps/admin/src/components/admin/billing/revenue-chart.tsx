'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp } from 'lucide-react'
import { useMemo } from 'react'

interface RevenueDataPoint {
  date: string
  revenue: number
  invoiceCount: number
}

interface RevenueChartProps {
  data: RevenueDataPoint[]
  loading?: boolean
  period: string
  onPeriodChange?: (period: string) => void
}

const periods = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '1y', label: '1 Year' },
]

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDate(dateStr: string, period: string): string {
  const date = new Date(dateStr)
  if (period === '1y') {
    return date.toLocaleDateString('en-US', { month: 'short' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function RevenueChart({ data, loading, period, onPeriodChange }: RevenueChartProps) {
  const chartData = useMemo(() => {
    if (!data.length) return { bars: [], maxRevenue: 0 }

    const maxRevenue = Math.max(...data.map(d => d.revenue), 1)

    // For 1 year, aggregate by month
    if (period === '1y') {
      const monthlyData: Record<string, { revenue: number; invoiceCount: number }> = {}
      for (const point of data) {
        const monthKey = point.date.substring(0, 7) // YYYY-MM
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { revenue: 0, invoiceCount: 0 }
        }
        monthlyData[monthKey].revenue += point.revenue
        monthlyData[monthKey].invoiceCount += point.invoiceCount
      }

      const aggregated = Object.entries(monthlyData).map(([month, values]) => ({
        date: month + '-01',
        ...values,
      })).sort((a, b) => a.date.localeCompare(b.date))

      const maxMonthlyRevenue = Math.max(...aggregated.map(d => d.revenue), 1)

      return {
        bars: aggregated.map(d => ({
          ...d,
          height: (d.revenue / maxMonthlyRevenue) * 100,
        })),
        maxRevenue: maxMonthlyRevenue,
      }
    }

    return {
      bars: data.map(d => ({
        ...d,
        height: (d.revenue / maxRevenue) * 100,
      })),
      maxRevenue,
    }
  }, [data, period])

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue
          </CardTitle>
          <div className="flex gap-2">
            {periods.map((p) => (
              <Skeleton key={p.value} className="h-8 w-16" />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const total = data.reduce((sum, d) => sum + d.revenue, 0)
  const totalInvoices = data.reduce((sum, d) => sum + d.invoiceCount, 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue
          </CardTitle>
          <p className="text-2xl font-bold mt-2">{formatCurrency(total)}</p>
          <p className="text-sm text-muted-foreground">
            {totalInvoices} invoice{totalInvoices !== 1 ? 's' : ''} paid
          </p>
        </div>
        <div className="flex gap-1">
          {periods.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPeriodChange?.(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {chartData.bars.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            No revenue data for this period
          </div>
        ) : (
          <div className="h-[250px] relative">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(chartData.maxRevenue)}</span>
              <span>{formatCurrency(chartData.maxRevenue / 2)}</span>
              <span>$0</span>
            </div>

            {/* Chart area */}
            <div className="ml-16 h-full flex items-end gap-1 pb-8">
              {chartData.bars.map((bar, index) => (
                <div
                  key={bar.date}
                  className="flex-1 flex flex-col items-center group"
                >
                  {/* Tooltip */}
                  <div className="absolute -translate-y-full mb-2 bg-popover text-popover-foreground p-2 rounded shadow-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
                    <p className="font-medium">{formatDate(bar.date, period)}</p>
                    <p>{formatCurrency(bar.revenue)}</p>
                    <p className="text-muted-foreground">{bar.invoiceCount} invoices</p>
                  </div>

                  {/* Bar */}
                  <div
                    className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                    style={{ height: `${Math.max(bar.height, 2)}%` }}
                  />

                  {/* X-axis label (show fewer labels on mobile) */}
                  {(index === 0 ||
                    index === chartData.bars.length - 1 ||
                    (period !== '1y' && index % Math.ceil(chartData.bars.length / 7) === 0) ||
                    (period === '1y' && index % 2 === 0)) && (
                    <span className="text-xs text-muted-foreground mt-2 truncate max-w-full">
                      {formatDate(bar.date, period)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
