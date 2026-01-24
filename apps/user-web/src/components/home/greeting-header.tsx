"use client"

interface GreetingHeaderProps {
  userName: string
}

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return "Good morning"
  if (hour >= 12 && hour < 17) return "Good afternoon"
  if (hour >= 17 && hour < 21) return "Good evening"
  return "Good night"
}

export function GreetingHeader({ userName }: GreetingHeaderProps) {
  const greeting = getTimeBasedGreeting()
  const firstName = userName?.split(" ")[0] || "there"

  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-bold tracking-tight">
        {greeting}, {firstName}
      </h1>
      <p className="text-base text-muted-foreground">
        Welcome to your workspace. Where would you like to go?
      </p>
    </div>
  )
}
