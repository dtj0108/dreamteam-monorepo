"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Loader2 } from "lucide-react"
import { useTeam } from "@/providers/team-provider"

export default function AgentsPage() {
  const router = useRouter()
  const { agents } = useTeam()

  // Redirect to the first agent
  useEffect(() => {
    if (agents.length > 0) {
      router.replace(`/team/agents/${agents[0].id}`)
    }
  }, [agents, router])

  // Loading state while we redirect
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Sparkles className="size-8 text-muted-foreground" />
        </div>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading agents...
        </div>
      </div>
    </div>
  )
}
