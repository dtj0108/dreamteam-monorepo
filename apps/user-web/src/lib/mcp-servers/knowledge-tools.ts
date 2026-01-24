import { z } from "zod"
import type { MCPToolContext, MCPToolResponse } from "./types"
import { formatActionableError, truncateText } from "./types"

// ============================================================================
// KNOWLEDGE TOOL
// ============================================================================

const knowledgeSchema = z.object({
  action: z.enum(["query", "create", "update"]).default("query"),
  responseFormat: z.enum(["concise", "detailed"]).default("concise"),
  // Query params
  search: z.string().optional(),
  limit: z.number().optional().default(10),
  parentId: z.string().optional(),
  // Create params
  title: z.string().optional(),
  content: z.string().optional().describe("Markdown content for the page"),
  icon: z.string().optional().describe("Emoji icon for the page"),
  // Update params
  pageId: z.string().optional(),
})

type KnowledgeInput = z.infer<typeof knowledgeSchema>

// Convert markdown to BlockNote format
function textToBlockNoteContent(text: string): any[] {
  const lines = text.split("\n")
  const blocks: any[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "heading", content: [{ type: "text", text: trimmed.slice(4) }], props: { level: 3 } })
    } else if (trimmed.startsWith("## ")) {
      blocks.push({ type: "heading", content: [{ type: "text", text: trimmed.slice(3) }], props: { level: 2 } })
    } else if (trimmed.startsWith("# ")) {
      blocks.push({ type: "heading", content: [{ type: "text", text: trimmed.slice(2) }], props: { level: 1 } })
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      blocks.push({ type: "bulletListItem", content: [{ type: "text", text: trimmed.slice(2) }] })
    } else if (/^\d+\.\s/.test(trimmed)) {
      blocks.push({ type: "numberedListItem", content: [{ type: "text", text: trimmed.replace(/^\d+\.\s/, "") }] })
    } else if (trimmed.startsWith("[ ] ") || trimmed.startsWith("[x] ")) {
      blocks.push({ type: "checkListItem", content: [{ type: "text", text: trimmed.slice(4) }], props: { checked: trimmed.startsWith("[x]") } })
    } else {
      blocks.push({ type: "paragraph", content: [{ type: "text", text: trimmed }] })
    }
  }

  return blocks.length > 0 ? blocks : [{ type: "paragraph", content: [] }]
}

// Convert BlockNote to plain text
function blockNoteToText(content: any[]): string {
  if (!Array.isArray(content)) return ""

  return content
    .map((block: any) => {
      const text = block.content?.map((c: any) => c.text || "").join("") || ""
      switch (block.type) {
        case "heading":
          return "#".repeat(block.props?.level || 1) + " " + text
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

async function executeKnowledge(input: KnowledgeInput, context: MCPToolContext): Promise<MCPToolResponse> {
  const { supabase, userId, workspaceId } = context
  const { action, responseFormat } = input

  if (!workspaceId) {
    return { success: false, error: "Workspace context is required for knowledge operations." }
  }

  try {
    // CREATE
    if (action === "create") {
      const { title, content, icon, parentId } = input
      if (!title) return { success: false, error: "Page title is required." }

      const blockContent = content ? textToBlockNoteContent(content) : [{ type: "paragraph", content: [] }]

      const { data, error } = await supabase
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

      if (error) throw new Error(error.message)
      return { success: true, data: { message: `Page "${title}" created.`, id: data.id, icon: data.icon } }
    }

    // UPDATE
    if (action === "update") {
      const { pageId, title, content } = input
      if (!pageId) return { success: false, error: "Page ID is required. List pages first." }

      const updates: Record<string, unknown> = { last_edited_by: userId }
      if (title) updates.title = title
      if (content) updates.content = textToBlockNoteContent(content)

      const { data, error } = await supabase
        .from("knowledge_pages")
        .update(updates)
        .eq("id", pageId)
        .eq("workspace_id", workspaceId)
        .select("title")
        .single()

      if (error) throw new Error(error.message)
      return { success: true, data: { message: `Page "${data.title}" updated.` } }
    }

    // QUERY (default)
    const { search, limit = 10, parentId } = input

    let query = supabase
      .from("knowledge_pages")
      .select("id, title, icon, content, parent_id, updated_at")
      .eq("workspace_id", workspaceId)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false })
      .limit(limit)

    if (parentId) query = query.eq("parent_id", parentId)
    if (search) query = query.or(`title.ilike.%${search}%`)

    const { data: pages, error } = await query
    if (error) throw new Error(error.message)

    const formatted = (pages || []).map((page: any) => ({
      id: page.id,
      title: page.title,
      icon: page.icon,
      excerpt: truncateText(blockNoteToText(page.content || []), 150),
      parentId: page.parent_id,
    }))

    if (responseFormat === "concise") {
      const lines = formatted.map((p) => `${p.icon} ${p.title}`)
      return { success: true, data: { summary: `${formatted.length} pages`, pages: lines.join("\n") } }
    }

    return { success: true, data: { pages: formatted, summary: { count: formatted.length } } }
  } catch (error) {
    return { success: false, error: formatActionableError(error) }
  }
}

// ============================================================================
// MEMORY TOOL
// ============================================================================

const memorySchema = z.object({
  action: z.enum(["view", "create", "edit", "delete", "list"]).describe("view=read, create=new file, edit=replace text, delete=remove, list=show all"),
  path: z.string().optional().describe("File path like '/memories/users/drew.md'"),
  content: z.string().optional().describe("Content for create action"),
  oldStr: z.string().optional().describe("Text to find (for edit)"),
  newStr: z.string().optional().describe("Replacement text (for edit)"),
})

type MemoryInput = z.infer<typeof memorySchema>

async function executeMemory(input: MemoryInput, context: MCPToolContext): Promise<MCPToolResponse> {
  const { supabase, workspaceId } = context
  const { action, path, content, oldStr, newStr } = input
  const agentId = (context as any).agentId || null

  if (!workspaceId) {
    return { success: false, error: "Workspace context is required." }
  }

  try {
    // LIST
    if (action === "list") {
      const { data, error } = await supabase
        .from("agent_memories")
        .select("path, updated_at")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false })

      if (error) throw new Error(error.message)

      const files = (data || []).map((m: any) => m.path)
      return {
        success: true,
        data: { message: `${files.length} memory files`, files },
      }
    }

    // VIEW
    if (action === "view") {
      if (!path) return { success: false, error: "Path is required. Use list to see available files." }

      const { data, error } = await supabase
        .from("agent_memories")
        .select("content")
        .eq("workspace_id", workspaceId)
        .eq("path", path)
        .single()

      if (error || !data) return { success: false, error: `File not found: ${path}` }
      return { success: true, data: { path, content: data.content } }
    }

    // CREATE
    if (action === "create") {
      if (!path) return { success: false, error: "Path is required (e.g., '/memories/users/drew.md')." }
      if (!content) return { success: false, error: "Content is required." }

      // Check if exists
      const { data: existing } = await supabase
        .from("agent_memories")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("path", path)
        .single()

      if (existing) {
        // Update existing
        await supabase.from("agent_memories").update({ content }).eq("workspace_id", workspaceId).eq("path", path)
        return { success: true, data: { message: `Updated: ${path}` } }
      }

      const { error } = await supabase
        .from("agent_memories")
        .insert({ workspace_id: workspaceId, agent_id: agentId, path, content })

      if (error) throw new Error(error.message)
      return { success: true, data: { message: `Created: ${path}` } }
    }

    // EDIT (str_replace)
    if (action === "edit") {
      if (!path) return { success: false, error: "Path is required." }
      if (!oldStr) return { success: false, error: "oldStr is required (text to find)." }
      if (newStr === undefined) return { success: false, error: "newStr is required (replacement)." }

      const { data, error } = await supabase
        .from("agent_memories")
        .select("content")
        .eq("workspace_id", workspaceId)
        .eq("path", path)
        .single()

      if (error || !data) return { success: false, error: `File not found: ${path}` }

      if (!data.content.includes(oldStr)) {
        return { success: false, error: `Text not found: "${truncateText(oldStr, 50)}"` }
      }

      const newContent = data.content.replace(oldStr, newStr)
      await supabase.from("agent_memories").update({ content: newContent }).eq("workspace_id", workspaceId).eq("path", path)

      return { success: true, data: { message: `Updated: ${path}` } }
    }

    // DELETE
    if (action === "delete") {
      if (!path) return { success: false, error: "Path is required." }

      await supabase.from("agent_memories").delete().eq("workspace_id", workspaceId).eq("path", path)
      return { success: true, data: { message: `Deleted: ${path}` } }
    }

    return { success: false, error: "Invalid action." }
  } catch (error) {
    return { success: false, error: formatActionableError(error) }
  }
}

