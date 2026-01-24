import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { PlusIcon, SearchIcon, TrendingUpIcon, DollarSignIcon } from "lucide-react"

const mockOpportunities = [
  {
    id: 1,
    name: "Enterprise License Deal",
    company: "TechCorp Inc.",
    value: "$45,000",
    stage: "Negotiation",
    probability: 75,
    closeDate: "Jan 15, 2026",
  },
  {
    id: 2,
    name: "Annual SaaS Contract",
    company: "StartupXYZ",
    value: "$24,000",
    stage: "Proposal",
    probability: 50,
    closeDate: "Feb 1, 2026",
  },
  {
    id: 3,
    name: "Consulting Package",
    company: "Enterprise Co.",
    value: "$15,000",
    stage: "Discovery",
    probability: 25,
    closeDate: "Mar 1, 2026",
  },
]

const stageColors: Record<string, string> = {
  Discovery: "bg-gray-500",
  Proposal: "bg-blue-500",
  Negotiation: "bg-yellow-500",
  "Closed Won": "bg-emerald-500",
  "Closed Lost": "bg-red-500",
}

export default function OpportunitiesPage() {
  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Opportunities</h1>
          <p className="text-muted-foreground">Track and manage your sales opportunities</p>
        </div>
        <Button>
          <PlusIcon className="size-4 mr-2" />
          New Opportunity
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
            <DollarSignIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$84,000</div>
            <p className="text-xs text-muted-foreground">3 active opportunities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Weighted Value</CardTitle>
            <TrendingUpIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$49,500</div>
            <p className="text-xs text-muted-foreground">Based on probability</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Deal Size</CardTitle>
            <DollarSignIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$28,000</div>
            <p className="text-xs text-muted-foreground">Per opportunity</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search opportunities..." className="pl-9" />
        </div>
      </div>

      {/* Opportunities List */}
      <div className="space-y-3">
        {mockOpportunities.map((opp) => (
          <Card key={opp.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{opp.name}</h3>
                  <Badge className={`${stageColors[opp.stage]} text-white`}>{opp.stage}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{opp.company}</p>
              </div>
              <div className="text-right">
                <div className="font-semibold">{opp.value}</div>
                <p className="text-sm text-muted-foreground">{opp.probability}% · {opp.closeDate}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

