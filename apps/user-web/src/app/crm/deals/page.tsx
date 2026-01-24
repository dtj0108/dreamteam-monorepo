import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusIcon, SearchIcon, BriefcaseIcon } from "lucide-react"

export default function DealsPage() {
  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deals</h1>
          <p className="text-muted-foreground">Track your sales opportunities and pipeline</p>
        </div>
        <Button>
          <PlusIcon className="size-4 mr-2" />
          New Deal
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search deals..." className="pl-9" />
        </div>
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <BriefcaseIcon className="size-8 text-muted-foreground" />
          </div>
          <CardTitle className="mb-2">No deals yet</CardTitle>
          <CardDescription className="text-center max-w-sm mb-4">
            Create your first deal to start tracking your sales pipeline.
          </CardDescription>
          <Button>Create Deal</Button>
        </CardContent>
      </Card>
    </div>
  )
}

