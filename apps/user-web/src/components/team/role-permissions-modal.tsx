"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@dreamteam/ui/dialog"
import { Switch } from "@dreamteam/ui/switch"
import { Label } from "@dreamteam/ui/label"
import { Button } from "@dreamteam/ui/button"
import { Loader2, Shield, User, RotateCcw } from "lucide-react"
import {
  PERMISSION_CATEGORIES,
  type PermissionKey,
  type MemberPermission,
} from "@/types/team-settings"

interface MemberPermissionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string
  memberName: string
}

interface PermissionsState {
  member_id: string
  role: "admin" | "member"
  permissions: MemberPermission[]
}

export function RolePermissionsModal({
  open,
  onOpenChange,
  memberId,
  memberName,
}: MemberPermissionsModalProps) {
  const [state, setState] = useState<PermissionsState | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (open && memberId) {
      fetchPermissions()
    }
  }, [open, memberId])

  async function fetchPermissions() {
    setLoading(true)
    try {
      const res = await fetch(`/api/team/members/${memberId}/permissions`)
      if (res.ok) {
        const data = await res.json()
        setState(data)
      }
    } catch (error) {
      console.error("Failed to fetch permissions:", error)
    } finally {
      setLoading(false)
    }
  }

  async function togglePermission(permissionKey: PermissionKey, currentValue: boolean) {
    setUpdating(permissionKey)

    try {
      const res = await fetch(`/api/team/members/${memberId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permission_key: permissionKey,
          is_enabled: !currentValue,
        }),
      })

      if (res.ok) {
        // Update local state
        setState((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            permissions: prev.permissions.map((p) =>
              p.permission_key === permissionKey
                ? { ...p, is_enabled: !currentValue, is_override: true }
                : p
            ),
          }
        })
      }
    } catch (error) {
      console.error("Failed to update permission:", error)
    } finally {
      setUpdating(null)
    }
  }

  async function resetToDefault(permissionKey: PermissionKey) {
    setUpdating(permissionKey)

    try {
      const res = await fetch(
        `/api/team/members/${memberId}/permissions?permission_key=${permissionKey}`,
        { method: "DELETE" }
      )

      if (res.ok) {
        // Refetch to get the role default
        await fetchPermissions()
      }
    } catch (error) {
      console.error("Failed to reset permission:", error)
    } finally {
      setUpdating(null)
    }
  }

  // Build permissions map for easy lookup
  const permissionsMap: Record<string, MemberPermission> = {}
  state?.permissions.forEach((p) => {
    permissionsMap[p.permission_key] = p
  })

  const roleConfig = {
    admin: {
      name: "Admin",
      icon: Shield,
      color: "text-blue-500",
    },
    member: {
      name: "Member",
      icon: User,
      color: "text-gray-500",
    },
  }

  const config = state?.role ? roleConfig[state.role] : roleConfig.member
  const RoleIcon = config.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RoleIcon className={`h-5 w-5 ${config.color}`} />
            Permissions for {memberName}
          </DialogTitle>
          <DialogDescription>
            Customize permissions for this user. Changes only affect {memberName}.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 space-y-6 mt-4">
            {PERMISSION_CATEGORIES.map((category) => (
              <div key={category.name}>
                <h4 className="text-sm font-medium mb-3 sticky top-0 bg-background py-1">
                  {category.name}
                </h4>
                <div className="space-y-2">
                  {category.permissions.map((permission) => {
                    const perm = permissionsMap[permission.key]
                    const isEnabled = perm?.is_enabled ?? false
                    const isOverride = perm?.is_override ?? false
                    const roleDefault = perm?.role_default ?? false
                    const isUpdating = updating === permission.key

                    return (
                      <div
                        key={permission.key}
                        className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
                          isOverride ? "bg-amber-50 dark:bg-amber-950/20" : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="space-y-0.5 flex-1 mr-4">
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={permission.key}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {permission.label}
                            </Label>
                            {isOverride && (
                              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                (customized)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {permission.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isUpdating && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          {isOverride && !isUpdating && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => resetToDefault(permission.key)}
                              title={`Reset to role default (${roleDefault ? "enabled" : "disabled"})`}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Reset
                            </Button>
                          )}
                          <Switch
                            id={permission.key}
                            checked={isEnabled}
                            onCheckedChange={() =>
                              togglePermission(permission.key, isEnabled)
                            }
                            disabled={isUpdating}
                            className="data-[state=unchecked]:!bg-gray-400 data-[state=checked]:!bg-sky-500"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
