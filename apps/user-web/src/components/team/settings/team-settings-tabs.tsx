"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dreamteam/ui/tabs"
import { CreditCard, Key, Plug, Settings, Shield, Users, Zap } from "lucide-react"
import { WorkspaceSettingsTab } from "./workspace-settings-tab"
import { RolesPermissionsTab } from "./roles-permissions-tab"
import { FeatureAccessTab } from "./feature-access-tab"
import { ApiKeysTab } from "./api-keys-tab"
import { BillingTab } from "./billing-tab"
import { IntegrationsTab } from "./integrations-tab"
import {
  TeamMembersCard,
  PendingInvitesCard,
  type TeamMember,
  type PendingInvite,
  type ProductId,
} from "@/components/team"

interface TeamSettingsTabsProps {
  workspaceId: string
  currentUserId: string | undefined
  currentUserRole: "owner" | "admin" | "member" | null
  teamMembers: TeamMember[]
  pendingInvites: PendingInvite[]
  isLoading: boolean
  onUpdateRole: (memberId: string, role: "admin" | "member") => Promise<void>
  onUpdateProducts: (memberId: string, products: ProductId[]) => Promise<void>
  onRemoveMember: (memberId: string) => Promise<void>
  onGenerateInvite: (role: "admin" | "member") => Promise<void>
  onRevokeInvite: (inviteId: string) => Promise<void>
}

export function TeamSettingsTabs({
  workspaceId,
  currentUserId,
  currentUserRole,
  teamMembers,
  pendingInvites,
  isLoading,
  onUpdateRole,
  onUpdateProducts,
  onRemoveMember,
  onGenerateInvite,
  onRevokeInvite,
}: TeamSettingsTabsProps) {
  const [activeTab, setActiveTab] = useState("members")

  const isOwner = currentUserRole === "owner"
  const isAdmin = currentUserRole === "admin"
  const canManageMembers = isOwner || isAdmin

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Team Settings</h2>
        <p className="text-muted-foreground mt-1">
          Manage your team, permissions, and workspace settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="members" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="workspace" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <Settings className="h-4 w-4" />
            Workspace
          </TabsTrigger>
          <TabsTrigger value="roles" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="access" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <Zap className="h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <Plug className="h-4 w-4" />
            Import
          </TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Members & Invites Tab */}
        <TabsContent value="members">
          <div className="space-y-6">
            <TeamMembersCard
              members={teamMembers}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole ?? undefined}
              workspaceId={workspaceId}
              isLoading={isLoading}
              onUpdateRole={onUpdateRole}
              onUpdateProducts={onUpdateProducts}
              onRemoveMember={onRemoveMember}
              onInviteClick={() => {
                document.getElementById("pending-invites-card")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
                onGenerateInvite("member")
              }}
            />

            <div id="pending-invites-card">
              <PendingInvitesCard
                invites={pendingInvites}
                isLoading={isLoading}
                canInvite={canManageMembers}
                onGenerateInvite={onGenerateInvite}
                onRevokeInvite={onRevokeInvite}
              />
            </div>
          </div>
        </TabsContent>

        {/* Workspace Settings Tab */}
        <TabsContent value="workspace">
          <WorkspaceSettingsTab workspaceId={workspaceId} isOwner={isOwner} />
        </TabsContent>

        {/* Roles & Permissions Tab */}
        <TabsContent value="roles">
          <RolesPermissionsTab workspaceId={workspaceId} />
        </TabsContent>

        {/* Feature Access Tab */}
        <TabsContent value="access">
          <FeatureAccessTab
            workspaceId={workspaceId}
            isOwner={isOwner}
            members={teamMembers.map((m) => ({
              id: m.id,
              role: m.role,
              allowed_products: m.allowed_products || [],
              profile: m.profile ? { name: m.profile.name } : null,
            }))}
            onUpdateProducts={onUpdateProducts}
          />
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys">
          <ApiKeysTab
            workspaceId={workspaceId}
            isOwner={isOwner}
            isAdmin={isAdmin}
          />
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <IntegrationsTab
            workspaceId={workspaceId}
            isOwner={isOwner}
            isAdmin={isAdmin}
          />
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <BillingTab
            workspaceId={workspaceId}
            isOwner={isOwner}
            teamMemberCount={teamMembers.length}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
