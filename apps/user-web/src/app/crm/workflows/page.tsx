import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { PlusIcon, GitBranchIcon, ZapIcon, MailIcon, BellIcon } from "lucide-react"

const mockWorkflows = [
  {
    id: 1,
    name: "New Lead Welcome Email",
    description: "Send welcome email when a new lead is created",
    trigger: "New Lead",
    actions: 2,
    active: true,
    runs: 156,
  },
  {
    id: 2,
    name: "Follow-up Reminder",
    description: "Create task 3 days after initial contact",
    trigger: "Lead Contacted",
    actions: 1,
    active: true,
    runs: 89,
  },
  {
    id: 3,
    name: "Deal Won Notification",
    description: "Notify team when deal is closed",
    trigger: "Deal Won",
    actions: 3,
    active: false,
    runs: 24,
  },
]

export default function WorkflowsPage() {
  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-muted-foreground">Automate your CRM processes</p>
        </div>
        <Button>
          <PlusIcon className="size-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <ZapIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">of 3 total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
            <GitBranchIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">269</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Actions Performed</CardTitle>
            <MailIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">412</div>
            <p className="text-xs text-muted-foreground">Emails, tasks, notifications</p>
          </CardContent>
        </Card>
      </div>

      {/* Workflows List */}
      <div className="space-y-4">
        {mockWorkflows.map((workflow) => (
          <Card key={workflow.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`size-10 rounded-lg flex items-center justify-center ${
                workflow.active ? "bg-emerald-500/10" : "bg-muted"
              }`}>
                <GitBranchIcon className={`size-5 ${workflow.active ? "text-emerald-500" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{workflow.name}</h3>
                  <Badge variant="outline">{workflow.trigger}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{workflow.description}</p>
              </div>
              <div className="text-right mr-4">
                <div className="text-sm font-medium">{workflow.runs} runs</div>
                <p className="text-sm text-muted-foreground">{workflow.actions} actions</p>
              </div>
              <Switch checked={workflow.active} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state for when no workflows */}
      {mockWorkflows.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GitBranchIcon className="size-12 text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No workflows yet</CardTitle>
            <CardDescription className="text-center max-w-sm mb-4">
              Create automated workflows to save time on repetitive tasks.
            </CardDescription>
            <Button>Create Your First Workflow</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

