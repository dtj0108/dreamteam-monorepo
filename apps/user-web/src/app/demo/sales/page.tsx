"use client"

import { useDemoCRM, useDemoData } from "@/providers"
import { DemoCRMLayout } from "@/components/demo/demo-crm-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  ArrowRight,
  TrendingUp,
  Target,
  DollarSign,
  Users,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default function DemoSalesDashboardPage() {
  const { leads, deals, pipelineValue, recentActivities } = useDemoCRM()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return formatDistanceToNow(date, { addSuffix: true })
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call": return Phone
      case "email": return Mail
      case "meeting": return Calendar
      default: return CheckCircle2
    }
  }

  // Calculate stats
  const newLeadsThisWeek = leads.filter(l => {
    const created = new Date(l.createdAt)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return created >= weekAgo
  }).length

  const qualifiedLeads = leads.filter(l => l.stage === "qualified" || l.stage === "proposal").length
  const wonDeals = deals.filter(d => d.stage === "closed_won")
  const wonValue = wonDeals.reduce((sum, d) => sum + d.value, 0)

  return (
    <DemoCRMLayout breadcrumbs={[{ label: "Dashboard" }]}>
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pipelineValue.totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              {pipelineValue.dealCount} active deals
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weighted Pipeline</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(pipelineValue.weightedValue)}</div>
            <p className="text-xs text-muted-foreground">
              Based on deal probability
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualified Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qualifiedLeads}</div>
            <p className="text-xs text-muted-foreground">
              {newLeadsThisWeek} new this week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Won This Month</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(wonValue)}</div>
            <p className="text-xs text-muted-foreground">
              {wonDeals.length} deal{wonDeals.length !== 1 ? 's' : ''} closed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
        {/* Top Deals */}
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active Deals</CardTitle>
              <CardDescription>Your top opportunities in the pipeline</CardDescription>
            </div>
            <Link href="/demo/sales/opportunities">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deals
                .filter(d => d.stage !== "closed_won" && d.stage !== "closed_lost")
                .slice(0, 5)
                .map((deal) => (
                  <div key={deal.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{deal.name}</p>
                        <p className="text-xs text-muted-foreground">{deal.company}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(deal.value)}</p>
                      <Badge variant="outline" className="text-xs">
                        {deal.probability}% likely
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-12 lg:col-span-5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest sales activities</CardDescription>
            </div>
            <Link href="/demo/sales/activities">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.slice(0, 6).map((activity) => {
                const Icon = getActivityIcon(activity.type)
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      activity.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {activity.completed ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.contactName} • {formatDate(activity.date)}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 capitalize">
                      {activity.type}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hot Leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Hot Leads</CardTitle>
            <CardDescription>High-scoring leads ready for follow-up</CardDescription>
          </div>
          <Link href="/demo/sales/leads">
            <Button variant="ghost" size="sm">
              View all leads
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {leads
              .filter(l => l.score >= 75 && l.stage !== "won" && l.stage !== "lost")
              .slice(0, 6)
              .map((lead) => (
                <div key={lead.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                        {lead.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.company}</p>
                      </div>
                    </div>
                    <Badge className={
                      lead.score >= 85 ? 'bg-emerald-500' : 
                      lead.score >= 75 ? 'bg-amber-500' : 'bg-gray-500'
                    }>
                      {lead.score}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{formatCurrency(lead.value)}</span>
                    <span className="text-xs capitalize text-muted-foreground">{lead.stage}</span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </DemoCRMLayout>
  )
}

