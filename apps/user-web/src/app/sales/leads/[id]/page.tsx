"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  BuildingIcon,
  MoreHorizontalIcon,
  FileTextIcon,
  MailIcon,
  PhoneIcon,
  MessageSquareIcon,
  ChevronDownIcon,
  MapPinIcon,
  GlobeIcon,
  AlignLeftIcon,
  CheckCircle2Icon,
  LightbulbIcon,
  UsersIcon,
  TrashIcon,
  CheckIcon,
} from "lucide-react"
import { CollapsibleSection } from "@/components/sales/collapsible-section"
import { LeadForm, type Lead } from "@/components/sales/lead-form"
import { ContactForm, type Contact } from "@/components/sales/contact-form"
import { TaskForm, type LeadTask } from "@/components/sales/task-form"
import { OpportunityForm, type LeadOpportunity } from "@/components/sales/opportunity-form"
import { LeadActivityTimeline } from "@/components/sales/lead-activity-timeline"
import { CommunicationPanel } from "@/components/sales/communication-panel"
import { SmsDialog, NoteDialog, EmailDialog } from "@/components/sales/lead-quick-actions"
import { LeadTagsSection } from "@/components/sales/lead-tags-section"
import { useCall } from "@/providers"

interface Activity {
  id: string
  type: "call" | "email" | "meeting" | "note" | "task"
  subject?: string
  description?: string
  contact_id?: string
  contact?: {
    id: string
    first_name: string
    last_name?: string
  }
  is_completed: boolean
  completed_at?: string
  due_date?: string
  created_at: string
}

interface LeadStage {
  id: string
  name: string
  color: string | null
  position: number
  pipeline_id: string
}

interface Pipeline {
  id: string
  name: string
  is_default: boolean
  stages: LeadStage[]
}

interface LeadTag {
  id: string
  name: string
  color: string
}

interface LeadWithRelations extends Lead {
  id: string
  contacts: Contact[]
  activities: Activity[]
  tasks: LeadTask[]
  opportunities: LeadOpportunity[]
  tags?: LeadTag[]
  created_at: string
  updated_at: string
  pipeline_id?: string | null
  stage_id?: string | null
  stage?: LeadStage | null
}

