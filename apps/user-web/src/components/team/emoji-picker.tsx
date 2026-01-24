"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { SmileIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const emojiCategories = {
  recent: ["👍", "❤️", "😂", "🎉", "🔥", "👀", "✅", "💯"],
  smileys: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘"],
  gestures: ["👍", "👎", "👋", "🤝", "👏", "🙌", "🤲", "✌️", "🤞", "🤙", "💪", "🙏"],
  symbols: ["❤️", "💔", "💕", "💖", "💗", "✨", "⭐", "🌟", "💫", "🔥", "💥", "⚡"],
  objects: ["🎉", "🎊", "🎁", "🏆", "🥇", "📣", "💡", "📌", "✅", "❌", "❓", "❗"],
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  className?: string
  align?: "start" | "center" | "end"
}

export function EmojiPicker({ onSelect, className, align = "end" }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<keyof typeof emojiCategories>("recent")

  const handleSelect = (emoji: string) => {
    onSelect(emoji)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("size-7", className)}>
          <SmileIcon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-72 p-2">
        <div className="flex gap-1 mb-2 border-b pb-2">
          {Object.keys(emojiCategories).map((cat) => (
            <Button
              key={cat}
              variant={category === cat ? "secondary" : "ghost"}
              size="sm"
              className="text-xs px-2 py-1 h-auto capitalize"
              onClick={() => setCategory(cat as keyof typeof emojiCategories)}
            >
              {cat === "recent" ? "⏱️" : emojiCategories[cat as keyof typeof emojiCategories][0]}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-8 gap-1">
          {emojiCategories[category].map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSelect(emoji)}
              className="size-8 flex items-center justify-center rounded hover:bg-muted text-lg"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

