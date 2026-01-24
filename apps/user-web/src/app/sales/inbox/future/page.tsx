import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ClockIcon, ArrowLeftIcon, CalendarIcon, BellIcon } from "lucide-react"
import Link from "next/link"

const futureItems = [
  {
    id: 1,
    subject: "Follow up with TechCorp",
    scheduledFor: "Tomorrow, 10:00 AM",
    type: "reminder",
  },
  {
    id: 2,
    subject: "Send proposal to StartupXYZ",
    scheduledFor: "Dec 26, 2025",
    type: "task",
  },
  {
    id: 3,
    subject: "Quarterly check-in call",
    scheduledFor: "Jan 2, 2026",
    type: "meeting",
  },
]

export default function InboxFuturePage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/sales/inbox">
            <ArrowLeftIcon className="size-4 mr-2" />
            Back to Inbox
          </Link>
        </Button>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ClockIcon className="size-8 text-blue-500" />
          Future
        </h1>
        <p className="text-muted-foreground">Scheduled and snoozed items</p>
      </div>

      <div className="space-y-3">
        {futureItems.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`size-10 rounded-full flex items-center justify-center ${
                item.type === "reminder" ? "bg-yellow-500/10" :
                item.type === "task" ? "bg-blue-500/10" : "bg-purple-500/10"
              }`}>
                {item.type === "reminder" ? <BellIcon className="size-5 text-yellow-500" /> :
                 item.type === "task" ? <ClockIcon className="size-5 text-blue-500" /> :
                 <CalendarIcon className="size-5 text-purple-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{item.subject}</h3>
                <p className="text-sm text-muted-foreground">Scheduled</p>
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap">{item.scheduledFor}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {futureItems.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ClockIcon className="size-12 text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No scheduled items</CardTitle>
            <CardDescription>Snooze items or schedule follow-ups to see them here.</CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

