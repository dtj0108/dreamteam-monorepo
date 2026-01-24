"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { KPIGrid, KPIInputForm, KPITrendChart } from "@/components/kpis"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Settings, Building2, PenLine } from "lucide-react"
import Link from "next/link"
import type { KPIDashboardData, KPIMetric, CreateKPIInputInput, IndustryType } from "@/lib/types"
import { INDUSTRY_TYPE_LABELS } from "@/lib/types"

// Primary metrics by industry (displayed larger)
const PRIMARY_METRICS: Record<IndustryType, string[]> = {
  saas: ["mrr", "arr"],
  retail: ["revenue", "gross_margin"],
  service: ["revenue", "avg_project_value"],
  general: ["income", "net_profit"],
}

export default function KPIsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<KPIDashboardData | null>(null)
  const [inputFormOpen, setInputFormOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/kpis")
      if (!response.ok) throw new Error("Failed to fetch KPI data")
      const kpiData: KPIDashboardData = await response.json()
      setData(kpiData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load KPIs")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSaveInputs = async (values: CreateKPIInputInput) => {
    const response = await fetch("/api/kpis/inputs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })

    if (!response.ok) {
      throw new Error("Failed to save KPI inputs")
    }

    // Refresh data
    await fetchData()
  }

  const handleEditMetric = (_metric: KPIMetric) => {
    setInputFormOpen(true)
  }

  if (loading) {
    return (
      <DashboardLayout breadcrumbs={[{ label: "KPIs" }]}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout breadcrumbs={[{ label: "KPIs" }]}>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => fetchData()} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  if (!data) {
    return null
  }

  const isGeneralIndustry = data.industryType === "general"

  return (
    <DashboardLayout breadcrumbs={[{ label: "KPIs" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">KPI Dashboard</h1>
            <p className="text-muted-foreground">
              Track your key business metrics for {data.period.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{INDUSTRY_TYPE_LABELS[data.industryType]}</span>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/account">
                <Settings className="h-4 w-4 mr-2" />
                Change Industry
              </Link>
            </Button>
            {!isGeneralIndustry && (
              <Button size="sm" onClick={() => setInputFormOpen(true)}>
                <PenLine className="h-4 w-4 mr-2" />
                Update Values
              </Button>
            )}
          </div>
        </div>

        {/* Setup Prompt for General Industry */}
        {isGeneralIndustry && (
          <Card className="border-dashed border-2 border-sky-200 bg-sky-50/50">
            <CardHeader>
              <CardTitle className="text-lg">Get Industry-Specific Insights</CardTitle>
              <CardDescription>
                Set your industry type to unlock tailored KPIs and metrics for your business.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/account">
                  <Settings className="h-4 w-4 mr-2" />
                  Select Industry Type
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* KPI Grid */}
        <KPIGrid
          metrics={data.metrics}
          primaryMetrics={PRIMARY_METRICS[data.industryType]}
          onEditMetric={handleEditMetric}
        />

        {/* Revenue Trend Chart */}
        {data.trends.length > 0 && (
          <KPITrendChart
            title={data.industryType === "saas" ? "MRR Trend (6 Months)" : "Revenue Trend (6 Months)"}
            data={data.trends}
            color={data.industryType === "saas" ? "#8b5cf6" : "#0ea5e9"}
          />
        )}

        {/* Industry-Specific Tips */}
        {!isGeneralIndustry && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {data.industryType === "saas" && "SaaS Health Benchmarks"}
                {data.industryType === "retail" && "Retail Performance Tips"}
                {data.industryType === "service" && "Services Optimization"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {data.industryType === "saas" && (
                  <>
                    <div className="text-sm">
                      <p className="font-medium text-muted-foreground">Healthy Churn Rate</p>
                      <p className="text-lg font-semibold text-emerald-600">&lt; 5% monthly</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-muted-foreground">Target LTV:CAC Ratio</p>
                      <p className="text-lg font-semibold text-emerald-600">3:1 or higher</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-muted-foreground">Net Revenue Retention</p>
                      <p className="text-lg font-semibold text-emerald-600">&gt; 100%</p>
                    </div>
                  </>
                )}
                {data.industryType === "retail" && (
                  <>
                    <div className="text-sm">
                      <p className="font-medium text-muted-foreground">Healthy Gross Margin</p>
                      <p className="text-lg font-semibold text-emerald-600">30-50%</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-muted-foreground">Inventory Turnover</p>
                      <p className="text-lg font-semibold text-emerald-600">4-6x yearly</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-muted-foreground">Days Sales Inventory</p>
                      <p className="text-lg font-semibold text-emerald-600">30-60 days</p>
                    </div>
                  </>
                )}
                {data.industryType === "service" && (
                  <>
                    <div className="text-sm">
                      <p className="font-medium text-muted-foreground">Target Utilization</p>
                      <p className="text-lg font-semibold text-emerald-600">70-80%</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-muted-foreground">Revenue per Employee</p>
                      <p className="text-lg font-semibold text-emerald-600">$100K-200K/year</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-muted-foreground">Net Profit Margin</p>
                      <p className="text-lg font-semibold text-emerald-600">15-25%</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Input Form Dialog */}
      {!isGeneralIndustry && (
        <KPIInputForm
          industryType={data.industryType}
          period={data.period}
          currentValues={data.manualInputs}
          open={inputFormOpen}
          onOpenChange={setInputFormOpen}
          onSave={handleSaveInputs}
        />
      )}
    </DashboardLayout>
  )
}

