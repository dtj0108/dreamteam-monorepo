import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircleIcon, ArrowLeftIcon, MailIcon, PhoneIcon, CalendarIcon } from "lucide-react"
import Link from "next/link"

const completedItems = [
  {
    id: 1,
    type: "email",
    subject: "Contract signed - Acme Corp",
    from: "John Smith",
    completedAt: "Today, 2:30 PM",
  },
  {
    id: 2,
    type: "call",
    subject: "Discovery call completed",
    from: "Emma Wilson",
    completedAt: "Today, 11:00 AM",
  },
  {
    id: 3,
    type: "meeting",
    subject: "Quarterly review meeting",
    from: "David Brown",
    completedAt: "Yesterday",
  },
]

export default function InboxDonePage() {
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
          <CheckCircleIcon className="size-8 text-emerald-500" />
          Done
        </h1>
        <p className="text-muted-foreground">Completed inbox items</p>
      </div>

      <div className="space-y-3">
        {completedItems.map((item) => (
          <Card key={item.id} className="opacity-75">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircleIcon className="size-5 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate line-through text-muted-foreground">{item.subject}</h3>
                <p className="text-sm text-muted-foreground truncate">{item.from}</p>
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap">{item.completedAt}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {completedItems.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircleIcon className="size-12 text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No completed items</CardTitle>
            <CardDescription>Complete items from your inbox to see them here.</CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

