import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { getRevenueTimeSeries, getRevenue } from '@/lib/stripe-analytics'

/**
 * GET /api/admin/billing/revenue
 * Get revenue time series data for charts
 */
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const period = searchParams.get('period') || '30d'

  try {
    // Parse period
    let days = 30
    switch (period) {
      case '7d':
        days = 7
        break
      case '30d':
        days = 30
        break
      case '90d':
        days = 90
        break
      case '1y':
        days = 365
        break
    }

    const [timeSeries, totalRevenue] = await Promise.all([
      getRevenueTimeSeries(days),
      getRevenue(new Date(Date.now() - days * 24 * 60 * 60 * 1000)),
    ])

    // Calculate summary stats
    const summary = {
      total: totalRevenue,
      average: Math.round(totalRevenue / days),
      highest: Math.max(...timeSeries.map(d => d.revenue)),
      lowest: Math.min(...timeSeries.map(d => d.revenue)),
      invoiceCount: timeSeries.reduce((sum, d) => sum + d.invoiceCount, 0),
    }

    return NextResponse.json({
      period,
      days,
      timeSeries,
      summary,
    })
  } catch (err) {
    console.error('[billing/revenue] Error fetching revenue data:', err)
    return NextResponse.json(
      { error: 'Failed to fetch revenue data' },
      { status: 500 }
    )
  }
}
