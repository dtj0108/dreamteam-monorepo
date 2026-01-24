import { z } from "zod"
import { tool } from "ai"
import type { ToolContext, KnowledgeResult } from "../types"

export const knowledgeSchema = z.object({
  action: z.enum(["query", "create", "update"]).default("query").describe("Action to perform: query pages, create a new page, or update an existing page"),
  // Query params
  search: z.string().optional().describe("Search term to find pages by title or content (for query)"),
  limit: z.number().optional().default(10).describe("Maximum number of pages to return (for query)"),
  parentId: z.string().optional().describe("Filter by parent page ID (for query) or set parent for new page (for create)"),
  // Create params
  title: z.string().optional().describe("Page title (required for create)"),
  content: z.string().optional().describe("Page content as markdown text (for create/update). Will be converted to proper format."),
  icon: z.string().optional().describe("Emoji icon for the page (for create)"),
  // Update params
  pageId: z.string().optional().describe("Page ID to update (required for update)"),
})

// Convert markdown-like text to BlockNote JSON format
function textToBlockNoteContent(text: string): any[] {
  const lines = text.split("\n")
  const blocks: any[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Headings
    if (trimmed.startsWith("### ")) {
      blocks.push({
        type: "heading",
        content: [{ type: "text", text: trimmed.slice(4) }],
        props: { level: 3 },
      })
    } else if (trimmed.startsWith("## ")) {
      blocks.push({
        type: "heading",
        content: [{ type: "text", text: trimmed.slice(3) }],
        props: { level: 2 },
      })
    } else if (trimmed.startsWith("# ")) {
      blocks.push({
        type: "heading",
        content: [{ type: "text", text: trimmed.slice(2) }],
        props: { level: 1 },
      })
    }
    // Bullet list
    else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      blocks.push({
        type: "bulletListItem",
        content: [{ type: "text", text: trimmed.slice(2) }],
      })
    }
    // Numbered list
    else if (/^\d+\.\s/.test(trimmed)) {
      blocks.push({
        type: "numberedListItem",
        content: [{ type: "text", text: trimmed.replace(/^\d+\.\s/, "") }],
      })
    }
    // Checkbox
    else if (trimmed.startsWith("[ ] ") || trimmed.startsWith("[x] ")) {
      blocks.push({
        type: "checkListItem",
        content: [{ type: "text", text: trimmed.slice(4) }],
        props: { checked: trimmed.startsWith("[x]") },
      })
    }
    // Regular paragraph
    else {
      blocks.push({
        type: "paragraph",
        content: [{ type: "text", text: trimmed }],
      })
    }
  }

  return blocks.length > 0 ? blocks : [{ type: "paragraph", content: [] }]
}

// Convert BlockNote JSON to plain text for display
function blockNoteToText(content: any[]): string {
  if (!Array.isArray(content)) return ""

  return content
    .map((block: any) => {
      const text = block.content
        ?.map((c: any) => c.text || "")
        .join("") || ""

      switch (block.type) {
        case "heading":
          const level = block.props?.level || 1
          return "#".repeat(level) + " " + text
        case "bulletListItem":
          return "- " + text
        case "numberedListItem":
          return "1. " + text
        case "checkListItem":
          return (block.props?.checked ? "[x] " : "[ ] ") + text
        default:
          return text
      }
    })
    .filter(Boolean)
    .join("\n")
}

export function createKnowledgeTool(context: ToolContext) {
  return tool({
    description: "Manage knowledge base pages. Query existing pages, create new SOPs and documentation, or update page content.",
    inputSchema: knowledgeSchema,
    execute: async (params: z.infer<typeof knowledgeSchema>): Promise<KnowledgeResult | { success: boolean; message: string; page?: any }> => {
      const { supabase, userId, workspaceId } = context
      const { action } = params

      if (!workspaceId) {
        throw new Error("Workspace ID is required for knowledge operations")
      }

      // CREATE: Add a new page
      if (action === "create") {
        const { title, content, icon, parentId } = params

        if (!title) {
          throw new Error("Title is required to create a page")
        }

        const blockContent = content ? textToBlockNoteContent(content) : [{ type: "paragraph", content: [] }]

        const { data: page, error } = await supabase
          .from("knowledge_pages")
          .insert({
            workspace_id: workspaceId,
            parent_id: parentId || null,
            title,
            icon: icon || "📄",
            content: blockContent,
            created_by: userId,
            last_edited_by: userId,
          })
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to create page: ${error.message}`)
        }

        return {
          success: true,
          message: `Page "${title}" created successfully`,
          page: {
            id: page.id,
            title: page.title,
            icon: page.icon,
          },
        }
      }

      // UPDATE: Edit an existing page
      if (action === "update") {
        const { pageId, title, content } = params

        if (!pageId) {
          throw new Error("Page ID is required to update a page")
        }

        const updates: any = {
          last_edited_by: userId,
        }

        if (title) {
          updates.title = title
        }

        if (content) {
          updates.content = textToBlockNoteContent(content)
        }

        const { data: page, error } = await supabase
          .from("knowledge_pages")
          .update(updates)
          .eq("id", pageId)
          .eq("workspace_id", workspaceId)
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to update page: ${error.message}`)
        }

        return {
          success: true,
          message: `Page "${page.title}" updated successfully`,
          page: {
            id: page.id,
            title: page.title,
            icon: page.icon,
          },
        }
      }

      // QUERY: Search and list pages (default)
      const { search, limit = 10, parentId } = params

      let query = supabase
        .from("knowledge_pages")
        .select("id, title, icon, content, parent_id, created_at, updated_at")
        .eq("workspace_id", workspaceId)
        .eq("is_archived", false)
        .order("updated_at", { ascending: false })
        .limit(limit)

      if (parentId) {
        query = query.eq("parent_id", parentId)
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%`)
      }

      const { data: pages, error } = await query

      if (error) {
        throw new Error(`Failed to fetch pages: ${error.message}`)
      }

      const formattedPages = (pages || []).map((page: any) => ({
        id: page.id,
        title: page.title,
        icon: page.icon,
        excerpt: blockNoteToText(page.content || []).slice(0, 200),
        parentId: page.parent_id,
        updatedAt: page.updated_at,
      }))

      return {
        pages: formattedPages,
        summary: {
          count: formattedPages.length,
        },
      }
    },
  })
}
