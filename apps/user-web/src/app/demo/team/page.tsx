"use client"

import { useDemoTeam, useDemoData } from "@/providers"
import { DemoTeamLayout } from "@/components/demo/demo-team-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"
import {
  Hash,
  Lock,
  MessageSquare,
  Users,
  ArrowRight,
  Circle,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default function DemoTeamPage() {
  const { channels, dmConversations, members, onlineMembers, unreadCount } = useDemoTeam()
  const { user } = useDemoData()

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return formatDistanceToNow(date, { addSuffix: true })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-emerald-500"
      case "away": return "bg-amber-500"
      default: return "bg-gray-400"
    }
  }

  return (
    <DemoTeamLayout breadcrumbs={[{ label: "Home" }]}>
      {/* Welcome Section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Welcome back, {user.name.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">Here's what's happening with your team.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unread Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadCount.total}</div>
            <p className="text-xs text-muted-foreground">
              {unreadCount.channelUnread} in channels, {unreadCount.dmUnread} in DMs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">
              {onlineMembers.length} online now
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Channels</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{channels.length}</div>
            <p className="text-xs text-muted-foreground">
              {channels.filter(c => c.isPrivate).length} private
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Channels */}
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Channels</CardTitle>
            <Link href="/demo/team/channels">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {channels.map((channel) => (
                <Link 
                  key={channel.id} 
                  href={`/demo/team/channels?id=${channel.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      {channel.isPrivate ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Hash className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{channel.name}</p>
                      <p className="text-xs text-muted-foreground">{channel.memberCount} members</p>
                    </div>
                  </div>
                  {channel.unreadCount > 0 && (
                    <Badge className="bg-orange-500">{channel.unreadCount}</Badge>
                  )}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarFallback className="bg-orange-100 text-orange-600">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background ${getStatusColor(member.status)}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{member.name}</p>
                        {member.role === "owner" && (
                          <Badge variant="secondary" className="text-xs">Owner</Badge>
                        )}
                        {member.role === "admin" && (
                          <Badge variant="outline" className="text-xs">Admin</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{member.title}</p>
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{member.status}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Recent Direct Messages */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Direct Messages</CardTitle>
          <Link href="/demo/team/dm">
            <Button variant="ghost" size="sm">
              View all
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {dmConversations.map((dm) => (
              <Link 
                key={dm.id}
                href={`/demo/team/dm?id=${dm.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="relative">
                  <Avatar>
                    <AvatarFallback>
                      {dm.participantName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {dm.participantStatus === "online" && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{dm.participantName}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(dm.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {dm.lastMessage}
                  </p>
                </div>
                {dm.unreadCount > 0 && (
                  <Badge className="shrink-0 bg-orange-500">{dm.unreadCount}</Badge>
                )}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </DemoTeamLayout>
  )
}

