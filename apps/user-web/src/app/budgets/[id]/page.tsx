"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { format } from "date-fns"
import { 
  ArrowLeft, 
  Pencil, 
  Trash2, 
  ArrowUpIcon,
  ArrowDownIcon,
  Loader2 
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { BudgetProgressRing } from "@/components/budgets/budget-progress-ring"
import { BudgetProjection } from "@/components/budgets/budget-projection"
import { BudgetAlertBadge } from "@/components/budgets/budget-alert-badge"
import { BudgetForm } from "@/components/budgets/budget-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { BUDGET_PERIOD_LABELS } from "@/lib/types"
import type { Category, BudgetPeriod, TransactionWithCategory } from "@/lib/types"

interface BudgetDetail {
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
  periodStart: string
  periodEnd: string
}

export default function BudgetDetailPage() {
  const router = useRouter()
  const params = useParams()
  const budgetId = params.id as string

  const [budget, setBudget] = useState<BudgetDetail | null>(null)
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadBudget = async () => {
    try {
      const response = await fetch(`/api/budgets/${budgetId}`)
      if (!response.ok) {
        router.push("/budgets")
        return
      }
      const data = await response.json()
      setBudget(data.budget)
      setTransactions(data.transactions || [])
    } catch (error) {
      console.error("Failed to load budget:", error)
      router.push("/budgets")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBudget()
  }, [budgetId])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/budgets/${budgetId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        router.push("/budgets")
      }
    } catch (error) {
      console.error("Failed to delete budget:", error)
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value)
  }

  if (loading) {
    return (
      <DashboardLayout
        breadcrumbs={[
          { label: "Budgets", href: "/budgets" },
          { label: "Loading..." },
        ]}
      >
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    )
  }

  if (!budget) {
    return null
  }

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Budgets", href: "/budgets" },
        { label: budget.category.name },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/budgets")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: budget.category.color }}
              />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{budget.category.name}</h1>
                <p className="text-muted-foreground">
                  {BUDGET_PERIOD_LABELS[budget.period]} budget
                </p>
              </div>
            </div>
            <BudgetAlertBadge percentUsed={budget.percentUsed} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Period: {format(new Date(budget.periodStart), "MMM d")} - {format(new Date(budget.periodEnd), "MMM d, yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <BudgetProgressRing percent={budget.percentUsed} size={180} strokeWidth={16} />
              
              <div className="grid grid-cols-3 gap-6 w-full text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Budget</p>
                  <p className="text-xl font-bold">{formatCurrency(budget.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Spent</p>
                  <p className={`text-xl font-bold ${budget.percentUsed >= 100 ? "text-rose-600" : ""}`}>
                    {formatCurrency(budget.spent)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className={`text-xl font-bold ${budget.remaining >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {formatCurrency(budget.remaining)}
                  </p>
                </div>
              </div>

              {budget.rollover && (
                <Badge variant="secondary">
                  Rollover enabled
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Projection Card */}
          <BudgetProjection
            spent={budget.spent}
            budget={budget.amount}
            periodStart={budget.periodStart}
            periodEnd={budget.periodEnd}
          />
        </div>

        {/* Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions This Period</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions in this category for the current period
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(tx.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center">
                            <ArrowDownIcon className="h-3.5 w-3.5 text-gray-600" />
                          </div>
                          <span>{tx.description}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-rose-600">
                        -{formatCurrency(Math.abs(tx.amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Budget</DialogTitle>
            </DialogHeader>
            <BudgetForm
              budget={{ ...budget, category: budget.category } as any}
              categories={[]}
              onSuccess={() => {
                setEditDialogOpen(false)
                loadBudget()
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Budget</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this budget for {budget.category.name}? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}

