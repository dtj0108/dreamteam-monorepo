import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusIcon, SettingsIcon } from "lucide-react"

const defaultStages = [
  { name: "Lead", color: "bg-gray-500", deals: 0, value: 0 },
  { name: "Qualified", color: "bg-blue-500", deals: 0, value: 0 },
  { name: "Proposal", color: "bg-yellow-500", deals: 0, value: 0 },
  { name: "Negotiation", color: "bg-orange-500", deals: 0, value: 0 },
  { name: "Closed Won", color: "bg-emerald-500", deals: 0, value: 0 },
]

export default function PipelinePage() {
  return (
    <div className="p-6 h-full">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">Visualize your sales pipeline stages</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <SettingsIcon className="size-4 mr-2" />
            Edit Stages
          </Button>
          <Button>
            <PlusIcon className="size-4 mr-2" />
            Add Deal
          </Button>
        </div>
      </div>

      {/* Pipeline Kanban */}
      <div className="grid grid-cols-5 gap-4 h-[calc(100vh-12rem)]">
        {defaultStages.map((stage) => (
          <div key={stage.name} className="flex flex-col">
            <div className="mb-3 flex items-center gap-2">
              <div className={`size-3 rounded-full ${stage.color}`} />
              <h3 className="font-medium">{stage.name}</h3>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {stage.deals}
              </span>
            </div>
            <Card className="flex-1 bg-muted/30">
              <CardContent className="p-3 h-full flex flex-col items-center justify-center text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  No deals in {stage.name.toLowerCase()}
                </p>
                <Button variant="ghost" size="sm">
                  <PlusIcon className="size-4 mr-1" />
                  Add
                </Button>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}

