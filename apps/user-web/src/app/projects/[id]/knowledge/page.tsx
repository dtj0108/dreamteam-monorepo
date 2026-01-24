"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useProjects } from "@/providers/projects-provider"
import { useKnowledge, type KnowledgePage, type Whiteboard } from "@/providers/knowledge-provider"
import { ProjectHeader } from "@/components/projects/project-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Loader2,
  Plus,
  BookOpen,
  FileText,
  Palette,
  Unlink,
  ExternalLink,
} from "lucide-react"
import { ProjectMilestonesSkeleton } from "@/components/projects/skeletons"
import { AttachKnowledgeDialog } from "@/components/projects/attach-knowledge-dialog"
import { format } from "date-fns"

interface LinkedPage {
  id: string
  created_at: string
  linked_by: string
  page: {
    id: string
    title: string
    icon: string | null
    updated_at: string
    created_by: string | null
  }
  linker: {
    id: string
    name: string
    avatar_url: string | null
  } | null
}

interface LinkedWhiteboard {
  id: string
  created_at: string
  linked_by: string
  whiteboard: {
    id: string
    title: string
    icon: string
    thumbnail: string | null
    updated_at: string
    created_by: string | null
  }
  linker: {
    id: string
    name: string
    avatar_url: string | null
  } | null
}

export default function ProjectKnowledgePage() {
  const params = useParams()
  const projectId = params.id as string
  const { currentProject, loading: projectLoading, fetchProject } = useProjects()

  const [linkedPages, setLinkedPages] = useState<LinkedPage[]>([])
  const [linkedWhiteboards, setLinkedWhiteboards] = useState<LinkedWhiteboard[]>([])
  const [loading, setLoading] = useState(true)
  const [showAttachDialog, setShowAttachDialog] = useState(false)

  const fetchLinkedKnowledge = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/knowledge`)
      if (response.ok) {
        const data = await response.json()
        setLinkedPages(data.pages || [])
        setLinkedWhiteboards(data.whiteboards || [])
      }
    } catch (error) {
      console.error("Failed to fetch linked knowledge:", error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId)
      fetchLinkedKnowledge()
    }
  }, [projectId, fetchProject, fetchLinkedKnowledge])

  const handleUnlink = async (type: "page" | "whiteboard", linkId: string) => {
    if (!confirm("Unlink this item from the project?")) return

    try {
      await fetch(`/api/projects/${projectId}/knowledge?type=${type}&linkId=${linkId}`, {
        method: "DELETE",
      })
      fetchLinkedKnowledge()
    } catch (error) {
      console.error("Failed to unlink:", error)
    }
  }

  const linkedPageIds = linkedPages.map((lp) => lp.page.id)
  const linkedWhiteboardIds = linkedWhiteboards.map((lw) => lw.whiteboard.id)
  const totalItems = linkedPages.length + linkedWhiteboards.length

  if ((projectLoading || loading) && !currentProject) {
    return <ProjectMilestonesSkeleton />
  }

  if (!currentProject) {
    return <ProjectMilestonesSkeleton />
  }

  return (
    <div className="space-y-6">
      <ProjectHeader project={currentProject} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Knowledge</h2>
          <p className="text-sm text-muted-foreground">
            Documentation, SOPs, and whiteboards linked to this project
          </p>
        </div>
        <Button onClick={() => setShowAttachDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Attach Knowledge
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalItems}</p>
              <p className="text-sm text-muted-foreground">Total Items</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{linkedPages.length}</p>
              <p className="text-sm text-muted-foreground">Pages</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Palette className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{linkedWhiteboards.length}</p>
              <p className="text-sm text-muted-foreground">Whiteboards</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Content */}
      {totalItems === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No knowledge linked yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Attach existing documentation, SOPs, or whiteboards to this project
            </p>
            <Button className="mt-4" onClick={() => setShowAttachDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Attach Knowledge
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Pages Section */}
          {linkedPages.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Pages ({linkedPages.length})
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {linkedPages.map((item) => (
                  <Card key={item.id} className="p-4 group">
                    <div className="flex items-start justify-between">
                      <Link
                        href={`/knowledge/${item.page.id}`}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <div className="text-2xl shrink-0">
                          {item.page.icon || "📄"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate hover:text-primary transition-colors">
                            {item.page.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Updated {format(new Date(item.page.updated_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </Link>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                        >
                          <Link href={`/knowledge/${item.page.id}`} target="_blank">
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleUnlink("page", item.id)}
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Whiteboards Section */}
          {linkedWhiteboards.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Whiteboards ({linkedWhiteboards.length})
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {linkedWhiteboards.map((item) => (
                  <Card key={item.id} className="p-4 group">
                    <div className="flex items-start justify-between">
                      <Link
                        href={`/knowledge/whiteboards/${item.whiteboard.id}`}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <div className="text-2xl shrink-0">
                          {item.whiteboard.icon || "🎨"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate hover:text-primary transition-colors">
                            {item.whiteboard.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Updated {format(new Date(item.whiteboard.updated_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </Link>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                        >
                          <Link href={`/knowledge/whiteboards/${item.whiteboard.id}`} target="_blank">
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleUnlink("whiteboard", item.id)}
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attach Knowledge Dialog */}
      <AttachKnowledgeDialog
        projectId={projectId}
        open={showAttachDialog}
        onOpenChange={setShowAttachDialog}
        linkedPageIds={linkedPageIds}
        linkedWhiteboardIds={linkedWhiteboardIds}
        onAttach={fetchLinkedKnowledge}
      />
    </div>
  )
}
