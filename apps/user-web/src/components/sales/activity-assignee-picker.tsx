"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, X, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

export interface WorkspaceMember {
  id: string
  profileId: string
  name: string
  displayName: string | null
  avatarUrl: string | null
  email: string
}

interface ActivityAssigneePickerProps {
  members: WorkspaceMember[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  className?: string
}

export function ActivityAssigneePicker({
  members,
  selectedIds,
  onChange,
  className,
}: ActivityAssigneePickerProps) {
  const [open, setOpen] = useState(false)

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const toggleMember = (profileId: string) => {
    if (selectedIds.includes(profileId)) {
      onChange(selectedIds.filter((id) => id !== profileId))
    } else {
      onChange([...selectedIds, profileId])
    }
  }

  const removeMember = (profileId: string) => {
    onChange(selectedIds.filter((id) => id !== profileId))
  }

  const selectedMembers = members.filter((m) => selectedIds.includes(m.profileId))

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected assignees display */}
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedMembers.map((member) => (
            <div
              key={member.profileId}
              className="flex items-center gap-1.5 bg-secondary text-secondary-foreground rounded-full pl-1 pr-2 py-1"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={member.avatarUrl || undefined} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(member.displayName || member.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">
                {member.displayName || member.name}
              </span>
              <button
                type="button"
                onClick={() => removeMember(member.profileId)}
                className="hover:bg-secondary-foreground/10 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Popover trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between"
            type="button"
          >
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              {selectedIds.length === 0
                ? "Assign members"
                : `${selectedIds.length} assigned`}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search members..." />
            <CommandList>
              <CommandEmpty>No members found.</CommandEmpty>
              <CommandGroup>
                {members.map((member) => {
                  const isSelected = selectedIds.includes(member.profileId)
                  return (
                    <CommandItem
                      key={member.profileId}
                      value={`${member.name} ${member.email}`}
                      onSelect={() => toggleMember(member.profileId)}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(member.displayName || member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {member.displayName || member.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {member.email}
                          </span>
                        </div>
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
