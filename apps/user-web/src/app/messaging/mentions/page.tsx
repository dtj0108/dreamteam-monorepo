import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AtSignIcon, BellIcon, MessageSquareIcon } from "lucide-react"

export default function MentionsPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Mentions & Reactions</h1>
        <p className="text-muted-foreground">Messages where you were mentioned or reacted to</p>
      </div>

      <Tabs defaultValue="mentions" className="w-full">
        <TabsList>
          <TabsTrigger value="mentions">
            <AtSignIcon className="size-4 mr-2" />
            Mentions
          </TabsTrigger>
          <TabsTrigger value="reactions">
            <BellIcon className="size-4 mr-2" />
            Reactions
          </TabsTrigger>
          <TabsTrigger value="threads">
            <MessageSquareIcon className="size-4 mr-2" />
            Threads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mentions" className="mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <AtSignIcon className="size-8 text-muted-foreground" />
              </div>
              <CardTitle className="mb-2">No mentions yet</CardTitle>
              <CardDescription className="text-center max-w-sm">
                When someone mentions you in a channel or direct message, it will appear here.
              </CardDescription>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reactions" className="mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <BellIcon className="size-8 text-muted-foreground" />
              </div>
              <CardTitle className="mb-2">No reactions yet</CardTitle>
              <CardDescription className="text-center max-w-sm">
                Reactions to your messages will show up here.
              </CardDescription>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="threads" className="mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageSquareIcon className="size-8 text-muted-foreground" />
              </div>
              <CardTitle className="mb-2">No threads yet</CardTitle>
              <CardDescription className="text-center max-w-sm">
                Threads you're participating in will appear here.
              </CardDescription>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

