"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Users,
  MoreHorizontal,
  Shield,
  Crown,
  User,
  Loader2,
  UserPlus,
  Settings,
} from "lucide-react"
import { RolePermissionsModal } from "./role-permissions-modal"

export type ProductId = "finance" | "sales" | "team" | "projects" | "knowledge" | "agents"

const ALL_PRODUCTS: ProductId[] = ["finance", "sales", "team", "projects", "knowledge", "agents"]

export interface TeamMember {
  id: string
  profile: {
    id: string
    name: string | null
    email: string
    avatar_url?: string | null
  }
  role: "owner" | "admin" | "member"
  joined_at: string
  allowed_products?: ProductId[]
}

interface TeamMembersCardProps {
  members: TeamMember[]
  currentUserId?: string
  currentUserRole?: "owner" | "admin" | "member"
  workspaceId?: string
  isLoading?: boolean
  onUpdateRole?: (memberId: string, newRole: "admin" | "member") => Promise<void>
  onUpdateProducts?: (memberId: string, products: ProductId[]) => Promise<void>
  onRemoveMember?: (memberId: string) => Promise<void>
  onInviteClick?: () => void
}

const roleConfig = {
  owner: { label: "Owner", icon: Crown, color: "bg-amber-500" },
  admin: { label: "Admin", icon: Shield, color: "bg-blue-500" },
  member: { label: "Member", icon: User, color: "bg-gray-500" },
}

const productConfig: Record<ProductId, { label: string; emoji: string }> = {
  finance: { label: "Finance", emoji: "💰" },
  sales: { label: "Sales", emoji: "🤝" },
  team: { label: "Team", emoji: "💬" },
  projects: { label: "Projects", emoji: "📋" },
  knowledge: { label: "Knowledge", emoji: "📚" },
  agents: { label: "Agents", emoji: "🤖" },
}

