"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useKnowledge } from "@/providers/knowledge-provider"

/**
 * /knowledge/whiteboards/new route
 *
 * This route triggers the Create Whiteboard dialog and redirects to /knowledge/whiteboards.
 * The dialog is controlled by the KnowledgeProvider state, which is already
 * rendered in the layout.
 */
export default function WhiteboardNewPage() {
  const router = useRouter()
  const { setShowCreateWhiteboard, isLoading } = useKnowledge()

  useEffect(() => {
    // Wait for provider to finish loading before triggering the dialog
    if (!isLoading) {
      setShowCreateWhiteboard(true)
      // Replace the URL so the back button doesn't return to /knowledge/whiteboards/new
      router.replace("/knowledge/whiteboards")
    }
  }, [isLoading, setShowCreateWhiteboard, router])

  // Show loading state while we wait to trigger the dialog
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  )
}
