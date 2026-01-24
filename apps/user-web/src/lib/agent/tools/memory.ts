import { z } from "zod"
import { tool } from "ai"
import type { ToolContext } from "../types"

// Memory result type
export interface MemoryResult {
  success: boolean
  message: string
  path?: string
  content?: string
  files?: Array<{ path: string; updatedAt: string }>
}

export const memorySchema = z.object({
  action: z.enum(["view", "create", "str_replace", "delete", "list"]).describe(
    "Action to perform: view (read file), create (new file), str_replace (edit file), delete (remove file), list (list all memories)"
  ),
  path: z.string().optional().describe("File path like '/memories/users/drew.md' or '/memories/facts.md'"),
  content: z.string().optional().describe("Content for create action"),
  old_str: z.string().optional().describe("Text to find and replace (for str_replace)"),
  new_str: z.string().optional().describe("Replacement text (for str_replace)"),
})

export function createMemoryTool(context: ToolContext) {
  return tool({
    description: `Persistent memory system for storing and retrieving information across conversations.
Use this to remember important facts about users, preferences, project context, and relationships.
DO NOT store conversation history verbatim - only store key facts and learnings.
Memory files use paths like "/memories/users/drew.md" or "/memories/projects/website.md".`,
    inputSchema: memorySchema,
    execute: async (params: z.infer<typeof memorySchema>): Promise<MemoryResult> => {
      const { supabase, workspaceId } = context
      const { action, path, content, old_str, new_str } = params

      if (!workspaceId) {
        throw new Error("Workspace ID is required for memory operations")
      }

      // Get agent_id from context or use a workspace-level memory
      const agentId = (context as any).agentId || null

      // LIST: Show all memory files
      if (action === "list") {
        const { data: memories, error } = await supabase
          .from("agent_memories")
          .select("path, updated_at")
          .eq("workspace_id", workspaceId)
          .order("updated_at", { ascending: false })

        if (error) {
          throw new Error(`Failed to list memories: ${error.message}`)
        }

        return {
          success: true,
          message: `Found ${memories?.length || 0} memory files`,
          files: (memories || []).map((m: any) => ({
            path: m.path,
            updatedAt: m.updated_at,
          })),
        }
      }

      // VIEW: Read a memory file
      if (action === "view") {
        if (!path) {
          throw new Error("Path is required to view a memory file")
        }

        const { data: memory, error } = await supabase
          .from("agent_memories")
          .select("content, updated_at")
          .eq("workspace_id", workspaceId)
          .eq("path", path)
          .single()

        if (error || !memory) {
          return {
            success: false,
            message: `Memory file not found: ${path}`,
            path,
          }
        }

        return {
          success: true,
          message: `Memory file: ${path}`,
          path,
          content: memory.content,
        }
      }

      // CREATE: Create a new memory file
      if (action === "create") {
        if (!path) {
          throw new Error("Path is required to create a memory file")
        }
        if (!content) {
          throw new Error("Content is required to create a memory file")
        }

        // Check if file already exists
        const { data: existing } = await supabase
          .from("agent_memories")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("path", path)
          .single()

        if (existing) {
          // Update existing file instead
          const { error } = await supabase
            .from("agent_memories")
            .update({ content })
            .eq("workspace_id", workspaceId)
            .eq("path", path)

          if (error) {
            throw new Error(`Failed to update memory: ${error.message}`)
          }

          return {
            success: true,
            message: `Updated existing memory file: ${path}`,
            path,
          }
        }

        const { error } = await supabase
          .from("agent_memories")
          .insert({
            workspace_id: workspaceId,
            agent_id: agentId,
            path,
            content,
          })

        if (error) {
          throw new Error(`Failed to create memory: ${error.message}`)
        }

        return {
          success: true,
          message: `Created memory file: ${path}`,
          path,
        }
      }

      // STR_REPLACE: Edit content in a memory file
      if (action === "str_replace") {
        if (!path) {
          throw new Error("Path is required for str_replace")
        }
        if (!old_str) {
          throw new Error("old_str is required for str_replace")
        }
        if (new_str === undefined) {
          throw new Error("new_str is required for str_replace")
        }

        // Get current content
        const { data: memory, error: fetchError } = await supabase
          .from("agent_memories")
          .select("content")
          .eq("workspace_id", workspaceId)
          .eq("path", path)
          .single()

        if (fetchError || !memory) {
          throw new Error(`Memory file not found: ${path}`)
        }

        // Replace the text
        if (!memory.content.includes(old_str)) {
          return {
            success: false,
            message: `Text not found in memory file: "${old_str}"`,
            path,
          }
        }

        const newContent = memory.content.replace(old_str, new_str)

        const { error: updateError } = await supabase
          .from("agent_memories")
          .update({ content: newContent })
          .eq("workspace_id", workspaceId)
          .eq("path", path)

        if (updateError) {
          throw new Error(`Failed to update memory: ${updateError.message}`)
        }

        return {
          success: true,
          message: `Updated memory file: ${path}`,
          path,
        }
      }

      // DELETE: Remove a memory file
      if (action === "delete") {
        if (!path) {
          throw new Error("Path is required to delete a memory file")
        }

        const { error } = await supabase
          .from("agent_memories")
          .delete()
          .eq("workspace_id", workspaceId)
          .eq("path", path)

        if (error) {
          throw new Error(`Failed to delete memory: ${error.message}`)
        }

        return {
          success: true,
          message: `Deleted memory file: ${path}`,
          path,
        }
      }

      throw new Error(`Unknown action: ${action}`)
    },
  })
}
