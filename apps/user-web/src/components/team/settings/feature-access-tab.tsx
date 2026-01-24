"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@dreamteam/ui/card"
import { Switch } from "@dreamteam/ui/switch"
import { Checkbox } from "@dreamteam/ui/checkbox"
import { Label } from "@dreamteam/ui/label"
import { Badge } from "@dreamteam/ui/badge"
import {
  BarChart3,
  BookOpen,
  Bot,
  Briefcase,
  Code,
  DollarSign,
  FlaskConical,
  FolderKanban,
  Link,
  Loader2,
  MessageSquare,
  Sparkles,
} from "lucide-react"
import { type ProductId } from "@/components/team"
import { FEATURE_FLAGS, type FeatureFlagKey, type WorkspaceFeatureFlag } from "@/types/team-settings"

interface FeatureAccessTabProps {
  workspaceId: string
  isOwner: boolean
  members: Array<{
    id: string
    role: string
    allowed_products: ProductId[]
    profile: { name: string } | null
  }>
  onUpdateProducts: (memberId: string, products: ProductId[]) => Promise<void>
}

// Products available in the system (matching existing ProductId type)
const PRODUCTS: { id: ProductId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "finance", label: "Finance", icon: DollarSign },
  { id: "sales", label: "Sales", icon: Briefcase },
  { id: "team", label: "Team", icon: MessageSquare },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "agents", label: "Agents", icon: Bot },
]

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  FlaskConical,
  BarChart3,
  Code,
  Link,
}

export function FeatureAccessTab({
  workspaceId,
  isOwner,
  members,
  onUpdateProducts,
}: FeatureAccessTabProps) {
  const [featureFlags, setFeatureFlags] = useState<WorkspaceFeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [updatingProducts, setUpdatingProducts] = useState<string | null>(null)

  useEffect(() => {
    fetchFeatureFlags()
  }, [workspaceId])

  async function fetchFeatureFlags() {
    try {
      const res = await fetch(`/api/team/feature-flags?workspaceId=${workspaceId}`)
      if (res.ok) {
        const data = await res.json()
        setFeatureFlags(data)
      }
    } catch (error) {
      console.error("Failed to fetch feature flags:", error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleFeatureFlag(featureKey: FeatureFlagKey, currentValue: boolean) {
    setUpdating(featureKey)

    try {
      const res = await fetch("/api/team/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          feature_key: featureKey,
          is_enabled: !currentValue,
        }),
      })

      if (res.ok) {
        const updated = await res.json()
        setFeatureFlags((prev) =>
          prev.map((f) =>
            f.feature_key === featureKey ? { ...f, is_enabled: updated.is_enabled } : f
          )
        )
      }
    } catch (error) {
      console.error("Failed to update feature flag:", error)
    } finally {
      setUpdating(null)
    }
  }

  async function handleProductToggle(memberId: string, productId: ProductId, currentProducts: ProductId[]) {
    setUpdatingProducts(memberId)

    const hasProduct = currentProducts.includes(productId)
    let newProducts: ProductId[]

    if (hasProduct) {
      // Don't allow removing the last product
      if (currentProducts.length === 1) {
        setUpdatingProducts(null)
        return
      }
      newProducts = currentProducts.filter((p) => p !== productId)
    } else {
      newProducts = [...currentProducts, productId]
    }

    try {
      await onUpdateProducts(memberId, newProducts)
    } finally {
      setUpdatingProducts(null)
    }
  }

  // Create a map of feature key to enabled status
  const flagStatus = featureFlags.reduce((acc, f) => {
    acc[f.feature_key] = f.is_enabled
    return acc
  }, {} as Record<string, boolean>)

  // Filter out owners from product access matrix (they always have all)
  const editableMembers = members.filter((m) => m.role !== "owner")

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Product Access Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Product Access</CardTitle>
          <CardDescription>
            Control which products each team member can access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editableMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No team members to configure. Invite members to manage their product access.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium">Member</th>
                    <th className="text-left py-3 px-2 text-sm font-medium">Role</th>
                    {PRODUCTS.map((product) => {
                      const Icon = product.icon
                      return (
                        <th key={product.id} className="text-center py-3 px-2">
                          <div className="flex flex-col items-center gap-1">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium">{product.label}</span>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {editableMembers.map((member) => {
                    const isUpdating = updatingProducts === member.id
                    return (
                      <tr key={member.id} className="border-b last:border-0">
                        <td className="py-3 px-2">
                          <span className="text-sm font-medium">
                            {member.profile?.name || "Unknown"}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {member.role}
                          </Badge>
                        </td>
                        {PRODUCTS.map((product) => {
                          const hasAccess = member.allowed_products?.includes(product.id)
                          return (
                            <td key={product.id} className="text-center py-3 px-2">
                              <div className="flex justify-center">
                                {isUpdating ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : (
                                  <Checkbox
                                    checked={hasAccess}
                                    onCheckedChange={() =>
                                      handleProductToggle(
                                        member.id,
                                        product.id,
                                        member.allowed_products || []
                                      )
                                    }
                                  />
                                )}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>
            Enable or disable workspace-wide features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {FEATURE_FLAGS.map((flag) => {
            const Icon = ICON_MAP[flag.icon]
            const isEnabled = flagStatus[flag.key] ?? false
            const isUpdating = updating === flag.key

            return (
              <div
                key={flag.key}
                className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={flag.key}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {flag.label}
                      </Label>
                      {flag.requiresPlan && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {flag.requiresPlan}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {flag.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isUpdating && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <Switch
                    id={flag.key}
                    checked={isEnabled}
                    onCheckedChange={() => toggleFeatureFlag(flag.key, isEnabled)}
                    disabled={!isOwner || isUpdating}
                  />
                </div>
              </div>
            )
          })}

          {!isOwner && (
            <p className="text-sm text-muted-foreground mt-4 pt-4 border-t">
              Only the workspace owner can modify feature flags
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
