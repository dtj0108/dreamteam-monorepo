"use client"

import { useEffect, useState } from "react"
import { WorkspaceHome, type StatItem, type GettingStartedItem, type ShortcutItem } from "@/components/workspace"
import {
  Flag,
  TrendingUp,
  Target,
  DollarSign,
  Trophy,
  Percent,
  BarChart3,
} from "lucide-react"

interface Goal {
  id: string
  type: "revenue" | "profit" | "valuation" | "runway" | "revenue_multiple"
  name: string
  target_amount: number
  current_amount: number
  progress: number
  is_achieved: boolean
  start_date: string
  end_date: string
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/goals")
      .then(res => res.json())
      .then(data => {
        setGoals(data.goals || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Calculate stats
  const activeGoals = goals.length
  const onTrackGoals = goals.filter(g => g.progress >= 50 || g.is_achieved)
  const revenueGoal = goals.find(g => g.type === "revenue")
  const profitGoal = goals.find(g => g.type === "profit")
  const exitGoal = goals.find(g => g.type === "valuation" || g.type === "revenue_multiple")

  const stats: StatItem[] = [
    { title: "Active Goals", value: activeGoals, icon: Flag, href: "/goals/revenue" },
    { title: "On Track", value: `${onTrackGoals.length}/${activeGoals}`, icon: Trophy },
    { title: "Revenue Progress", value: revenueGoal ? formatPercent(revenueGoal.progress) : "N/A", icon: TrendingUp, href: "/goals/revenue" },
    { title: "Profit Progress", value: profitGoal ? formatPercent(profitGoal.progress) : "N/A", icon: Percent, href: "/goals/profit" },
  ]

  const gettingStarted: GettingStartedItem[] = [
    { id: "revenue", label: "Set a revenue goal", href: "/goals/revenue", icon: TrendingUp, isComplete: !!revenueGoal },
    { id: "profit", label: "Set a profit goal", href: "/goals/profit", icon: Target, isComplete: !!profitGoal },
    { id: "exit", label: "Create exit planning goals", href: "/goals/exit", icon: DollarSign, isComplete: !!exitGoal },
  ]

  const shortcuts: ShortcutItem[] = [
    {
      title: "Revenue Goals",
      description: "Track revenue targets and growth",
      href: "/goals/revenue",
      icon: TrendingUp,
      badge: revenueGoal ? formatPercent(revenueGoal.progress) : undefined,
    },
    {
      title: "Profit Goals",
      description: "Monitor profit margins and targets",
      href: "/goals/profit",
      icon: Target,
      badge: profitGoal ? formatPercent(profitGoal.progress) : undefined,
    },
    {
      title: "Exit Planning",
      description: "Plan your business exit strategy",
      href: "/goals/exit",
      icon: DollarSign,
    },
    {
      title: "Analytics",
      description: "View financial analytics and trends",
      href: "/analytics",
      icon: BarChart3,
    },
  ]

  return (
    <WorkspaceHome
      title="Goals"
      description="Set and track revenue, profit, and exit planning goals for your business"
      icon={Flag}
      iconColor="amber"
      stats={stats}
      gettingStartedItems={gettingStarted}
      shortcuts={shortcuts}
      isLoading={loading}
    />
  )
}
