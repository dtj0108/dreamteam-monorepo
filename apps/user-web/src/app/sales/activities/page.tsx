import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusIcon, CalendarIcon, PhoneIcon, MailIcon, CheckCircleIcon } from "lucide-react"

export default function ActivitiesPage() {
  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activities</h1>
          <p className="text-muted-foreground">Track calls, emails, meetings, and tasks</p>
        </div>
        <Button>
          <PlusIcon className="size-4 mr-2" />
          Log Activity
        </Button>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <CalendarIcon className="size-8 text-muted-foreground" />
              </div>
              <CardTitle className="mb-2">No upcoming activities</CardTitle>
              <CardDescription className="text-center max-w-sm mb-4">
                Schedule calls, meetings, or tasks to stay on top of your deals.
              </CardDescription>
              <div className="flex gap-2">
                <Button variant="outline">
                  <PhoneIcon className="size-4 mr-2" />
                  Log Call
                </Button>
                <Button variant="outline">
                  <MailIcon className="size-4 mr-2" />
                  Log Email
                </Button>
                <Button>
                  <CalendarIcon className="size-4 mr-2" />
                  Schedule Meeting
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <CheckCircleIcon className="size-8 text-muted-foreground" />
              </div>
              <CardTitle className="mb-2">No completed activities</CardTitle>
              <CardDescription className="text-center max-w-sm">
                Completed activities will appear here.
              </CardDescription>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <CardTitle className="mb-2">No activities yet</CardTitle>
              <CardDescription className="text-center max-w-sm mb-4">
                Start logging activities to track your interactions with contacts.
              </CardDescription>
              <Button>Log Activity</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

