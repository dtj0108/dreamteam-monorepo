import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  BarChart3Icon, 
  TrendingUpIcon, 
  UsersIcon, 
  DollarSignIcon,
  CalendarIcon,
  DownloadIcon,
  PlusIcon
} from "lucide-react"
import Link from "next/link"

const reportCards = [
  {
    title: "Sales Pipeline",
    description: "Overview of opportunities by stage",
    icon: TrendingUpIcon,
    href: "/sales/reports/pipeline",
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    title: "Lead Sources",
    description: "Where your leads are coming from",
    icon: UsersIcon,
    href: "/sales/reports/sources",
    color: "bg-emerald-500/10 text-emerald-500",
  },
  {
    title: "Revenue Forecast",
    description: "Projected revenue based on pipeline",
    icon: DollarSignIcon,
    href: "/sales/reports/forecast",
    color: "bg-purple-500/10 text-purple-500",
  },
  {
    title: "Activity Report",
    description: "Team activities and engagement",
    icon: CalendarIcon,
    href: "/sales/reports/activity",
    color: "bg-orange-500/10 text-orange-500",
  },
]

export default function ReportsPage() {
  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Analyze your CRM data and track performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <DownloadIcon className="size-4 mr-2" />
            Export
          </Button>
          <Button>
            <PlusIcon className="size-4 mr-2" />
            Custom Report
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSignIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$124,500</div>
            <p className="text-xs text-emerald-500">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Deals Closed</CardTitle>
            <TrendingUpIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-emerald-500">+3 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">New Leads</CardTitle>
            <UsersIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <BarChart3Icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">32%</div>
            <p className="text-xs text-emerald-500">+5% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Cards */}
      <h2 className="text-lg font-semibold mb-4">Available Reports</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportCards.map((report) => (
          <Card key={report.title} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`size-12 rounded-lg flex items-center justify-center ${report.color}`}>
                <report.icon className="size-6" />
              </div>
              <div>
                <h3 className="font-medium">{report.title}</h3>
                <p className="text-sm text-muted-foreground">{report.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

