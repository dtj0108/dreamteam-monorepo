import { streamText, UIMessage, convertToModelMessages, stepCountIs } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"
import { buildAgentTools } from "@/lib/agent"

// Allow streaming responses up to 60 seconds for tool execution
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return new Response("Unauthorized", { status: 401 })
    }

    const body = await req.json()

    const {
      messages,
      agentId,
    }: {
      messages: UIMessage[]
      agentId?: string
    } = body

    // Ensure messages is an array
    if (!messages || !Array.isArray(messages)) {
      return new Response(`Invalid request: messages must be an array`, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get agent config from database if agentId is provided
    let systemPrompt = getDefaultSystemPrompt()
    let model = "claude-sonnet-4-20250514"
    let enabledTools: string[] = []
    let workspaceId: string | undefined

    if (agentId) {
      const { data: agent, error } = await supabase
        .from("agents")
        .select("*, workspace_id")
        .eq("id", agentId)
        .eq("is_active", true)
        .single()

      if (agent && !error) {
        systemPrompt = agent.system_prompt
        model = "claude-sonnet-4-20250514" // Use Claude Sonnet 4 with thinking
        enabledTools = agent.tools || []
        workspaceId = agent.workspace_id

        // Load assigned skills for this agent
        const { data: assignedSkills } = await supabase
          .from("agent_skill_assignments")
          .select(`
            skill:skill_id(
              id,
              name,
              display_name,
              content,
              is_active
            )
          `)
          .eq("agent_id", agentId)

        // Append active skills to system prompt
        interface SkillData { id: string; name: string; display_name: string; content: string; is_active: boolean }
        if (assignedSkills && assignedSkills.length > 0) {
          const activeSkills: SkillData[] = assignedSkills
            .filter((s: { skill: SkillData | null }) => s.skill?.is_active !== false)
            .map((s: { skill: SkillData | null }) => s.skill)
            .filter((skill: SkillData | null): skill is SkillData => skill != null)

          if (activeSkills.length > 0) {
            const skillsContent = activeSkills
              .map((skill) => `## Skill: ${skill.display_name}\n\n${skill.content}`)
              .join("\n\n---\n\n")

            systemPrompt = `${systemPrompt}

---

# Available Skills

The following skills provide detailed guidance for specific tasks. Use them when appropriate.

${skillsContent}`
          }
        }
      }
    }

    // Create tool context with user info
    const toolContext = {
      userId: session.id,
      workspaceId,
      supabase,
    }

    // Build tools with execute functions
    const tools = buildAgentTools(enabledTools, toolContext)

    // Convert messages for the model
    const modelMessages = await convertToModelMessages(messages)

    const result = streamText({
      model: anthropic(model),
      messages: modelMessages,
      system: systemPrompt,
      tools,
      stopWhen: stepCountIs(10), // Allow up to 10 steps for multi-step tool execution
      providerOptions: {
        anthropic: {
          thinking: {
            type: "enabled",
            budgetTokens: 4000, // Reduced from 10k for faster responses
          },
        },
      },
    })

    // Return with reasoning enabled in the stream
    return result.toUIMessageStreamResponse({
      sendReasoning: true,
    })
  } catch (error) {
    console.error("[Chat API] Error:", error)
    return new Response(`Internal server error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 })
  }
}

function getDefaultSystemPrompt(): string {
  return `You are a helpful AI assistant for a finance management application. 
You help users with their financial questions and provide accurate, helpful information.
Be concise and friendly.`
}