const statusOptions = [
  { value: "new", label: "New", color: "bg-blue-500" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-500" },
  { value: "qualified", label: "Qualified", color: "bg-emerald-500" },
  { value: "unqualified", label: "Unqualified", color: "bg-gray-500" },
  { value: "converted", label: "Converted", color: "bg-purple-500" },
]

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [lead, setLead] = React.useState<LeadWithRelations | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [editFormOpen, setEditFormOpen] = React.useState(false)
  const [contactFormOpen, setContactFormOpen] = React.useState(false)
  const [editingContact, setEditingContact] = React.useState<Contact | undefined>()
  const [taskFormOpen, setTaskFormOpen] = React.useState(false)
  const [opportunityFormOpen, setOpportunityFormOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [contactSearch, setContactSearch] = React.useState("")
  const [smsDialogOpen, setSmsDialogOpen] = React.useState(false)
  const [noteDialogOpen, setNoteDialogOpen] = React.useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false)
  const [emailContact, setEmailContact] = React.useState<Contact | undefined>()
  const [ownedNumbers, setOwnedNumbers] = React.useState<{ id: string; phone_number: string; is_primary: boolean }[]>([])
  const [pipelines, setPipelines] = React.useState<Pipeline[]>([])
  const { initiateCall, deviceState } = useCall()

  const fetchLead = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setLead(data)
      } else if (res.status === 404) {
        router.push("/sales/leads")
      }
    } catch (error) {
      console.error("Error fetching lead:", error)
    } finally {
      setIsLoading(false)
    }
  }, [params.id, router])

  React.useEffect(() => {
    fetchLead()
  }, [fetchLead])

  // Fetch owned phone numbers for calling
  React.useEffect(() => {
    fetch("/api/twilio/numbers/owned")
      .then((res) => res.json())
      .then((data) => {
        setOwnedNumbers(data.numbers || [])
      })
      .catch((err) => console.error("Failed to fetch owned numbers:", err))
  }, [])

  // Fetch pipelines for the stage selector
  React.useEffect(() => {
    fetch("/api/lead-pipelines")
      .then((res) => res.json())
      .then((data) => {
        setPipelines(data || [])
      })
      .catch((err) => console.error("Failed to fetch pipelines:", err))
  }, [])

  // Call a specific contact - pass contact or defaults to first with phone
  const handleCallContact = async (contact?: Contact) => {
    if (!lead) return

    const targetContact = contact || lead.contacts?.find((c) => c.phone)
    if (!targetContact?.phone || !targetContact.id) return

    const primaryNumber = ownedNumbers.find((n) => n.is_primary) || ownedNumbers[0]
    if (!primaryNumber) return

    const contactName = targetContact.last_name
      ? `${targetContact.first_name} ${targetContact.last_name}`
      : targetContact.first_name

    // Use Twilio Device to make the call directly from the browser
    await initiateCall({
      phoneNumber: targetContact.phone,
      contactName,
      leadId: lead.id,
      contactId: targetContact.id,
      fromNumber: primaryNumber.phone_number,
    })
  }

  const handleUpdateLead = async (updatedLead: Lead) => {
    const res = await fetch(`/api/leads/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedLead),
    })
    if (!res.ok) throw new Error("Failed to update lead")
    fetchLead()
  }

  const handleStatusChange = async (status: string) => {
    await handleUpdateLead({ ...lead!, status })
  }

  const handleStageChange = async (stageId: string, pipelineId: string) => {
    const res = await fetch(`/api/leads/${params.id}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage_id: stageId, pipeline_id: pipelineId }),
    })
    if (res.ok) fetchLead()
  }

  const handleDeleteLead = async () => {
    const res = await fetch(`/api/leads/${params.id}`, { method: "DELETE" })
    if (res.ok) router.push("/sales/leads")
  }

  const handleAddContact = async (contact: Contact) => {
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contact),
    })
    if (!res.ok) throw new Error("Failed to add contact")
    fetchLead()
  }

  const handleUpdateContact = async (contact: Contact) => {
    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contact),
    })
    if (!res.ok) throw new Error("Failed to update contact")
    setEditingContact(undefined)
    fetchLead()
  }

  const handleAddTask = async (task: LeadTask) => {
    const res = await fetch(`/api/leads/${params.id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    })
    if (!res.ok) throw new Error("Failed to add task")
    fetchLead()
  }

  const handleToggleTask = async (taskId: string, isCompleted: boolean) => {
    const res = await fetch(`/api/leads/${params.id}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_completed: isCompleted }),
    })
    if (res.ok) fetchLead()
  }

  const handleDeleteTask = async (taskId: string) => {
    const res = await fetch(`/api/leads/${params.id}/tasks/${taskId}`, {
      method: "DELETE",
    })
    if (res.ok) fetchLead()
  }

  const handleAddOpportunity = async (opportunity: LeadOpportunity) => {
    const res = await fetch(`/api/leads/${params.id}/opportunities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opportunity),
    })
    if (!res.ok) throw new Error("Failed to add opportunity")
    fetchLead()
  }

  const handleDeleteOpportunity = async (opportunityId: string) => {
    const res = await fetch(`/api/leads/${params.id}/opportunities/${opportunityId}`, {
      method: "DELETE",
    })
    if (res.ok) fetchLead()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Lead not found</p>
      </div>
    )
  }

  const currentStatus = statusOptions.find((s) => s.value === lead.status) || statusOptions[0]
  const filteredContacts = lead.contacts?.filter((c) =>
    contactSearch
      ? `${c.first_name} ${c.last_name}`.toLowerCase().includes(contactSearch.toLowerCase())
      : true
  )

  const primaryContact = lead.contacts?.[0]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <BuildingIcon className="size-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">{lead.name}</h1>
              <Badge variant="secondary" className="gap-1">
                <MailIcon className="size-3" />1
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <div className={`size-2 rounded-full ${currentStatus.color}`} />
                {currentStatus.label}
                <ChevronDownIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {statusOptions.map((status) => (
                <DropdownMenuItem
                  key={status.value}
                  onClick={() => handleStatusChange(status.value)}
                >
                  <div className={`size-2 rounded-full ${status.color} mr-2`} />
                  {status.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Pipeline/Stage Selector */}
          {pipelines.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <div
                    className="size-2 rounded-full"
                    style={{ backgroundColor: lead.stage?.color || "#6b7280" }}
                  />
                  <span className="text-muted-foreground">
                    {pipelines.find((p) => p.id === lead.pipeline_id)?.name || "No Pipeline"}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span>{lead.stage?.name || "No Stage"}</span>
                  <ChevronDownIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-80 overflow-y-auto">
                {pipelines.map((pipeline, index) => (
                  <div key={pipeline.id}>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      {pipeline.name}
                    </DropdownMenuLabel>
                    {pipeline.stages
                      ?.sort((a, b) => a.position - b.position)
                      .map((stage) => (
                        <DropdownMenuItem
                          key={stage.id}
                          onClick={() => handleStageChange(stage.id, pipeline.id)}
                        >
                          <div
                            className="size-2 rounded-full mr-2"
                            style={{ backgroundColor: stage.color || "#6b7280" }}
                          />
                          {stage.name}
                          {stage.id === lead.stage_id && (
                            <CheckIcon className="ml-auto size-4" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    {index < pipelines.length - 1 && <DropdownMenuSeparator />}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontalIcon className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditFormOpen(true)}>
                Edit Lead
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete Lead
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setNoteDialogOpen(true)}
          >
            <FileTextIcon className="size-4" />
            Note
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              setEmailContact(primaryContact)
              setEmailDialogOpen(true)
            }}
            disabled={!primaryContact?.email}
          >
            <MailIcon className="size-4" />
            Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setSmsDialogOpen(true)}
            disabled={!lead.contacts?.some((c) => c.phone)}
          >
            <MessageSquareIcon className="size-4" />
            SMS
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => handleCallContact()}
            disabled={!lead.contacts?.some((c) => c.phone) || !ownedNumbers.length || deviceState !== "ready"}
          >
            <PhoneIcon className="size-4" />
            {deviceState === "initializing" ? "Connecting..." : "Call"}
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[400px] border-r flex flex-col overflow-hidden">
          <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-border/50">
              <TabsList className="h-9 bg-muted/50 rounded-xl p-1 w-auto">
                <TabsTrigger
                  value="details"
                  className="rounded-lg px-4 data-[state=active]:shadow-sm transition-all"
                >
                  Details
                </TabsTrigger>
                <TabsTrigger
                  value="files"
                  className="rounded-lg px-4 data-[state=active]:shadow-sm transition-all"
                >
                  Files <Badge variant="secondary" className="ml-1.5 h-5">0</Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="details" className="flex-1 m-0 overflow-hidden min-h-0">
              <ScrollArea className="h-full">
                <div className="p-4">
                  {/* ABOUT Section */}
                  <CollapsibleSection
                    icon={<span className="text-base">ℹ️</span>}
                    title="ABOUT"
                  >
                    <div className="space-y-2 pl-6">
                      <button
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full text-left"
                        onClick={() => setEditFormOpen(true)}
                      >
                        <MapPinIcon className="size-4" />
                        {lead.address || lead.city ? (
                          <span>{[lead.address, lead.city, lead.state].filter(Boolean).join(", ")}</span>
                        ) : (
                          <span>Add address...</span>
                        )}
                      </button>
                      {lead.website && (
                        <a
                          href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <GlobeIcon className="size-4" />
                          {lead.website.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                      <button
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full text-left"
                        onClick={() => setEditFormOpen(true)}
                      >
                        <AlignLeftIcon className="size-4" />
                        {lead.notes ? (
                          <span className="line-clamp-2">{lead.notes}</span>
                        ) : (
                          <span>Add description...</span>
                        )}
                      </button>
                    </div>
                  </CollapsibleSection>

                  {/* TAGS Section */}
                  <LeadTagsSection
                    leadId={lead.id}
                    initialTags={lead.tags || []}
                    onTagsChange={fetchLead}
                  />

                  {/* TASKS Section */}
                  <CollapsibleSection
                    icon={<CheckCircle2Icon className="size-4" />}
                    title="TASKS"
                    count={lead.tasks?.length || 0}
                    onAdd={() => setTaskFormOpen(true)}
                  >
                    <div className="pl-6 space-y-2">
                      {lead.tasks?.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No tasks</p>
                      ) : (
                        lead.tasks?.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 group"
                          >
                            <Checkbox
                              checked={task.is_completed}
                              onCheckedChange={(checked) =>
                                handleToggleTask(task.id!, checked as boolean)
                              }
                            />
                            <span
                              className={`text-sm flex-1 ${
                                task.is_completed ? "line-through text-muted-foreground" : ""
                              }`}
                            >
                              {task.title}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 opacity-0 group-hover:opacity-100"
                              onClick={() => handleDeleteTask(task.id!)}
                            >
                              <TrashIcon className="size-3" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CollapsibleSection>

                  {/* OPPORTUNITIES Section */}
                  <CollapsibleSection
                    icon={<LightbulbIcon className="size-4" />}
                    title="OPPORTUNITIES"
                    count={lead.opportunities?.length || 0}
                    onAdd={() => setOpportunityFormOpen(true)}
                  >
                    <div className="pl-6 space-y-3">
                      {lead.opportunities?.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No opportunities</p>
                      ) : (
                        lead.opportunities?.map((opp) => {
                          const expectedValue = opp.value && opp.probability
                            ? opp.value * (opp.probability / 100)
                            : null
                          const statusColor = opp.status === 'won'
                            ? 'bg-emerald-100 text-emerald-800'
                            : opp.status === 'lost'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                          return (
                            <div
                              key={opp.id}
                              className="flex items-start justify-between group p-3 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/50"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{opp.name}</p>
                                  <Badge variant="secondary" className={`text-xs ${statusColor}`}>
                                    {opp.status || 'active'}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {opp.value
                                      ? `$${opp.value.toLocaleString()}${opp.value_type === 'recurring' ? '/mo' : ''}`
                                      : "No value"}
                                  </span>
                                  <span>•</span>
                                  <span>{opp.probability || 0}% confidence</span>
                                  {expectedValue && (
                                    <>
                                      <span>•</span>
                                      <span className="text-emerald-600">
                                        Exp: ${Math.round(expectedValue).toLocaleString()}
                                      </span>
                                    </>
                                  )}
                                </div>
                                {opp.expected_close_date && (
                                  <p className="text-xs text-muted-foreground">
                                    Close: {new Date(opp.expected_close_date).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6 opacity-0 group-hover:opacity-100"
                                onClick={() => handleDeleteOpportunity(opp.id!)}
                              >
                                <TrashIcon className="size-3" />
                              </Button>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </CollapsibleSection>

                  {/* CONTACTS Section */}
                  <CollapsibleSection
                    icon={<UsersIcon className="size-4" />}
                    title="CONTACTS"
                    count={lead.contacts?.length || 0}
                    onAdd={() => setContactFormOpen(true)}
                    showSearch
                    onSearch={() => {}}
                  >
                    <div className="pl-6 space-y-1">
                      <Input
                        placeholder="Search contacts..."
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        className="h-8 mb-2"
                      />
                      {filteredContacts?.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No contacts</p>
                      ) : (
                        filteredContacts?.map((contact) => (
                          <div
                            key={contact.id}
                            className="flex items-center justify-between py-2 group"
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="size-8">
                                <AvatarFallback className="text-xs">
                                  {contact.first_name?.[0]}
                                  {contact.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">
                                {contact.first_name} {contact.last_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {contact.email && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  onClick={() => {
                                    setEmailContact(contact)
                                    setEmailDialogOpen(true)
                                  }}
                                >
                                  <MailIcon className="size-4" />
                                </Button>
                              )}
                              {contact.phone && (
                                <>
                                  <Button variant="ghost" size="icon" className="size-7" asChild>
                                    <a href={`sms:${contact.phone}`}>
                                      <MessageSquareIcon className="size-4" />
                                    </a>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7"
                                    onClick={() => handleCallContact(contact)}
                                    disabled={!ownedNumbers.length || deviceState !== "ready"}
                                  >
                                    <PhoneIcon className="size-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CollapsibleSection>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="files" className="flex-1 m-0 overflow-hidden min-h-0">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <FileTextIcon className="size-12 text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">No files yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload files to associate with this lead.
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Activity Timeline & Messages */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/30 min-h-0">
          <Tabs defaultValue="activity" className="flex-1 flex flex-col min-h-0">
            <div className="px-4 pt-3 border-b bg-background">
              <TabsList className="h-9 bg-muted/50 rounded-xl p-1">
                <TabsTrigger value="activity" className="text-sm rounded-lg data-[state=active]:shadow-sm">
                  Activity
                </TabsTrigger>
                <TabsTrigger value="messages" className="text-sm rounded-lg data-[state=active]:shadow-sm gap-2">
                  <MessageSquareIcon className="size-4" />
                  Messages
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="activity" className="flex flex-col flex-1 m-0 overflow-hidden min-h-0">
              <LeadActivityTimeline
                activities={lead.activities || []}
                leadName={lead.name}
                leadId={lead.id}
              />
            </TabsContent>
            <TabsContent value="messages" className="flex flex-col flex-1 m-0 p-4 overflow-hidden min-h-0">
              {primaryContact?.phone ? (
                <CommunicationPanel
                  leadId={lead.id}
                  contactId={primaryContact.id}
                  phoneNumber={primaryContact.phone}
                  contactName={`${primaryContact.first_name} ${primaryContact.last_name || ""}`.trim()}
                  contactFirstName={primaryContact.first_name}
                  contactLastName={primaryContact.last_name}
                  contactEmail={primaryContact.email}
                  leadName={lead.name}
                  leadCompany={lead.name}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <PhoneIcon className="size-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No phone number</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add a phone number to a contact to start messaging.
                  </p>
                  <Button variant="outline" onClick={() => setContactFormOpen(true)}>
                    Add Contact
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Forms and Dialogs */}
      <LeadForm
        open={editFormOpen}
        onOpenChange={setEditFormOpen}
        lead={lead}
        onSubmit={handleUpdateLead}
      />

      <ContactForm
        open={contactFormOpen}
        onOpenChange={(open) => {
          setContactFormOpen(open)
          if (!open) setEditingContact(undefined)
        }}
        leadId={lead.id}
        leadName={lead.name}
        contact={editingContact}
        onSubmit={editingContact ? handleUpdateContact : handleAddContact}
      />

      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        onSubmit={handleAddTask}
      />

      <OpportunityForm
        open={opportunityFormOpen}
        onOpenChange={setOpportunityFormOpen}
        onSubmit={handleAddOpportunity}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{lead.name}"? This will also
              delete all contacts, tasks, and opportunities associated with this
              lead. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteLead}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Action Dialogs */}
      <SmsDialog
        open={smsDialogOpen}
        onOpenChange={setSmsDialogOpen}
        leadId={lead.id}
        contacts={lead.contacts || []}
        onSuccess={fetchLead}
      />


      <NoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        leadId={lead.id}
        onSuccess={fetchLead}
      />

      {emailContact && (
        <EmailDialog
          open={emailDialogOpen}
          onOpenChange={(open) => {
            setEmailDialogOpen(open)
            if (!open) setEmailContact(undefined)
          }}
          leadId={lead.id}
          contact={{
            id: emailContact.id,
            first_name: emailContact.first_name,
            last_name: emailContact.last_name,
            email: emailContact.email,
          }}
          leadName={lead.name}
          leadCompany={lead.name}
          onSuccess={fetchLead}
        />
      )}
    </div>
  )
}
