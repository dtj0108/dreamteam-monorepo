"use client"

import { useState, useMemo } from "react"
import { Check, Search, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { Category } from "@/lib/types"

interface CategoryPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  selectedCount: number
  onSelect: (categoryId: string | null) => void
  loading?: boolean
}

export function CategoryPickerDialog({
  open,
  onOpenChange,
  categories,
  selectedCount,
  onSelect,
  loading,
}: CategoryPickerDialogProps) {
  const [search, setSearch] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories
    const searchLower = search.toLowerCase()
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.type.toLowerCase().includes(searchLower)
    )
  }, [categories, search])

  const incomeCategories = filteredCategories.filter((c) => c.type === "income")
  const expenseCategories = filteredCategories.filter((c) => c.type === "expense")

  const handleApply = () => {
    onSelect(selectedCategoryId)
  }

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategoryId(categoryId === selectedCategoryId ? null : categoryId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Category</DialogTitle>
          <DialogDescription>
            Choose a category to apply to {selectedCount} transaction
            {selectedCount !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Category List */}
          <ScrollArea className="h-[300px] rounded-md border p-2">
            {/* Clear Category Option */}
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                selectedCategoryId === null
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-muted-foreground" />
                <span>Remove Category</span>
              </div>
              {selectedCategoryId === null && (
                <Check className="h-4 w-4" />
              )}
            </button>

            {/* Income Categories */}
            {incomeCategories.length > 0 && (
              <div className="mt-4">
                <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Income
                </div>
                {incomeCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedCategoryId === category.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span>{category.name}</span>
                    </div>
                    {selectedCategoryId === category.id && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Expense Categories */}
            {expenseCategories.length > 0 && (
              <div className="mt-4">
                <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Expenses
                </div>
                {expenseCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedCategoryId === category.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span>{category.name}</span>
                    </div>
                    {selectedCategoryId === category.id && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {filteredCategories.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                <p>No categories found</p>
              </div>
            )}
          </ScrollArea>

          {/* Selected Preview */}
          {selectedCategoryId && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Selected:</span>
              <Badge
                variant="secondary"
                style={{
                  backgroundColor: `${categories.find((c) => c.id === selectedCategoryId)?.color}20`,
                  color: categories.find((c) => c.id === selectedCategoryId)?.color,
                }}
              >
                {categories.find((c) => c.id === selectedCategoryId)?.name}
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={loading}>
            {loading ? "Applying..." : "Apply to Selected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

