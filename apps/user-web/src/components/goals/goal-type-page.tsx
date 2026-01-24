"use client"

import { useEffect, useState } from "react"
import { Plus, TrendingUp, DollarSign, Target } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
import { GoalCard } from "@/components/goals/goal-card"
import { GoalForm } from "@/components/goals/goal-form"

interface Goal {
  id: string
  type: 'revenue' | 'profit' | 'valuation' | 'runway' | 'revenue_multiple'
  name: string
  target_amount: number
  current_amount: number
  start_date: string
  end_date: string
  progress: number
  is_achieved: boolean
  notes?: string
}

type GoalCategory = 'revenue' | 'profit' | 'exit'

interface GoalTypePageProps {
  category: GoalCategory
}

const CATEGORY_CONFIG = {
  revenue: {
    title: 'Revenue Goals',
    description: 'Track your income and revenue targets',
    icon: TrendingUp,
    iconColor: 'text-emerald-500',
    types: ['revenue'] as const,
    defaultType: 'revenue' as const,
  },
  profit: {
    title: 'Profit Goals',
    description: 'Monitor your net profit margins',
    icon: DollarSign,
    iconColor: 'text-blue-500',
    types: ['profit'] as const,
    defaultType: 'profit' as const,
  },
  exit: {
    title: 'Exit Strategy',
    description: 'Plan your valuation, runway, and exit strategy',
    icon: Target,
    iconColor: 'text-sky-500',
    types: ['valuation', 'runway', 'revenue_multiple'] as const,
    defaultType: 'valuation' as const,
  },
}

export function GoalTypePage({ category }: GoalTypePageProps) {
  const config = CATEGORY_CONFIG[category]
  const Icon = config.icon

  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null)

  const fetchGoals = async () => {
    try {
      const response = await fetch('/api/goals')
      if (response.ok) {
        const data = await response.json()
        // Filter goals by category types
        const filteredGoals = (data.goals || []).filter((g: Goal) =>
          (config.types as readonly string[]).includes(g.type)
        )
        setGoals(filteredGoals)
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGoals()
  }, [category])

  const handleCreate = async (goalData: Omit<Goal, 'id' | 'progress' | 'is_achieved' | 'current_amount'> & { current_amount?: number }) => {
    const response = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goalData),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to create goal')
    }

    await fetchGoals()
  }

  const handleUpdate = async (goalData: Omit<Goal, 'id' | 'progress' | 'is_achieved' | 'current_amount'> & { current_amount?: number }) => {
    if (!editingGoal) return

    const response = await fetch(`/api/goals/${editingGoal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goalData),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to update goal')
    }

    setEditingGoal(null)
    await fetchGoals()
  }

  const handleDelete = async () => {
    if (!goalToDelete) return

    try {
      const response = await fetch(`/api/goals/${goalToDelete}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete goal')
      }

      await fetchGoals()
    } catch (error) {
      console.error('Failed to delete goal:', error)
    } finally {
      setDeleteDialogOpen(false)
      setGoalToDelete(null)
    }
  }

  const openEditForm = (goal: Goal) => {
    setEditingGoal(goal)
    setFormOpen(true)
  }

  const openDeleteDialog = (goalId: string) => {
    setGoalToDelete(goalId)
    setDeleteDialogOpen(true)
  }

  const openCreateForm = () => {
    setEditingGoal(null)
    setFormOpen(true)
  }

  const activeGoals = goals.filter(g => !g.is_achieved)
  const achievedGoals = goals.filter(g => g.is_achieved)

  // Create a default goal with the correct type for this category
  const defaultGoalForForm = editingGoal || {
    type: config.defaultType,
    name: '',
    target_amount: 0,
    start_date: '',
    end_date: '',
  }

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Goals", href: "/goals/revenue" },
        { label: config.title.replace(' Goals', '') }
      ]}
      actions={
        <Button onClick={openCreateForm}>
          <Plus className="h-4 w-4 mr-2" />
          New {category === 'exit' ? 'Exit' : config.title.replace(' Goals', '')} Goal
        </Button>
      }
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl bg-muted`}>
            <Icon className={`h-8 w-8 ${config.iconColor}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{config.title}</h1>
            <p className="text-muted-foreground">{config.description}</p>
          </div>
        </div>

        {/* Active Goals */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Active Goals</h2>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : activeGoals.length === 0 ? (
            <div className="text-center py-12 border rounded-lg border-dashed">
              <Icon className={`h-12 w-12 mx-auto ${config.iconColor} opacity-50 mb-4`} />
              <h3 className="text-lg font-medium mb-2">No active {category} goals</h3>
              <p className="text-muted-foreground mb-4">
                Create your first {category} goal to start tracking progress
              </p>
              <Button onClick={openCreateForm}>
                <Plus className="h-4 w-4 mr-2" />
                Create Goal
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={openEditForm}
                  onDelete={openDeleteDialog}
                />
              ))}
            </div>
          )}
        </div>

        {/* Achieved Goals */}
        {achievedGoals.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 text-emerald-600">
              Achieved Goals ({achievedGoals.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {achievedGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={openEditForm}
                  onDelete={openDeleteDialog}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Goal Form Modal */}
      <GoalForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingGoal(null)
        }}
        goal={editingGoal ? editingGoal : { ...defaultGoalForForm } as any}
        onSubmit={editingGoal ? handleUpdate : handleCreate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this goal? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}

