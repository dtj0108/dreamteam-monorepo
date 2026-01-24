import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PlusIcon, SearchIcon, UsersIcon, UploadIcon } from "lucide-react"

const mockLeads = [
  {
    id: 1,
    name: "Alex Thompson",
    email: "alex@company.com",
    company: "Acme Industries",
    source: "Website",
    status: "New",
    createdAt: "Today",
  },
  {
    id: 2,
    name: "Maria Garcia",
    email: "maria@startup.io",
    company: "Startup.io",
    source: "Referral",
    status: "Contacted",
    createdAt: "Yesterday",
  },
  {
    id: 3,
    name: "James Wilson",
    email: "james@bigcorp.com",
    company: "BigCorp Ltd.",
    source: "LinkedIn",
    status: "Qualified",
    createdAt: "2 days ago",
  },
]

const statusColors: Record<string, string> = {
  New: "bg-blue-500",
  Contacted: "bg-yellow-500",
  Qualified: "bg-emerald-500",
  Unqualified: "bg-red-500",
}

export default function LeadsPage() {
  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground">Manage and qualify your incoming leads</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <UploadIcon className="size-4 mr-2" />
            Import
          </Button>
          <Button>
            <PlusIcon className="size-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <UsersIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">24</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Qualified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">42</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">27%</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search leads..." className="pl-9" />
        </div>
      </div>

      {/* Leads List */}
      <div className="space-y-3">
        {mockLeads.map((lead) => (
          <Card key={lead.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex items-center gap-4 p-4">
              <Avatar>
                <AvatarFallback>{lead.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{lead.name}</h3>
                  <Badge className={`${statusColors[lead.status]} text-white`}>{lead.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{lead.email} · {lead.company}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">{lead.source}</div>
                <p className="text-sm text-muted-foreground">{lead.createdAt}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

