"use client"

import { Users, Briefcase } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ToolResultCard } from "./tool-result-card"
import type { TeamMembersResult as TeamMembersResultType } from "@/lib/agent"

interface TeamMembersResultProps {
  result: TeamMembersResultType & {
    message?: string
  }
}

const workloadColors: Record<string, string> = {
  low: "bg-green-500",
  medium: "bg-yellow-500",
  high: "bg-red-500",
}

const roleColors: Record<string, string> = {
  owner: "border-purple-500 text-purple-700",
  admin: "border-blue-500 text-blue-700",
  member: "border-gray-400 text-gray-600",
  developer: "border-green-500 text-green-700",
  designer: "border-pink-500 text-pink-700",
}

export function TeamMembersResult({ result }: TeamMembersResultProps) {
  // Handle potential undefined
  const members = result?.members || []
  const summary = result?.summary || { count: members.length, byRole: {} }

  return (
    <ToolResultCard
      icon={<Users className="size-4" />}
      title={result?.message ? String(result.message) : `${summary.count} Team Members`}
      status="success"
    >
      <div className="space-y-2">
        {/* Workload summary */}
        {summary.byWorkloadLevel && (
          <div className="flex gap-1.5 flex-wrap">
            {Object.entries(summary.byWorkloadLevel).map(([level, count]) => (
              <Badge key={level} variant="outline" className="text-[10px] h-5 gap-1">
                <div className={`size-2 rounded-full ${workloadColors[level] || "bg-gray-400"}`} />
                {count as number} {level} workload
              </Badge>
            ))}
          </div>
        )}

        {/* Member list */}
        {members.slice(0, 6).map((member: TeamMembersResultType["members"][number]) => (
          <div
            key={member.id}
            className="flex items-center gap-2 p-2 rounded-md border bg-card/50"
          >
            <Avatar className="size-8">
              <AvatarImage src={member.avatarUrl || undefined} />
              <AvatarFallback className="text-xs">
                {member.name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm truncate">{member.name}</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] h-4 ${roleColors[member.role] || ""}`}
                >
                  {member.role}
                </Badge>
              </div>
              {member.jobRole && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Briefcase className="size-2.5" />
                  {member.jobRole}
                </div>
              )}
            </div>

            {/* Workload indicator */}
            {member.workload && (
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <div
                    className={`size-2 rounded-full ${workloadColors[member.workload.level]}`}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {member.workload.totalOpenTasks} tasks
                  </span>
                </div>
                {member.workload.urgentCount > 0 && (
                  <span className="text-[10px] text-red-500">
                    {member.workload.urgentCount} urgent
                  </span>
                )}
              </div>
            )}
          </div>
        ))}

        {members.length > 6 && (
          <p className="text-xs text-muted-foreground text-center">
            + {members.length - 6} more members
          </p>
        )}

        {members.length === 0 && (
          <p className="text-xs text-muted-foreground">No team members found.</p>
        )}
      </div>
    </ToolResultCard>
  )
}
