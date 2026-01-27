"use client"

import { useState } from "react"
import { Loader2, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { WorkspaceMember } from "@/components/sales/leads-filter-bar"

interface BulkAssigneePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  members: WorkspaceMember[]
  selectedCount: number
  onApply: (userId: string | null) => Promise<void>
}

export function BulkAssigneePicker({
  open,
  onOpenChange,
  members,
  selectedCount,
  onApply,
}: BulkAssigneePickerProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleApply = async () => {
    setIsLoading(true)
    try {
      // Convert "unassigned" selection to null
      await onApply(selectedUserId === "unassigned" ? null : selectedUserId)
      setSelectedUserId(null)
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setSelectedUserId(null)
    onOpenChange(false)
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Team Member</DialogTitle>
          <DialogDescription>
            Assign {selectedCount} lead{selectedCount !== 1 ? "s" : ""} to a team
            member.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 max-h-[300px] overflow-y-auto">
          <RadioGroup
            value={selectedUserId || ""}
            onValueChange={setSelectedUserId}
          >
            {/* Unassign option */}
            <div className="flex items-center space-x-2 pb-3 mb-3 border-b">
              <RadioGroupItem value="unassigned" id="unassigned" />
              <Label
                htmlFor="unassigned"
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <UserX className="h-4 w-4 text-muted-foreground" />
                </div>
                <span>Unassigned</span>
              </Label>
            </div>

            {/* Team members */}
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={member.profileId} id={member.id} />
                  <Label
                    htmlFor={member.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatarUrl || undefined} />
                      <AvatarFallback>
                        {getInitials(member.displayName || member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {member.displayName || member.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {member.email}
                      </span>
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>

          {members.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No team members found.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={selectedUserId === null || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              "Apply"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
