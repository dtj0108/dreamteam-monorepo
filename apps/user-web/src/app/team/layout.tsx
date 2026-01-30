"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { ProductGate } from "@/components/product-gate"
import { TeamProvider, useTeam } from "@/providers/team-provider"
import { MeetingProvider } from "@/providers/meeting-provider"
import { CreateChannelDialog, StartDMDialog, TeamSidebar } from "@/components/team"

function TeamLayoutContent({ children }: { children: React.ReactNode }) {
  const {
    channels,
    directMessages,
    showCreateChannel,
    setShowCreateChannel,
    showStartDM,
    setShowStartDM,
    createChannel,
    startDM,
    workspaceId,
    userId,
  } = useTeam()

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Team Sidebar - always visible */}
      <TeamSidebar
        channels={channels}
        directMessages={directMessages}
        workspaceId={workspaceId}
        onCreateChannel={() => setShowCreateChannel(true)}
        onStartDM={() => setShowStartDM(true)}
      />

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
        style={{ viewTransitionName: "team-content" }}
      >
        {children}
      </div>

      {/* Create Channel Dialog */}
      <CreateChannelDialog
        open={showCreateChannel}
        onOpenChange={setShowCreateChannel}
        onCreateChannel={createChannel}
      />

      {/* Start DM Dialog */}
      <StartDMDialog
        open={showStartDM}
        onOpenChange={setShowStartDM}
        workspaceId={workspaceId}
        currentUserId={userId}
        onStartDM={startDM}
      />
    </div>
  )
}

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProductGate product="team">
      <DashboardLayout
        breadcrumbs={[{ label: "Team", href: "/team" }]}
        noPadding
        defaultCollapsed
      >
        <TeamProvider>
          <MeetingProvider>
            <TeamLayoutContent>{children}</TeamLayoutContent>
          </MeetingProvider>
        </TeamProvider>
      </DashboardLayout>
    </ProductGate>
  )
}