// ============================================================================
// WEB SEARCH TOOL
// ============================================================================

const webSearchSchema = z.object({
  query: z.string().describe("Search query"),
  type: z.enum(["news", "stocks", "general"]).optional().default("general"),
  maxResults: z.number().optional().default(5),
})

type WebSearchInput = z.infer<typeof webSearchSchema>

async function executeWebSearch(input: WebSearchInput, _context: MCPToolContext): Promise<MCPToolResponse> {
  const { query, type = "general", maxResults = 5 } = input

  // Enhance query based on type
  let enhancedQuery = query
  if (type === "news") enhancedQuery = `${query} financial news`
  else if (type === "stocks") enhancedQuery = `${query} stock market`

  const tavilyApiKey = process.env.TAVILY_API_KEY

  if (!tavilyApiKey) {
    return {
      success: false,
      error: "Web search requires TAVILY_API_KEY. Configure it to enable search.",
      hint: "Set TAVILY_API_KEY in environment variables.",
    }
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query: enhancedQuery,
        search_depth: "basic",
        max_results: maxResults,
        include_domains: type === "news"
          ? ["bloomberg.com", "reuters.com", "cnbc.com", "wsj.com", "ft.com"]
          : undefined,
      }),
    })

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`)
    }

    const data = await response.json()

    const results = (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: truncateText(r.content || "", 200),
    }))

    return {
      success: true,
      data: {
        query: enhancedQuery,
        results,
        summary: `Found ${results.length} results for "${query}"`,
      },
    }
  } catch (error) {
    return { success: false, error: formatActionableError(error) }
  }
}

// ============================================================================
// TOOL DEFINITIONS EXPORT
// ============================================================================

export const knowledgeToolDefinitions = {
  manageKnowledge: {
    name: "manageKnowledge",
    description: "Manage knowledge base pages. Query existing documentation, create new pages with markdown content, or update existing pages.",
    schema: knowledgeSchema,
    execute: executeKnowledge,
  },
  manageMemory: {
    name: "manageMemory",
    description: "Persistent memory for storing key facts across conversations. Store user preferences, project context, and important information. Use paths like '/memories/users/drew.md'.",
    schema: memorySchema,
    execute: executeMemory,
  },
  searchWeb: {
    name: "searchWeb",
    description: "Search the web for financial news, stock information, or general topics. Specify type: 'news' for financial news, 'stocks' for market info, 'general' for broad search.",
    schema: webSearchSchema,
    execute: executeWebSearch,
  },
}

export type KnowledgeToolName = keyof typeof knowledgeToolDefinitions
