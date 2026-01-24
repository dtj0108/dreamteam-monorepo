"use client"

import { format } from "date-fns"
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Wallet, 
  BarChart3,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

interface GoalCardProps {
  goal: Goal
  onEdit: (goal: Goal) => void
  onDelete: (goalId: string) => void
}

const GOAL_TYPE_CONFIG = {
  revenue: {
    label: 'Revenue',
    icon: TrendingUp,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  profit: {
    label: 'Profit',
    icon: DollarSign,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  valuation: {
    label: 'Valuation',
    icon: Target,
    color: 'text-sky-600',
    bgColor: 'bg-sky-100',
  },
  runway: {
    label: 'Runway',
    icon: Wallet,
    color: 'text-sky-600',
    bgColor: 'bg-sky-100',
  },
  revenue_multiple: {
    label: 'Revenue Multiple',
    icon: BarChart3,
    color: 'text-sky-600',
    bgColor: 'bg-sky-100',
  },
}

export function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const config = GOAL_TYPE_CONFIG[goal.type]
  const Icon = config.icon

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatValue = (value: number, type: string) => {
    if (type === 'revenue_multiple') {
      return `${value.toFixed(1)}x`
    }
    return formatCurrency(value)
  }

  const progressColor = goal.progress >= 100 
    ? 'bg-emerald-500' 
    : goal.progress >= 75 
      ? 'bg-blue-500' 
      : goal.progress >= 50 
        ? 'bg-amber-500' 
        : 'bg-gray-400'

  return (
    <Card className={goal.is_achieved ? 'border-emerald-300 bg-emerald-50/50' : ''}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">{goal.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {config.label}
              </Badge>
              {goal.is_achieved && (
                <Badge className="bg-emerald-500 text-white text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Achieved
                </Badge>
              )}
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(goal)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(goal.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{goal.progress.toFixed(0)}%</span>
          </div>
          <div className="h-3 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progressColor}`}
              style={{ width: `${Math.min(goal.progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Current vs Target */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Current</p>
            <p className={`text-lg font-bold ${config.color}`}>
              {formatValue(goal.current_amount, goal.type)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Target</p>
            <p className="text-lg font-bold">
              {formatValue(goal.target_amount, goal.type)}
            </p>
          </div>
        </div>

        {/* Date Range */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {format(new Date(goal.start_date), 'MMM d, yyyy')} — {format(new Date(goal.end_date), 'MMM d, yyyy')}
          </p>
        </div>

        {/* Notes */}
        {goal.notes && (
          <p className="text-sm text-muted-foreground italic">
            {goal.notes}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

