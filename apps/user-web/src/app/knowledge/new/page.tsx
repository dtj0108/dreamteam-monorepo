"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useKnowledge } from "@/providers/knowledge-provider"

/**
 * /knowledge/new route
 *
 * This route triggers the Create Page dialog and redirects to /knowledge/all.
 * The dialog is controlled by the KnowledgeProvider state, which is already
 * rendered in the layout.
 */
export default function KnowledgeNewPage() {
  const router = useRouter()
  const { setShowCreatePage, isLoading } = useKnowledge()

  useEffect(() => {
    // Wait for provider to finish loading before triggering the dialog
    if (!isLoading) {
      setShowCreatePage(true)
      // Replace the URL so the back button doesn't return to /knowledge/new
      router.replace("/knowledge/all")
    }
  }, [isLoading, setShowCreatePage, router])

  // Show loading state while we wait to trigger the dialog
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  )
}
