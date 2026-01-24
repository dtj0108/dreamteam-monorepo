import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusIcon, SearchIcon, HashIcon, LockIcon, UsersIcon } from "lucide-react"

const channelTypes = [
  { type: "public", icon: HashIcon, label: "Public", description: "Anyone in the workspace can join" },
  { type: "private", icon: LockIcon, label: "Private", description: "Only invited members can see" },
]

export default function ChannelsPage() {
  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Channels</h1>
          <p className="text-muted-foreground">Browse and manage channels in your workspace</p>
        </div>
        <Button>
          <PlusIcon className="size-4 mr-2" />
          Create Channel
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search channels..." className="pl-9" />
        </div>
      </div>

      {/* Default Channels */}
      <div className="grid gap-4">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="size-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <HashIcon className="size-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">#general</h3>
              <p className="text-sm text-muted-foreground">Company-wide announcements and discussions</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UsersIcon className="size-4" />
              <span>0 members</span>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="size-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <HashIcon className="size-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">#announcements</h3>
              <p className="text-sm text-muted-foreground">Important company announcements</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UsersIcon className="size-4" />
              <span>0 members</span>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="size-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <HashIcon className="size-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">#random</h3>
              <p className="text-sm text-muted-foreground">Non-work conversations and fun</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UsersIcon className="size-4" />
              <span>0 members</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

