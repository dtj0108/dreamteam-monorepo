"use client"

import { useDemoCRM } from "@/providers"
import { DemoCRMLayout } from "@/components/demo/demo-crm-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingUp, Filter } from "lucide-react"

export default function DemoOpportunitiesPage() {
  const { deals, pipelineValue } = useDemoCRM()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Group deals by stage for kanban view
  const stages = ["discovery", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]
  const stageLabels: Record<string, string> = {
    discovery: "Discovery",
    qualified: "Qualified",
    proposal: "Proposal",
    negotiation: "Negotiation",
    closed_won: "Won",
    closed_lost: "Lost",
  }
  const stageColors: Record<string, string> = {
    discovery: "#94a3b8",
    qualified: "#3b82f6",
    proposal: "#8b5cf6",
    negotiation: "#f59e0b",
    closed_won: "#10b981",
    closed_lost: "#ef4444",
  }

  const dealsByStage = stages.reduce((acc, stage) => {
    acc[stage] = deals.filter(d => d.stage === stage)
    return acc
  }, {} as Record<string, typeof deals>)

  const activeDeals = deals.filter(d => d.stage !== "closed_won" && d.stage !== "closed_lost")
  const wonDeals = deals.filter(d => d.stage === "closed_won")
  const lostDeals = deals.filter(d => d.stage === "closed_lost")

  return (
    <DemoCRMLayout breadcrumbs={[{ label: "Opportunities" }]}>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pipelineValue.totalValue)}</div>
            <p className="text-xs text-muted-foreground">{activeDeals.length} active opportunities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Weighted Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(pipelineValue.weightedValue)}</div>
            <p className="text-xs text-muted-foreground">Based on confidence</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active / Won / Lost</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeDeals.length} / {wonDeals.length} / {lostDeals.length}
            </div>
            <p className="text-xs text-muted-foreground">Opportunity breakdown</p>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageDeals = dealsByStage[stage] || []
          const stageTotal = stageDeals.reduce((sum, d) => sum + d.value, 0)

          return (
            <div key={stage} className="flex flex-col w-72 shrink-0">
              {/* Stage Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stageColors[stage] }}
                  />
                  <h3 className="font-medium text-sm">{stageLabels[stage]}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {stageDeals.length}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(stageTotal)}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 rounded-xl p-3 space-y-3 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-white/5 min-h-[200px]">
                {stageDeals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                    <p className="text-sm text-muted-foreground">No opportunities</p>
                  </div>
                ) : (
                  stageDeals.map((deal) => {
                    const expectedValue = deal.value * (deal.probability / 100)
                    return (
                      <div
                        key={deal.id}
                        className="rounded-xl p-4 bg-white/80 dark:bg-white/[0.08] border border-white/60 dark:border-white/10 shadow-sm"
                      >
                        <div className="space-y-2">
                          <div>
                            <h4 className="font-medium text-sm">{deal.name}</h4>
                            <p className="text-xs text-muted-foreground">{deal.company}</p>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold">{formatCurrency(deal.value)}</span>
                            <span className="text-xs text-muted-foreground">
                              Exp: {formatCurrency(expectedValue)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="text-emerald-600 font-medium">{deal.probability}%</span>
                            <span>confidence</span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </DemoCRMLayout>
  )
}
