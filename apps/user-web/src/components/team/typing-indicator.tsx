"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface TypingUser {
  id: string
  name: string
  avatar?: string
}

interface TypingIndicatorProps {
  users: TypingUser[]
  className?: string
}

export function TypingIndicator({ users, className }: TypingIndicatorProps) {
  if (users.length === 0) return null

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].name} is typing`
    } else if (users.length === 2) {
      return `${users[0].name} and ${users[1].name} are typing`
    } else {
      return `${users[0].name} and ${users.length - 1} others are typing`
    }
  }

  const firstUser = users[0]
  const initials = firstUser.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className={cn("flex items-center gap-3 px-4 py-2", className)}>
      <Avatar className="size-9 shrink-0">
        <AvatarImage src={firstUser.avatar} alt={firstUser.name} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      
      <div className="flex items-center gap-2">
        {/* Animated dots */}
        <div className="flex items-center justify-center gap-1 h-7 px-3 rounded-lg rounded-tl-none bg-muted">
          <span 
            className="size-1.5 rounded-full bg-muted-foreground animate-bounce"
            style={{ animationDelay: "0ms", animationDuration: "600ms" }}
          />
          <span 
            className="size-1.5 rounded-full bg-muted-foreground animate-bounce"
            style={{ animationDelay: "150ms", animationDuration: "600ms" }}
          />
          <span 
            className="size-1.5 rounded-full bg-muted-foreground animate-bounce"
            style={{ animationDelay: "300ms", animationDuration: "600ms" }}
          />
        </div>
        
        {/* Typing text */}
        <span className="text-xs text-muted-foreground">
          {getTypingText()}
        </span>
      </div>
    </div>
  )
}

