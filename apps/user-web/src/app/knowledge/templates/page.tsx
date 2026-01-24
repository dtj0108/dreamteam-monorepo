"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from "lucide-react"
import { useKnowledge } from "@/providers/knowledge-provider"
import { useRouter } from "next/navigation"
import type { KnowledgeTemplate } from "@/providers/knowledge-provider"

function TemplateCard({
  template,
  onClick,
}: {
  template: KnowledgeTemplate
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start p-4 rounded-lg border border-border hover:bg-accent text-left transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{template.icon || "📄"}</span>
        <span className="font-medium text-sm">{template.name}</span>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-1">
        {template.description || "Start with this template"}
      </p>
    </button>
  )
}

export default function TemplatesPage() {
  const router = useRouter()
  const { templates, createPage, isLoading } = useKnowledge()

  const handleUseTemplate = async (templateId: string) => {
    try {
      const page = await createPage({ templateId })
      if (page) {
        router.push(`/knowledge/${page.id}`)
      }
    } catch (error) {
      console.error("Failed to create page from template:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold mb-6">Templates</h1>

        {templates.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onClick={() => handleUseTemplate(template.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No templates available
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
