"use client"

import { useState } from "react"
import { Check, Plus, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  CommandSeparator,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { KnowledgeCategory } from "@/providers/knowledge-provider"

interface CategoryPickerProps {
  categories: KnowledgeCategory[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onCreateCategory?: (name: string) => Promise<KnowledgeCategory | null>
  trigger?: React.ReactNode
  align?: "start" | "center" | "end"
}

export function CategoryPicker({
  categories,
  selectedIds,
  onChange,
  onCreateCategory,
  trigger,
  align = "start",
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  const handleToggle = (categoryId: string) => {
    if (selectedIds.includes(categoryId)) {
      onChange(selectedIds.filter(id => id !== categoryId))
    } else {
      onChange([...selectedIds, categoryId])
    }
  }

  const handleCreate = async () => {
    if (!newCategoryName.trim() || !onCreateCategory) return

    const category = await onCreateCategory(newCategoryName.trim())
    if (category) {
      onChange([...selectedIds, category.id])
      setNewCategoryName("")
      setIsCreating(false)
    }
  }

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-7 gap-1">
            <Tag className="size-3" />
            Add tag
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align={align}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search categories..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {search ? "No categories found." : "No categories yet."}
            </CommandEmpty>
            <CommandGroup>
              {filteredCategories.map(category => (
                <CommandItem
                  key={category.id}
                  value={category.id}
                  onSelect={() => handleToggle(category.id)}
                  data-checked={selectedIds.includes(category.id)}
                  className="cursor-pointer"
                >
                  <span
                    className="size-3 rounded-full shrink-0"
                    style={{ backgroundColor: category.color || "#6b7280" }}
                  />
                  <span className="flex-1 truncate">{category.name}</span>
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      selectedIds.includes(category.id)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            {onCreateCategory && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  {isCreating ? (
                    <div className="p-2 space-y-2">
                      <Input
                        placeholder="Category name"
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleCreate()
                          } else if (e.key === "Escape") {
                            setIsCreating(false)
                            setNewCategoryName("")
                          }
                        }}
                        autoFocus
                        className="h-8"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 h-7"
                          onClick={handleCreate}
                          disabled={!newCategoryName.trim()}
                        >
                          Create
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7"
                          onClick={() => {
                            setIsCreating(false)
                            setNewCategoryName("")
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <CommandItem
                      onSelect={() => setIsCreating(true)}
                      className="cursor-pointer"
                    >
                      <Plus className="size-4" />
                      <span>Create category</span>
                    </CommandItem>
                  )}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
