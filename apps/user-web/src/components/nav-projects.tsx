"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ChevronRight,
  Plus,
  TrendingUp,
  DollarSign,
  Target,
} from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

interface Goal {
  id: string
  type: 'revenue' | 'profit' | 'valuation' | 'runway' | 'revenue_multiple'
  name: string
  progress: number
  is_achieved: boolean
}

interface GroupedGoals {
  revenue: Goal[]
  profit: Goal[]
}

// Only Revenue and Profit have multiple goals - Exit is a single plan
const COLLAPSIBLE_CATEGORIES = [
  {
    key: 'revenue' as const,
    label: 'Revenue',
    icon: TrendingUp,
    colorClass: 'text-emerald-500',
  },
  {
    key: 'profit' as const,
    label: 'Profit',
    icon: DollarSign,
    colorClass: 'text-blue-500',
  },
]

export function NavProjects() {
  const [groupedGoals, setGroupedGoals] = useState<GroupedGoals>({
    revenue: [],
    profit: [],
  })
  const [loading, setLoading] = useState(true)
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    revenue: false,
    profit: false,
    exit: false,
  })

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await fetch('/api/goals')
        if (response.ok) {
          const data = await response.json()
          const goals: Goal[] = data.goals || []
          
          // Group goals by category (only revenue and profit)
          const grouped: GroupedGoals = {
            revenue: goals.filter(g => g.type === 'revenue' && !g.is_achieved),
            profit: goals.filter(g => g.type === 'profit' && !g.is_achieved),
          }
          
          setGroupedGoals(grouped)
        }
      } catch (error) {
        console.error('Failed to fetch goals for sidebar:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGoals()
  }, [])

  const toggleCategory = (key: string) => {
    setOpenCategories(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Goals</SidebarGroupLabel>
      <SidebarMenu>
        {loading ? (
          // Loading skeleton
          <SidebarMenuItem>
            <SidebarMenuButton disabled>
              <span className="h-4 w-4 bg-muted rounded animate-pulse" />
              <span className="h-4 w-24 bg-muted rounded animate-pulse" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : (
          <>
            {/* Revenue and Profit - Collapsible with nested goals */}
            {COLLAPSIBLE_CATEGORIES.map((category) => {
              const Icon = category.icon
              const goals = groupedGoals[category.key]
              
              return (
                <Collapsible
                  key={category.key}
                  open={openCategories[category.key]}
                  onOpenChange={() => toggleCategory(category.key)}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton>
                        <Icon className={category.colorClass} />
                        <span>{category.label}</span>
                        {goals.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {goals.length}
                          </span>
                        )}
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {goals.length === 0 ? (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild>
                              <Link href={`/goals/${category.key}`} className="text-muted-foreground">
                                <Plus className="h-3 w-3" />
                                <span>Add goal</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ) : (
                          goals.map((goal) => (
                            <SidebarMenuSubItem key={goal.id}>
                              <SidebarMenuSubButton asChild>
                                <Link href={`/goals/${category.key}`}>
                                  <span className="truncate flex-1">{goal.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {goal.progress.toFixed(0)}%
                                  </span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))
                        )}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )
            })}

            {/* Exit - Collapsible like the others */}
            <Collapsible
              open={openCategories.exit}
              onOpenChange={() => toggleCategory('exit')}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton>
                    <Target className="text-sky-500" />
                    <span>Exit</span>
                    <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <Link href="/goals/exit">
                          <span>View Exit Plan</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </>
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
