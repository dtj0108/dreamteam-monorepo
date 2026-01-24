"use client"

import { useEffect, useState } from "react"
import { Plus, Wallet, TrendingDown, PiggyBank } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { BudgetCard } from "@/components/budgets/budget-card"
import { BudgetForm } from "@/components/budgets/budget-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getCategories } from "@/lib/queries"
import type { Category, BudgetPeriod } from "@/lib/types"

interface BudgetWithSpending {
  id: string
  profile_id: string
  category_id: string
  amount: number
  period: BudgetPeriod
  start_date: string
  rollover: boolean
  is_active: boolean
  category: Category
  spent: number
  remaining: number
  percentUsed: number
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetWithSpending[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [periodFilter, setPeriodFilter] = useState<string>("all")

  const loadData = async () => {
    try {
      const [budgetsRes, categoriesData] = await Promise.all([
        fetch("/api/budgets").then((r) => r.json()),
        getCategories(),
      ])
      setBudgets(budgetsRes.budgets || [])
      setCategories(categoriesData)
    } catch (error) {
      console.error("Failed to load budgets:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Filter budgets by period
  const filteredBudgets = periodFilter === "all"
    ? budgets
    : budgets.filter((b) => b.period === periodFilter)

  // Calculate totals
  const totalBudgeted = filteredBudgets.reduce((sum, b) => sum + b.amount, 0)
  const totalSpent = filteredBudgets.reduce((sum, b) => sum + b.spent, 0)
  const totalRemaining = filteredBudgets.reduce((sum, b) => sum + b.remaining, 0)
  const overBudgetCount = filteredBudgets.filter((b) => b.percentUsed >= 100).length

  // Categories without budgets (for the form)
  const budgetedCategoryIds = budgets.map((b) => b.category_id)
  const availableCategories = categories.filter(
    (c) => c.type === "expense" && !budgetedCategoryIds.includes(c.id)
  )

  return (
    <DashboardLayout breadcrumbs={[{ label: "Budgets" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
            <p className="text-muted-foreground">
              Track spending limits by category
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Budget
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalBudgeted)}</div>
                  <p className="text-xs text-muted-foreground">
                    across {filteredBudgets.length} budget{filteredBudgets.length !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0}% of total budget
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                  <PiggyBank className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(totalRemaining)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    available to spend
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Over Budget</CardTitle>
                  <div className={`h-4 w-4 rounded-full ${overBudgetCount > 0 ? "bg-rose-500" : "bg-emerald-500"}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${overBudgetCount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {overBudgetCount}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    categor{overBudgetCount !== 1 ? "ies" : "y"} exceeded
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-4">
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Budget Cards */}
            {filteredBudgets.length === 0 ? (
              <Card className="p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                    <Wallet className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">No budgets yet</h3>
                  <p className="text-muted-foreground mt-1 mb-4">
                    Create your first budget to start tracking spending
                  </p>
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Budget
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredBudgets.map((budget) => (
                  <BudgetCard
                    key={budget.id}
                    id={budget.id}
                    category={budget.category}
                    amount={budget.amount}
                    spent={budget.spent}
                    remaining={budget.remaining}
                    percentUsed={budget.percentUsed}
                    period={budget.period}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Add Budget Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Budget</DialogTitle>
            </DialogHeader>
            <BudgetForm
              categories={availableCategories}
              onSuccess={() => {
                setAddDialogOpen(false)
                loadData()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

