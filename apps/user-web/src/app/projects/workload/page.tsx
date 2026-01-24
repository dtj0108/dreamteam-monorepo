"use client"

import { useState, useEffect, useMemo } from "react"
import { useProjects, type Project, type Task } from "@/providers/projects-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Users, Clock, AlertTriangle } from "lucide-react"
import { WorkloadPageSkeleton } from "@/components/projects/skeletons"

interface TeamMember {
  id: string
  name: string
  avatar_url: string | null
  email?: string
  tasks: Task[]
  totalHours: number
  projectCount: number
}

export default function WorkloadPage() {
  const { projects, loading, fetchProjects } = useProjects()
  const [period, setPeriod] = useState<"week" | "month">("week")

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Aggregate team member data across all projects
  const teamMembers = useMemo(() => {
    const memberMap = new Map<string, TeamMember>()

    projects.forEach((project) => {
      project.project_members?.forEach((pm) => {
        const userId = pm.user?.id
        if (!userId) return

        if (!memberMap.has(userId)) {
          memberMap.set(userId, {
            id: userId,
            name: pm.user.name,
            avatar_url: pm.user.avatar_url,
            email: pm.user.email,
            tasks: [],
            totalHours: 0,
            projectCount: 0,
          })
        }

        const member = memberMap.get(userId)!
        member.projectCount++

        // Add tasks assigned to this member
        project.tasks?.forEach((task) => {
          const isAssigned = task.task_assignees?.some(
            (a) => a.user?.id === userId
          )
          if (isAssigned) {
            member.tasks.push(task)
            member.totalHours += task.estimated_hours || 0
          }
        })
      })
    })

    return Array.from(memberMap.values()).sort(
      (a, b) => b.totalHours - a.totalHours
    )
  }, [projects])

  // Calculate capacity (assuming 40 hours per week)
  const weeklyCapacity = 40
  const monthlyCapacity = weeklyCapacity * 4

  const getCapacity = () => (period === "week" ? weeklyCapacity : monthlyCapacity)

  const getUtilizationColor = (hours: number) => {
    const utilization = (hours / getCapacity()) * 100
    if (utilization > 100) return "text-red-600"
    if (utilization > 80) return "text-amber-600"
    return "text-emerald-600"
  }

  const getProgressColor = (hours: number) => {
    const utilization = (hours / getCapacity()) * 100
    if (utilization > 100) return "bg-red-500"
    if (utilization > 80) return "bg-amber-500"
    return "bg-emerald-500"
  }

  // Summary stats
  const stats = useMemo(() => {
    const overloaded = teamMembers.filter(
      (m) => m.totalHours > getCapacity()
    ).length
    const available = teamMembers.filter(
      (m) => m.totalHours < getCapacity() * 0.5
    ).length
    const totalTasks = teamMembers.reduce((sum, m) => sum + m.tasks.length, 0)
    const totalHours = teamMembers.reduce((sum, m) => sum + m.totalHours, 0)

    return { overloaded, available, totalTasks, totalHours }
  }, [teamMembers, period])

  // Only show skeleton on first load - cached data renders instantly
  if (loading && projects.length === 0) {
    return <WorkloadPageSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Workload</h1>
          <p className="text-muted-foreground">
            Resource allocation and capacity planning across all projects
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as "week" | "month")}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Users className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{teamMembers.length}</p>
              <p className="text-sm text-muted-foreground">Team Members</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalHours}h</p>
              <p className="text-sm text-muted-foreground">Total Allocated</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.overloaded}</p>
              <p className="text-sm text-muted-foreground">Overloaded</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.available}</p>
              <p className="text-sm text-muted-foreground">Available</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Team Member Cards */}
      {teamMembers.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No team data yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create projects and assign team members to see workload data
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member) => {
            const utilization = Math.min(100, (member.totalHours / getCapacity()) * 100)
            const isOverloaded = member.totalHours > getCapacity()

            return (
              <Card key={member.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback>
                        {member.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {member.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                    {isOverloaded && (
                      <Badge variant="destructive" className="shrink-0">
                        Overloaded
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Capacity bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Capacity</span>
                      <span className={cn("font-medium", getUtilizationColor(member.totalHours))}>
                        {member.totalHours}h / {getCapacity()}h
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          getProgressColor(member.totalHours)
                        )}
                        style={{ width: `${Math.min(100, utilization)}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Tasks</p>
                      <p className="font-medium">{member.tasks.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Projects</p>
                      <p className="font-medium">{member.projectCount}</p>
                    </div>
                  </div>

                  {/* Task breakdown by status */}
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {member.tasks.filter(t => t.status === "todo").length} todo
                    </Badge>
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                      {member.tasks.filter(t => t.status === "in_progress").length} in progress
                    </Badge>
                    <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                      {member.tasks.filter(t => t.status === "done").length} done
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

