"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  PlusIcon,
  CalendarIcon,
  PhoneIcon,
  MailIcon,
  CheckCircleIcon,
  FileTextIcon,
  MoreHorizontal,
  ClipboardListIcon,
} from "lucide-react"
import { useSales, Activity, ActivityType } from "@/providers/sales-provider"
import { ActivityForm, Activity as ActivityFormData } from "@/components/sales/activity-form"
import type { WorkspaceMember } from "@/components/sales/activity-assignee-picker"
import { BulkActionBar } from "@/components/sales/bulk-action-bar"
import { cn } from "@/lib/utils"

interface Contact {
  id: string
  first_name: string
  last_name?: string
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function ActivityItem({
  activity,
  selected,
  onSelect,
  onComplete,
  onEdit,
  onDelete,
}: {
  activity: Activity
  selected: boolean
  onSelect: (id: string, selected: boolean) => void
  onComplete: (id: string, completed: boolean) => void
  onEdit: (activity: Activity) => void
  onDelete: (id: string) => void
}) {
  const icons = {
    call: PhoneIcon,
    email: MailIcon,
    meeting: CalendarIcon,
    note: FileTextIcon,
    task: ClipboardListIcon,
  }
  const Icon = icons[activity.type] || CheckCircleIcon

  const typeLabels = {
    call: "Phone Call",
    email: "Email",
    meeting: "Meeting",
    note: "Note",
    task: "Task",
  }

  const assignees = activity.assignees || []
  const displayedAssignees = assignees.slice(0, 3)
  const overflowCount = assignees.length - 3

  return (
    <div className="flex items-center gap-4 p-4 border-b last:border-b-0">
      <Checkbox
        checked={selected}
        onCheckedChange={(checked) => onSelect(activity.id, checked === true)}
      />
      <div className={cn(
        "size-10 rounded-lg bg-muted flex items-center justify-center shrink-0",
        activity.is_completed && "opacity-50"
      )}>
        <Icon className={cn("size-5 text-muted-foreground", activity.is_completed && "line-through")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {activity.subject || typeLabels[activity.type]}
        </p>
        {activity.description && (
          <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
        )}
        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
          {activity.due_date && (
            <span>Due: {formatDate(activity.due_date)}</span>
          )}
          {activity.contact && (
            <span>
              Contact: {activity.contact.first_name} {activity.contact.last_name}
            </span>
          )}
        </div>
      </div>
      {/* Assignee avatars */}
      {assignees.length > 0 && (
        <TooltipProvider>
          <div className="flex -space-x-2">
            {displayedAssignees.map((assignee) => (
              <Tooltip key={assignee.id}>
                <TooltipTrigger asChild>
                  <Avatar className="h-7 w-7 border-2 border-background">
                    <AvatarImage src={assignee.user?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(assignee.user?.name || "?")}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{assignee.user?.name || "Unknown"}</p>
                </TooltipContent>
              </Tooltip>
            ))}
            {overflowCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-7 w-7 border-2 border-background">
                    <AvatarFallback className="text-[10px] bg-muted">
                      +{overflowCount}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{assignees.slice(3).map(a => a.user?.name).join(", ")}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onComplete(activity.id, activity.is_completed)}>
            {activity.is_completed ? "Mark Incomplete" : "Mark Complete"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(activity)}>Edit</DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(activity.id)}
            className="text-destructive"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default function ActivitiesPage() {
  const {
    activities,
    fetchActivities,
    createActivity,
    updateActivity,
    deleteActivity,
    completeActivity,
  } = useSales()

  const [activityFormOpen, setActivityFormOpen] = useState(false)
  const [defaultActivityType, setDefaultActivityType] = useState<ActivityType>("task")
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>()
  const [activeTab, setActiveTab] = useState("upcoming")
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [isBulkCompleting, setIsBulkCompleting] = useState(false)

  const selectedActivities = Object.keys(rowSelection).filter((id) => rowSelection[id])

  // Fetch activities, contacts, and members on mount
  useEffect(() => {
    fetchActivities()
    fetchContacts()
    fetchMembers()
  }, [fetchActivities])

  const fetchContacts = async () => {
    try {
      const response = await fetch("/api/contacts")
      if (response.ok) {
        const data = await response.json()
        setContacts(data || [])
      }
    } catch (error) {
      console.error("Error fetching contacts:", error)
    }
  }

  const fetchMembers = async () => {
    try {
      const response = await fetch("/api/workspace-members")
      if (response.ok) {
        const data = await response.json()
        setMembers(data.members || [])
        setCurrentUserId(data.currentUserId)
      }
    } catch (error) {
      console.error("Error fetching members:", error)
    }
  }

  // Filter activities by tab
  // Show ALL incomplete activities in "Upcoming", not just those with due dates
  const upcomingActivities = activities
    .filter((a) => !a.is_completed)
    .sort((a, b) => {
      // Activities with due dates come first, sorted by due date
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      }
      if (a.due_date && !b.due_date) return -1
      if (!a.due_date && b.due_date) return 1
      // Both without due dates - sort by created_at descending (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  const completedActivities = activities.filter((a) => a.is_completed)
  const allActivities = activities

  // Debug logging to trace data flow
  console.log('Activities state:', activities.length, 'total')
  console.log('Upcoming (is_completed=false):', upcomingActivities.length)
  console.log('Completed (is_completed=true):', completedActivities.length)
  if (activities.length > 0) {
    console.log('Sample activity:', activities[0])
  }

  const openFormWithType = (type: ActivityType) => {
    setDefaultActivityType(type)
    setEditingActivity(null)
    setActivityFormOpen(true)
  }

  const openEditForm = (activity: Activity) => {
    setEditingActivity(activity)
    setDefaultActivityType(activity.type)
    setActivityFormOpen(true)
  }

  const handleActivitySubmit = async (data: ActivityFormData) => {
    // The form provides assignees as string[] (user IDs), which is what the API expects
    // Cast to unknown first to handle the type difference between form and provider types
    const apiData = data as unknown as Partial<Activity>
    if (editingActivity) {
      await updateActivity(editingActivity.id, apiData)
    } else {
      await createActivity(apiData)
    }
    await fetchActivities()
  }

  const handleComplete = async (id: string, uncomplete: boolean) => {
    if (uncomplete) {
      // Uncomplete: set is_completed to false
      await updateActivity(id, { is_completed: false, completed_at: null })
    } else {
      // Complete: use the completeActivity method
      await completeActivity(id)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteActivity(id)
  }

  const handleBulkComplete = async () => {
    setIsBulkCompleting(true)
    try {
      await fetch("/api/activities/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_ids: selectedActivities,
          updates: {
            is_completed: true,
            completed_at: new Date().toISOString(),
          },
        }),
      })
      await fetchActivities()
      setRowSelection({})
    } catch (error) {
      console.error("Error bulk completing activities:", error)
    } finally {
      setIsBulkCompleting(false)
    }
  }

  const getActivitiesForTab = () => {
    switch (activeTab) {
      case "upcoming":
        return upcomingActivities
      case "completed":
        return completedActivities
      case "all":
      default:
        return allActivities
    }
  }

  const renderActivityList = (activitiesList: Activity[]) => {
    if (activitiesList.length === 0) {
      return null
    }

    return (
      <Card>
        <CardContent className="p-0">
          {activitiesList.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              selected={rowSelection[activity.id] || false}
              onSelect={(id, selected) =>
                setRowSelection((prev) => ({ ...prev, [id]: selected }))
              }
              onComplete={handleComplete}
              onEdit={openEditForm}
              onDelete={handleDelete}
            />
          ))}
        </CardContent>
      </Card>
    )
  }

  const renderEmptyState = (tab: string) => {
    if (tab === "upcoming") {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <CalendarIcon className="size-8 text-muted-foreground" />
            </div>
            <CardTitle className="mb-2">No upcoming activities</CardTitle>
            <CardDescription className="text-center max-w-sm mb-4">
              Schedule calls, meetings, or tasks to stay on top of your deals.
            </CardDescription>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => openFormWithType("call")}>
                <PhoneIcon className="size-4 mr-2" />
                Log Call
              </Button>
              <Button variant="outline" onClick={() => openFormWithType("email")}>
                <MailIcon className="size-4 mr-2" />
                Log Email
              </Button>
              <Button onClick={() => openFormWithType("meeting")}>
                <CalendarIcon className="size-4 mr-2" />
                Schedule Meeting
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (tab === "completed") {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <CheckCircleIcon className="size-8 text-muted-foreground" />
            </div>
            <CardTitle className="mb-2">No completed activities</CardTitle>
            <CardDescription className="text-center max-w-sm">
              Completed activities will appear here.
            </CardDescription>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <CardTitle className="mb-2">No activities yet</CardTitle>
          <CardDescription className="text-center max-w-sm mb-4">
            Start logging activities to track your interactions with contacts.
          </CardDescription>
          <Button onClick={() => openFormWithType("task")}>Log Activity</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Activities</h1>
            {upcomingActivities.length > 0 && (
              <Badge
                variant={
                  upcomingActivities.length > 10
                    ? "destructive"
                    : upcomingActivities.length > 5
                      ? "default"
                      : "secondary"
                }
              >
                {upcomingActivities.length} open
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">Track calls, emails, meetings, and tasks</p>
        </div>
        <Button onClick={() => openFormWithType("task")}>
          <PlusIcon className="size-4 mr-2" />
          Log Activity
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming {upcomingActivities.length > 0 && `(${upcomingActivities.length})`}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed {completedActivities.length > 0 && `(${completedActivities.length})`}
          </TabsTrigger>
          <TabsTrigger value="all">
            All Activities {allActivities.length > 0 && `(${allActivities.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {upcomingActivities.length > 0
            ? renderActivityList(upcomingActivities)
            : renderEmptyState("upcoming")}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {completedActivities.length > 0
            ? renderActivityList(completedActivities)
            : renderEmptyState("completed")}
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          {allActivities.length > 0
            ? renderActivityList(allActivities)
            : renderEmptyState("all")}
        </TabsContent>
      </Tabs>

      {selectedActivities.length > 0 && (
        <BulkActionBar
          selectedCount={selectedActivities.length}
          onClearSelection={() => setRowSelection({})}
          actions={[
            {
              id: "complete",
              label: "Mark Complete",
              icon: <CheckCircleIcon className="h-4 w-4" />,
              onClick: handleBulkComplete,
              loading: isBulkCompleting,
            },
          ]}
        />
      )}

      <ActivityForm
        open={activityFormOpen}
        onOpenChange={setActivityFormOpen}
        contacts={contacts}
        members={members}
        currentUserId={currentUserId}
        activity={editingActivity ? {
          id: editingActivity.id,
          type: editingActivity.type,
          subject: editingActivity.subject || undefined,
          description: editingActivity.description || undefined,
          contact_id: editingActivity.contact_id || undefined,
          due_date: editingActivity.due_date || undefined,
          is_completed: editingActivity.is_completed,
          assignees: editingActivity.assignees?.map(a => a.user_id) || [],
        } : undefined}
        onSubmit={handleActivitySubmit}
        defaultType={defaultActivityType}
      />
    </div>
  )
}
