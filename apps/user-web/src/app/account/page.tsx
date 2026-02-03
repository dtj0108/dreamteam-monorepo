"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useUser } from "@/hooks/use-user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Loader2, Trash2, Upload, Building2, Shield, Crown, UserIcon, Bell, CreditCard, RotateCcw, Globe } from "lucide-react"
import type { IndustryType } from "@/lib/types"
import { INDUSTRY_TYPE_LABELS, INDUSTRY_TYPE_DESCRIPTIONS } from "@/lib/types"
import {
  TeamMembersCard,
  PendingInvitesCard,
  TeamSettingsTabs,
  BillingTab,
  type TeamMember,
  type PendingInvite,
  type ProductId,
} from "@/components/team"
import { NotificationsContent } from "@/components/notifications/notifications-content"
import { TimezoneSelect } from "@/components/team/settings/timezone-select"

// Section Header Component
function SectionHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 pb-5 border-b lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex gap-3">{children}</div>}
    </div>
  )
}

// Section Label Component
function SectionLabel({
  title,
  description,
  required,
}: {
  title: string
  description?: string
  required?: boolean
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">
        {title}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

// Form Row Component
function FormRow({
  label,
  description,
  required,
  children,
}: {
  label: string
  description?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 py-5 lg:grid-cols-[minmax(200px,280px)_minmax(400px,512px)] lg:gap-8">
        <SectionLabel title={label} description={description} required={required} />
        <div className="flex-1">{children}</div>
      </div>
      <hr className="border-border" />
    </>
  )
}

function AccountPageContent() {
  const { user, loading: userLoading, refreshUser } = useUser()
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get("tab")
  const [selectedTab, setSelectedTab] = useState(tabFromUrl || "details")

  // Profile form state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [industryType, setIndustryType] = useState<IndustryType>("general")
  const [workspaceTimezone, setWorkspaceTimezone] = useState("UTC")
  const [timezoneLoading, setTimezoneLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Team state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [teamLoading, setTeamLoading] = useState(true)

  // Get workspace info from user
  const workspaceId = user?.workspaceId
  const currentUserRole = user?.workspaceRole || "member"

  // Delete state
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Redo onboarding state
  const [redoLoading, setRedoLoading] = useState(false)

  // Fetch team data
  const fetchTeamData = useCallback(async () => {
    if (!workspaceId) return
    setTeamLoading(true)

    try {
      const membersRes = await fetch(`/api/team/members?workspaceId=${workspaceId}`)
      if (membersRes.ok) {
        const members = await membersRes.json()
        setTeamMembers(members)
      }

      const invitesRes = await fetch(`/api/team/invites?workspaceId=${workspaceId}`)
      if (invitesRes.ok) {
        const invites = await invitesRes.json()
        setPendingInvites(invites)
      }

      // Fetch workspace settings including timezone
      const workspaceRes = await fetch(`/api/team/workspace?workspaceId=${workspaceId}`)
      if (workspaceRes.ok) {
        const workspace = await workspaceRes.json()
        setWorkspaceTimezone(workspace.timezone || "UTC")
      }
    } catch (error) {
      console.error("Failed to fetch team data:", error)
    } finally {
      setTeamLoading(false)
    }
  }, [workspaceId])

  // Team handlers
  const handleGenerateInvite = async (role: "admin" | "member") => {
    if (!workspaceId) {
      throw new Error("No workspace available")
    }
    const res = await fetch("/api/team/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, role }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to generate invite")
    }
    fetchTeamData()
  }

  const handleRevokeInvite = async (inviteId: string) => {
    const res = await fetch(`/api/team/invites/${inviteId}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to revoke invite")
    }
    setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId))
  }

  const handleUpdateMemberRole = async (memberId: string, newRole: "admin" | "member") => {
    const res = await fetch(`/api/team/members/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to update role")
    }
    fetchTeamData()
  }

  const handleUpdateProducts = async (memberId: string, products: ProductId[]) => {
    const res = await fetch(`/api/team/members/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowedProducts: products }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to update products")
    }
    fetchTeamData()
  }

  const handleRemoveMember = async (memberId: string) => {
    const res = await fetch(`/api/team/members/${memberId}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to remove member")
    }
    setTeamMembers((prev) => prev.filter((m) => m.id !== memberId))
  }

  const handleTimezoneChange = async (newTimezone: string) => {
    if (!workspaceId || currentUserRole !== "owner") return

    setWorkspaceTimezone(newTimezone)
    setTimezoneLoading(true)

    try {
      const res = await fetch("/api/team/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, timezone: newTimezone }),
      })

      if (!res.ok) {
        const data = await res.json()
        console.error("Failed to update timezone:", data.error)
        // Revert on error
        fetchTeamData()
      }
    } catch (error) {
      console.error("Error updating timezone:", error)
      fetchTeamData()
    } finally {
      setTimezoneLoading(false)
    }
  }

  useEffect(() => {
    if (workspaceId) {
      fetchTeamData()
    }
  }, [workspaceId, fetchTeamData])

  // Sync tab state with URL parameter only on initial mount or URL change
  useEffect(() => {
    if (tabFromUrl) {
      setSelectedTab(tabFromUrl)
    }
  }, [tabFromUrl])

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      const nameParts = (user.name || "").split(" ")
      setFirstName(nameParts[0] || "")
      setLastName(nameParts.slice(1).join(" ") || "")
      setEmail(user.email || "")
      setPhone(user.phone || "")
      setCompanyName(user.companyName || "")
      setIndustryType(user.industryType || "general")
    }
  }, [user])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileMessage(null)

    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${firstName} ${lastName}`.trim(),
          email,
          phone,
          company_name: companyName,
          industry_type: industryType,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setProfileMessage({ type: "error", text: data.error || "Failed to update profile" })
        return
      }

      setProfileMessage({ type: "success", text: "Profile updated successfully" })
      refreshUser()
    } catch {
      setProfileMessage({ type: "error", text: "An error occurred" })
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordMessage(null)

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Passwords do not match" })
      setPasswordLoading(false)
      return
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "Password must be at least 8 characters" })
      setPasswordLoading(false)
      return
    }

    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await response.json()
      if (!response.ok) {
        setPasswordMessage({ type: "error", text: data.error || "Failed to change password" })
        return
      }

      setPasswordMessage({ type: "success", text: "Password changed successfully" })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      setPasswordMessage({ type: "error", text: "An error occurred" })
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    try {
      const response = await fetch("/api/account", { method: "DELETE" })
      if (!response.ok) {
        const data = await response.json()
        alert(data.error || "Failed to delete account")
        return
      }
      window.location.href = "/login"
    } catch {
      alert("An error occurred while deleting your account")
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleRedoOnboarding = async () => {
    setRedoLoading(true)
    try {
      const response = await fetch("/api/account/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingCompleted: false }),
        credentials: "include",
      })
      if (response.ok) {
        window.location.href = "/onboarding"
      } else {
        const data = await response.json()
        alert(data.error || "Failed to reset onboarding status")
      }
    } catch (error) {
      console.error("Redo onboarding error:", error)
      alert("An error occurred while resetting onboarding")
    } finally {
      setRedoLoading(false)
    }
  }

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"

  if (userLoading) {
    return (
      <DashboardLayout breadcrumbs={[{ label: "Settings" }]}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  const tabs = [
    { id: "details", label: "My details" },
    { id: "team", label: "Team" },
    { id: "notifications", label: "Notifications" },
    { id: "billing", label: "Billing" },
  ]

  return (
    <DashboardLayout breadcrumbs={[{ label: "Settings" }]}>
      <div className="flex flex-col gap-6 max-w-4xl">
        {/* Page Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Mobile Tab Selector */}
        <Select value={selectedTab} onValueChange={setSelectedTab}>
          <SelectTrigger className="md:hidden w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab) => (
              <SelectItem key={tab.id} value={tab.id}>
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tabs - Button Minimal Style */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <div className="hidden md:block overflow-x-auto scrollbar-hide -my-1 py-1">
            <TabsList className="inline-flex h-auto w-max gap-1 rounded-lg bg-muted/50 p-1">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* My Details Tab */}
          <TabsContent value="details" className="mt-6 space-y-8">
            {/* Organization Card */}
            {user?.workspaceId && (
              <div className="rounded-lg border bg-muted/30 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{user.workspaceName || "Your Organization"}</h3>
                    <div className="mt-2 flex items-center gap-2">
                      {currentUserRole === "owner" ? (
                        <>
                          <Crown className="h-4 w-4 text-amber-500" />
                          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Owner</span>
                        </>
                      ) : currentUserRole === "admin" ? (
                        <>
                          <Shield className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Admin</span>
                        </>
                      ) : (
                        <>
                          <UserIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">Member</span>
                        </>
                      )}
                      <span className="text-sm text-muted-foreground">
                        · {teamMembers.length} {teamMembers.length === 1 ? "member" : "members"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {currentUserRole === "owner" 
                        ? "You have full control over this organization, including billing and team management."
                        : currentUserRole === "admin"
                        ? "You can invite and manage team members."
                        : "You're a member of this organization."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleProfileSubmit}>
              <SectionHeader
                title="Personal info"
                description="Update your photo and personal details here."
              >
                <Button type="button" variant="outline" onClick={() => {
                  if (user) {
                    const nameParts = (user.name || "").split(" ")
                    setFirstName(nameParts[0] || "")
                    setLastName(nameParts.slice(1).join(" ") || "")
                    setEmail(user.email || "")
                    setPhone(user.phone || "")
                    setCompanyName(user.companyName || "")
                  }
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={profileLoading}>
                  {profileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </SectionHeader>

              <div className="mt-6">
                <FormRow label="Name" required>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                    <Input
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </FormRow>

                <FormRow label="Email address" required>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </FormRow>

                <FormRow label="Your photo" description="This will be displayed on your profile.">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                    </Avatar>
                    <Button type="button" variant="outline" size="sm">
                      <Upload className="mr-2 h-4 w-4" />
                      Change photo
                    </Button>
                  </div>
                </FormRow>

                <FormRow label="Phone number">
                  <Input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </FormRow>

                <FormRow label="Company">
                  <Input
                    placeholder="Company name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </FormRow>

                <FormRow label="Industry" description={INDUSTRY_TYPE_DESCRIPTIONS[industryType]}>
                  <Select value={industryType} onValueChange={(v) => setIndustryType(v as IndustryType)}>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(INDUSTRY_TYPE_LABELS) as IndustryType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          {INDUSTRY_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormRow>

                <FormRow
                  label="Workspace Timezone"
                  description={
                    currentUserRole === "owner"
                      ? "Affects all scheduled agent tasks for your team"
                      : "Set by workspace owner. Affects all scheduled agent tasks."
                  }
                >
                  <div className="max-w-xs">
                    <TimezoneSelect
                      value={workspaceTimezone}
                      onValueChange={handleTimezoneChange}
                      disabled={currentUserRole !== "owner" || timezoneLoading}
                    />
                    {currentUserRole !== "owner" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Only workspace owners can change the timezone
                      </p>
                    )}
                  </div>
                </FormRow>

                {profileMessage && (
                  <p className={`mt-4 text-sm ${profileMessage.type === "error" ? "text-destructive" : "text-green-600"}`}>
                    {profileMessage.text}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
                <Button type="button" variant="outline">Cancel</Button>
                <Button type="submit" disabled={profileLoading}>
                  {profileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </form>

            {/* Password Section */}
            <form onSubmit={handlePasswordSubmit} className="mt-8">
              <SectionHeader
                title="Password"
                description="Update your password to keep your account secure."
              />

              <div className="mt-6">
                <FormRow label="Current password" required>
                  <Input
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </FormRow>

                <FormRow label="New password" required description="Must be at least 8 characters.">
                  <Input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </FormRow>

                <FormRow label="Confirm password" required>
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </FormRow>

                {passwordMessage && (
                  <p className={`mt-4 text-sm ${passwordMessage.type === "error" ? "text-destructive" : "text-green-600"}`}>
                    {passwordMessage.text}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
                <Button type="button" variant="outline" onClick={() => {
                  setCurrentPassword("")
                  setNewPassword("")
                  setConfirmPassword("")
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={passwordLoading}>
                  {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update password
                </Button>
              </div>
            </form>

            {/* Onboarding Preferences Section */}
            <div className="mt-8">
              <SectionHeader
                title="Onboarding Preferences"
                description="Review and update your initial setup preferences"
              />
              <div className="mt-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Restart the onboarding wizard to update your preferences, industry settings, and initial configuration.
                </p>
                <Button
                  variant="outline"
                  onClick={handleRedoOnboarding}
                  disabled={redoLoading}
                >
                  {redoLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Redo Onboarding
                </Button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="mt-12 p-6 border border-destructive/50 rounded-lg">
              <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleteLoading}>
                    {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      account and remove all your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, delete my account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="mt-6">
            {workspaceId ? (
              <TeamSettingsTabs
                workspaceId={workspaceId}
                currentUserId={user?.id}
                currentUserRole={currentUserRole}
                teamMembers={teamMembers}
                pendingInvites={pendingInvites}
                isLoading={teamLoading}
                onUpdateRole={handleUpdateMemberRole}
                onUpdateProducts={handleUpdateProducts}
                onRemoveMember={handleRemoveMember}
                onGenerateInvite={handleGenerateInvite}
                onRevokeInvite={handleRevokeInvite}
              />
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No workspace selected</p>
              </div>
            )}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-6">
            <NotificationsContent />
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="mt-6">
            {workspaceId ? (
              <BillingTab
                workspaceId={workspaceId}
                isOwner={currentUserRole === "owner"}
                teamMemberCount={teamMembers.length}
              />
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No workspace selected</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

export default function AccountPage() {
  return (
    <Suspense fallback={
      <DashboardLayout breadcrumbs={[{ label: "Settings" }]}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    }>
      <AccountPageContent />
    </Suspense>
  )
}
