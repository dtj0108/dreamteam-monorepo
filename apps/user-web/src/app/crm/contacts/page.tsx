import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusIcon, SearchIcon, UploadIcon } from "lucide-react"

export default function ContactsPage() {
  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">Manage your customer and lead contacts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <UploadIcon className="size-4 mr-2" />
            Import CSV
          </Button>
          <Button>
            <PlusIcon className="size-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search contacts..." className="pl-9" />
        </div>
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <PlusIcon className="size-8 text-muted-foreground" />
          </div>
          <CardTitle className="mb-2">No contacts yet</CardTitle>
          <CardDescription className="text-center max-w-sm mb-4">
            Get started by adding your first contact or importing from a CSV file.
          </CardDescription>
          <div className="flex gap-2">
            <Button variant="outline">Import CSV</Button>
            <Button>Add Contact</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

