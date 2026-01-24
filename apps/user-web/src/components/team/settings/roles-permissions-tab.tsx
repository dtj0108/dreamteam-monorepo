"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@dreamteam/ui/card"
import { Badge } from "@dreamteam/ui/badge"
import { Crown, Loader2, Shield, User } from "lucide-react"
import {
  PERMISSION_CATEGORIES,
  type WorkspacePermission,
} from "@/types/team-settings"

interface RolesPermissionsTabProps {
  workspaceId: string
}

type PermissionsByRole = Record<string, Record<string, boolean>>

export function RolesPermissionsTab({ workspaceId }: RolesPermissionsTabProps) {
  const [permissions, setPermissions] = useState<WorkspacePermission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPermissions()
  }, [workspaceId])

  async function fetchPermissions() {
    try {
      const res = await fetch(`/api/team/permissions?workspaceId=${workspaceId}`)
      if (res.ok) {
        const data = await res.json()
        setPermissions(data)
      }
    } catch (error) {
      console.error("Failed to fetch permissions:", error)
    } finally {
      setLoading(false)
    }
  }

  // Group permissions by role
  const permissionsByRole: PermissionsByRole = permissions.reduce((acc, p) => {
    if (!acc[p.role]) acc[p.role] = {}
    acc[p.role][p.permission_key] = p.is_enabled
    return acc
  }, {} as PermissionsByRole)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const roles = [
    {
      id: "owner",
      name: "Owner",
      description: "Full access to all workspace features and settings",
      icon: Crown,
      color: "text-amber-500",
      isEditable: false,
    },
    {
      id: "admin",
      name: "Admin",
      description: "Can manage members and most workspace settings",
      icon: Shield,
      color: "text-blue-500",
      isEditable: true,
    },
    {
      id: "member",
      name: "Member",
      description: "Standard team member with limited permissions",
      icon: User,
      color: "text-gray-500",
      isEditable: true,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Roles & Permissions</h3>
        <p className="text-sm text-muted-foreground">
          View what each role can do in your workspace.
          To edit permissions, go to <span className="font-medium">Members</span> tab and click the menu on any member.
        </p>
      </div>

      {roles.map((role) => {
        const RoleIcon = role.icon
        const rolePermissions = permissionsByRole[role.id] || {}

        return (
          <Card key={role.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${role.color}`}>
                  <RoleIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{role.name}</CardTitle>
                    {role.id === "owner" && (
                      <Badge variant="secondary" className="text-xs">
                        All Permissions
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-sm">
                    {role.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            {role.isEditable && (
              <CardContent className="pt-0">
                <div className="space-y-6">
                  {PERMISSION_CATEGORIES.map((category) => (
                    <div key={category.name}>
                      <h4 className="text-sm font-medium mb-3">{category.name}</h4>
                      <div className="space-y-3">
                        {category.permissions.map((permission) => {
                          const isEnabled = rolePermissions[permission.key] ?? false

                          return (
                            <div
                              key={permission.key}
                              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="space-y-0.5">
                                <span className="text-sm font-medium">
                                  {permission.label}
                                </span>
                                <p className="text-xs text-muted-foreground">
                                  {permission.description}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={isEnabled ? "default" : "secondary"} className="text-xs">
                                  {isEnabled ? "Enabled" : "Disabled"}
                                </Badge>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

              </CardContent>
            )}

            {!role.isEditable && (
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  The owner role has all permissions and cannot be modified
                </p>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