export function TeamMembersCard({
  members,
  currentUserId,
  currentUserRole,
  workspaceId,
  isLoading = false,
  onUpdateRole,
  onUpdateProducts,
  onRemoveMember,
  onInviteClick,
}: TeamMembersCardProps) {
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null)
  const [permissionsMember, setPermissionsMember] = useState<TeamMember | null>(null)

  const canManageMembers = currentUserRole === "owner" || currentUserRole === "admin"

  const getDisplayName = (member: TeamMember) =>
    member.profile.name?.trim() || member.profile.email || "Unknown User"

  const getInitials = (name?: string | null) => {
    const normalizedName = name?.trim()
    if (!normalizedName) return "?"

    return normalizedName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleUpdateRole = async (memberId: string, newRole: "admin" | "member") => {
    if (!onUpdateRole) return
    setUpdatingId(memberId)
    try {
      await onUpdateRole(memberId, newRole)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleToggleProduct = async (member: TeamMember, productId: ProductId) => {
    if (!onUpdateProducts) return
    const currentProducts = member.allowed_products || ALL_PRODUCTS
    const hasProduct = currentProducts.includes(productId)
    
    let newProducts: ProductId[]
    if (hasProduct) {
      // Remove product (but ensure at least one product remains)
      newProducts = currentProducts.filter((p) => p !== productId)
      if (newProducts.length === 0) return // Don't allow removing all products
    } else {
      // Add product
      newProducts = [...currentProducts, productId]
    }

    setUpdatingId(member.id)
    try {
      await onUpdateProducts(member.id, newProducts)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleRemoveMember = async () => {
    if (!confirmRemove || !onRemoveMember) return
    setRemovingId(confirmRemove.id)
    try {
      await onRemoveMember(confirmRemove.id)
    } finally {
      setRemovingId(null)
      setConfirmRemove(null)
    }
  }

  const canModifyMember = (member: TeamMember) => {
    // Can't modify yourself
    if (member.profile.id === currentUserId) return false
    // Can't modify owner
    if (member.role === "owner") return false
    // Admins and owners can modify other admins' roles
    return canManageMembers
  }

  const canRemoveMember = (member: TeamMember) => {
    // Can't remove yourself
    if (member.profile.id === currentUserId) return false
    // Can't remove owner
    if (member.role === "owner") return false
    // Only owner can remove admins
    if (member.role === "admin" && currentUserRole !== "owner") return false
    return canManageMembers
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-sky-600" />
              <CardTitle>Team Members</CardTitle>
            </div>
            {canManageMembers && onInviteClick && (
              <Button onClick={onInviteClick} size="sm">
                <UserPlus className="size-4 mr-2" />
                Invite Member
              </Button>
            )}
          </div>
          <CardDescription>
            {members.length} member{members.length !== 1 && "s"} in your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No team members yet. Invite someone to get started!
            </p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => {
                const config = roleConfig[member.role] || roleConfig.member
                const Icon = config.icon
                const isCurrentUser = member.profile.id === currentUserId
                const canModify = canModifyMember(member)
                const canRemove = canRemoveMember(member)
                const memberProducts = member.allowed_products || ALL_PRODUCTS

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <Avatar className="size-10">
                      <AvatarImage src={member.profile.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(member.profile.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {getDisplayName(member)}
                          {isCurrentUser && (
                            <span className="text-muted-foreground ml-1">(you)</span>
                          )}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {member.profile.email}
                      </p>
                    </div>
                    
                    {/* Products badges */}
                    <div className="hidden sm:flex items-center gap-0.5">
                      {ALL_PRODUCTS.map((productId) => {
                        const productCfg = productConfig[productId]
                        const hasAccess = member.role === "owner" || memberProducts.includes(productId)
                        return (
                          <span
                            key={productId}
                            className={`text-base ${hasAccess ? "" : "grayscale opacity-30"}`}
                            title={`${productCfg.label}: ${hasAccess ? "Enabled" : "Disabled"}`}
                          >
                            {productCfg.emoji}
                          </span>
                        )
                      })}
                    </div>

                    <Badge
                      variant="secondary"
                      className={`${config.color} text-white gap-1`}
                    >
                      <Icon className="size-3" />
                      {config.label}
                    </Badge>
                    
                    {canModify && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            disabled={updatingId === member.id || removingId === member.id}
                          >
                            {updatingId === member.id || removingId === member.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="size-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Role</DropdownMenuLabel>
                          {member.role === "member" && (
                            <DropdownMenuItem
                              onClick={() => handleUpdateRole(member.id, "admin")}
                            >
                              <Shield className="size-4 mr-2" />
                              Make Admin
                            </DropdownMenuItem>
                          )}
                          {member.role === "admin" && (
                            <DropdownMenuItem
                              onClick={() => handleUpdateRole(member.id, "member")}
                            >
                              <User className="size-4 mr-2" />
                              Make Member
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Product Access</DropdownMenuLabel>
                          {ALL_PRODUCTS.map((productId) => {
                            const productCfg = productConfig[productId]
                            const isChecked = memberProducts.includes(productId)
                            const isLastProduct = memberProducts.length === 1 && isChecked

                            return (
                              <DropdownMenuCheckboxItem
                                key={productId}
                                checked={isChecked}
                                disabled={isLastProduct}
                                onCheckedChange={() => handleToggleProduct(member, productId)}
                              >
                                <span className="mr-2">{productCfg.emoji}</span>
                                {productCfg.label}
                              </DropdownMenuCheckboxItem>
                            )
                          })}
                          
                          {workspaceId && member.role !== "owner" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setPermissionsMember(member)}
                              >
                                <Settings className="size-4 mr-2" />
                                Manage Permissions
                              </DropdownMenuItem>
                            </>
                          )}

                          {canRemove && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setConfirmRemove(member)}
                                className="text-destructive focus:text-destructive"
                              >
                                Remove from team
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {confirmRemove ? getDisplayName(confirmRemove) : "this member"} from
              the team? They will lose access to all team resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removingId ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {permissionsMember && permissionsMember.role !== "owner" && (
        <RolePermissionsModal
          open={!!permissionsMember}
          onOpenChange={(open) => !open && setPermissionsMember(null)}
          memberId={permissionsMember.id}
          memberName={getDisplayName(permissionsMember)}
        />
      )}
    </>
  )
}
