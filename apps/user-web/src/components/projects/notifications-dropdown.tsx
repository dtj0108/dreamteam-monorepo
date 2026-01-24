"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import {
  Bell,
  CheckCircle2,
  MessageSquare,
  UserPlus,
  AlertCircle,
  Flag,
  FolderKanban,
  Loader2,
} from "lucide-react"

interface ProjectNotification {
  id: string
  type: string
  title: string
  message: string | null
  read_at: string | null
  created_at: string
  project?: { id: string; name: string; color: string } | null
  task?: { id: string; title: string } | null
  milestone?: { id: string; name: string } | null
  actor?: { id: string; name: string; avatar_url: string | null } | null
}

const notificationIcons: Record<string, typeof Bell> = {
  task_assigned: UserPlus,
  task_due_soon: AlertCircle,
  task_overdue: AlertCircle,
  task_completed: CheckCircle2,
  task_comment: MessageSquare,
  task_mention: MessageSquare,
  milestone_approaching: Flag,
  milestone_completed: Flag,
  project_member_added: UserPlus,
  project_status_changed: FolderKanban,
}

export function ProjectNotificationsDropdown() {
  const [notifications, setNotifications] = useState<ProjectNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/projects/notifications?limit=20")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const handleMarkAsRead = async (notificationId?: string) => {
    try {
      await fetch("/api/projects/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          notificationId 
            ? { notificationIds: [notificationId] }
            : { markAllRead: true }
        ),
      })
      
      if (notificationId) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      } else {
        setNotifications(prev => 
          prev.map(n => ({ ...n, read_at: new Date().toISOString() }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("Failed to mark as read:", error)
    }
  }

  const getNotificationLink = (notification: ProjectNotification) => {
    if (notification.task) {
      return `/projects/${notification.project?.id}`
    }
    if (notification.milestone) {
      return `/projects/${notification.project?.id}/milestones`
    }
    if (notification.project) {
      return `/projects/${notification.project.id}`
    }
    return "/projects"
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={() => handleMarkAsRead()}
            >
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-96">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || Bell
                const isUnread = !notification.read_at

                return (
                  <Link
                    key={notification.id}
                    href={getNotificationLink(notification)}
                    className={cn(
                      "flex gap-3 p-3 hover:bg-muted/50 transition-colors",
                      isUnread && "bg-primary/5"
                    )}
                    onClick={() => {
                      if (isUnread) handleMarkAsRead(notification.id)
                      setOpen(false)
                    }}
                  >
                    <div className="shrink-0">
                      {notification.actor ? (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={notification.actor.avatar_url || undefined} />
                          <AvatarFallback>
                            {notification.actor.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm leading-tight",
                        isUnread && "font-medium"
                      )}>
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {notification.message}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {notification.project && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: notification.project.color }}
                            />
                            {notification.project.name}
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {isUnread && (
                      <div className="shrink-0">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button 
              variant="ghost" 
              className="w-full text-sm"
              asChild
            >
              <Link href="/projects/my-tasks">View all tasks</Link>
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

