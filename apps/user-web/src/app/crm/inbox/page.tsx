import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InboxIcon, CheckCircleIcon, ClockIcon, MailIcon, PhoneIcon, CalendarIcon } from "lucide-react"
import Link from "next/link"

const mockInboxItems = [
  {
    id: 1,
    type: "email",
    subject: "Re: Partnership Proposal",
    from: "Sarah Johnson",
    company: "TechCorp Inc.",
    time: "2 hours ago",
    priority: "high",
  },
  {
    id: 2,
    type: "call",
    subject: "Follow-up call scheduled",
    from: "Mike Chen",
    company: "StartupXYZ",
    time: "4 hours ago",
    priority: "medium",
  },
  {
    id: 3,
    type: "meeting",
    subject: "Product demo request",
    from: "Lisa Park",
    company: "Enterprise Co.",
    time: "Yesterday",
    priority: "high",
  },
]

export default function InboxPage() {
  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Inbox
            <Badge variant="secondary" className="text-lg px-3 py-1">177</Badge>
          </h1>
          <p className="text-muted-foreground">Manage your incoming leads, emails, and tasks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/crm/inbox/done">
              <CheckCircleIcon className="size-4 mr-2" />
              Done
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/crm/inbox/future">
              <ClockIcon className="size-4 mr-2" />
              Future
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="starred">Starred</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="space-y-3">
            {mockInboxItems.map((item) => (
              <Card key={item.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`size-10 rounded-full flex items-center justify-center ${
                    item.type === "email" ? "bg-blue-500/10" :
                    item.type === "call" ? "bg-green-500/10" : "bg-purple-500/10"
                  }`}>
                    {item.type === "email" ? <MailIcon className="size-5 text-blue-500" /> :
                     item.type === "call" ? <PhoneIcon className="size-5 text-green-500" /> :
                     <CalendarIcon className="size-5 text-purple-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{item.subject}</h3>
                      {item.priority === "high" && (
                        <Badge variant="destructive" className="text-xs">High</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {item.from} · {item.company}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">{item.time}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="unread" className="mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <InboxIcon className="size-12 text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No unread items</CardTitle>
              <CardDescription>You're all caught up!</CardDescription>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="starred" className="mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <InboxIcon className="size-12 text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No starred items</CardTitle>
              <CardDescription>Star important items to find them here.</CardDescription>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

