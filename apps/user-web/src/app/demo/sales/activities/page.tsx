"use client"

import { useDemoCRM } from "@/providers"
import { DemoCRMLayout } from "@/components/demo/demo-crm-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckSquare,
  Plus,
  Clock,
  CheckCircle2,
} from "lucide-react"
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from "date-fns"

export default function DemoActivitiesPage() {
  const { activities } = useDemoCRM()

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call": return Phone
      case "email": return Mail
      case "meeting": return Calendar
      case "note": return FileText
      case "task": return CheckSquare
      default: return CheckSquare
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case "call": return "bg-blue-100 text-blue-600"
      case "email": return "bg-purple-100 text-purple-600"
      case "meeting": return "bg-amber-100 text-amber-600"
      case "note": return "bg-gray-100 text-gray-600"
      case "task": return "bg-cyan-100 text-cyan-600"
      default: return "bg-gray-100 text-gray-600"
    }
  }

  const formatActivityDate = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isToday(date)) return "Today"
    if (isTomorrow(date)) return "Tomorrow"
    if (isPast(date)) return formatDistanceToNow(date, { addSuffix: true })
    return format(date, "MMM d 'at' h:mm a")
  }

  const upcomingActivities = activities.filter(a => !a.completed)
  const completedActivities = activities.filter(a => a.completed)

  // Stats
  const totalCalls = activities.filter(a => a.type === "call").length
  const totalEmails = activities.filter(a => a.type === "email").length
  const totalMeetings = activities.filter(a => a.type === "meeting").length

  return (
    <DemoCRMLayout breadcrumbs={[{ label: "Activities" }]} title="Activities">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmails}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMeetings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{completedActivities.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Upcoming Activities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Upcoming
              </CardTitle>
            </div>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Activity
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingActivities.map((activity) => {
                const Icon = getActivityIcon(activity.type)
                const colorClass = getActivityColor(activity.type)
                const dateStr = formatActivityDate(activity.date)
                const isPastDue = isPast(new Date(activity.date)) && !isToday(new Date(activity.date))
                
                return (
                  <div 
                    key={activity.id} 
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      isPastDue ? 'border-red-200 bg-red-50/50' : ''
                    }`}
                  >
                    <Checkbox className="mt-0.5" />
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{activity.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{activity.contactName}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className={`text-xs ${isPastDue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                          {dateStr}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize shrink-0">
                      {activity.type}
                    </Badge>
                  </div>
                )
              })}
              
              {upcomingActivities.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No upcoming activities
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Completed Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedActivities.map((activity) => {
                const Icon = getActivityIcon(activity.type)
                
                return (
                  <div 
                    key={activity.id} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                  >
                    <Checkbox checked disabled className="mt-0.5" />
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-through text-muted-foreground">{activity.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{activity.contactName}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize shrink-0">
                      {activity.type}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DemoCRMLayout>
  )
}

