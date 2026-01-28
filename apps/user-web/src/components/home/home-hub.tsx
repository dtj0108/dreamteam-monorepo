"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { GreetingHeader } from "./greeting-header"
import { FeatureCard } from "./feature-card"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

const features = [
  {
    emoji: "💰",
    title: "Finance",
    description:
      "Track accounts, manage transactions, set budgets, and analyze your financial health",
    href: "/finance",
  },
  {
    emoji: "📈",
    title: "Sales",
    description:
      "Manage leads, track deals through your pipeline, and automate sales workflows",
    href: "/sales",
  },
  {
    emoji: "💬",
    title: "Team",
    description:
      "Chat with your team, collaborate in channels, and work with AI agents",
    href: "/team",
  },
  {
    emoji: "📋",
    title: "Projects",
    description:
      "Organize tasks, track milestones, and manage project timelines",
    href: "/projects",
  },
  {
    emoji: "📚",
    title: "Knowledge",
    description:
      "Build your team's knowledge base with docs, templates, and whiteboards",
    href: "/knowledge",
  },
  {
    emoji: "🤖",
    title: "Agents",
    description:
      "Create and manage AI agents to automate workflows and assist your team",
    href: "/agents",
  },
]

export function HomeHub() {
  const { user } = useUser()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Logout failed:", error)
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <span className="font-semibold text-base text-foreground">dreamteam.ai</span>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={undefined} alt={user?.name || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => router.push("/account")}>
                  <span className="mr-2">👤</span>
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/billing")}>
                  <span className="mr-2">💳</span>
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/notifications")}>
                  <span className="mr-2">🔔</span>
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <span className="mr-2">⚙️</span>
                  Settings
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                {loggingOut ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <span className="mr-2">🚪</span>
                )}
                {loggingOut ? "Logging out..." : "Log out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-6">
        <div className="space-y-6">
          <GreetingHeader userName={user?.name || ""} />

          <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="animate-[fade-up_400ms_ease-out_forwards] opacity-0"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <FeatureCard {...feature} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
