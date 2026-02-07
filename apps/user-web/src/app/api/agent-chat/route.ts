import { streamText, stepCountIs } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"
import { buildAgentTools } from "@/lib/agent"
import { getWorkspaceBilling, hasActiveAgents } from '@/lib/billing-queries'

// Allow streaming responses up to 60 seconds for tool execution
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return new Response("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { message, agentId, workspaceId, conversationId } = body

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Invalid request: message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    const supabase = createAdminClient()

    // Get agent config from database if agentId is provided
    let systemPrompt = getDefaultSystemPrompt()
    let model = "claude-sonnet-4-20250514"
    let enabledTools: string[] = []
    let agentWorkspaceId: string | undefined

    if (agentId) {
      console.log("[Agent Chat] Loading agent:", agentId)

      const { data: agent, error } = await supabase
        .from("agents")
        .select("*, workspace_id")
        .eq("id", agentId)
        .eq("is_active", true)
        .single()

      if (error) {
        console.error("[Agent Chat] Error loading agent:", error)
      }

      if (agent && !error) {
        console.log("[Agent Chat] Agent loaded:", agent.name, "Tools:", agent.tools)
        systemPrompt = agent.system_prompt
        agentWorkspaceId = agent.workspace_id
        enabledTools = agent.tools || []

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
        if (assignedSkills && assignedSkills.length > 0) {
          const activeSkills = assignedSkills
            .filter((s: any) => s.skill?.is_active !== false)
            .map((s: any) => s.skill)
            .filter(Boolean)

          if (activeSkills.length > 0) {
            const skillsContent = activeSkills
              .map((skill: any) => `## Skill: ${skill.display_name}\n\n${skill.content}`)
              .join("\n\n---\n\n")

            systemPrompt = `${systemPrompt}

---

# Available Skills

The following skills provide detailed guidance for specific tasks. Use them when appropriate.

${skillsContent}`
          }
        }
      } else {
        console.log("[Agent Chat] Agent not found or inactive:", agentId)
      }
    }

    // Billing gate: require active agent subscription
    // Runs after agent loading so we can resolve workspaceId from the agent's workspace_id
    const resolvedWorkspaceId = workspaceId || agentWorkspaceId
    if (!resolvedWorkspaceId) {
      return new Response(
        JSON.stringify({ error: 'workspaceId is required', code: 'missing_workspace' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const billing = await getWorkspaceBilling(resolvedWorkspaceId)
    if (!hasActiveAgents(billing)) {
      return new Response(
        JSON.stringify({ error: 'Agent subscription required', code: 'no_agent_subscription' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create tool context with user info
    const toolContext = {
      userId: session.id,
      workspaceId: workspaceId || agentWorkspaceId || session.id,
      supabase,
    }

    // Build tools with execute functions
    const tools = buildAgentTools(enabledTools, toolContext)
    console.log("[Agent Chat] Enabled tools:", Object.keys(tools))

    // Create the result stream
    const result = streamText({
      model: anthropic(model),
      messages: [{ role: "user", content: message }],
      system: systemPrompt,
      tools,
      stopWhen: stepCountIs(10),
      providerOptions: {
        anthropic: {
          thinking: {
            type: "enabled",
            budgetTokens: 4000,
          },
        },
      },
    })

    // Create a custom stream that formats events for our useAgentChat hook
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // Send session event
        const sessionEvent = `event: session\ndata: ${JSON.stringify({
          type: "session",
          sessionId: `session-${Date.now()}`,
          conversationId: conversationId || `conv-${Date.now()}`,
        })}\n\n`
        controller.enqueue(encoder.encode(sessionEvent))

        try {
          // Use the full stream to get text, tool calls, and tool results
          for await (const chunk of result.fullStream) {
            console.log("[Agent Chat] Chunk type:", chunk.type)

            switch (chunk.type) {
              case "text-delta": {
                const textEvent = `event: text\ndata: ${JSON.stringify({
                  type: "text",
                  content: (chunk as any).text,
                })}\n\n`
                controller.enqueue(encoder.encode(textEvent))
                break
              }

              case "tool-call": {
                const toolStartEvent = `event: tool_start\ndata: ${JSON.stringify({
                  type: "tool_start",
                  toolCallId: (chunk as any).toolCallId,
                  toolName: (chunk as any).toolName,
                  args: (chunk as any).input || (chunk as any).args,
                })}\n\n`
                controller.enqueue(encoder.encode(toolStartEvent))
                break
              }

              case "tool-result": {
                const toolResultEvent = `event: tool_result\ndata: ${JSON.stringify({
                  type: "tool_result",
                  toolCallId: (chunk as any).toolCallId,
                  result: (chunk as any).output || (chunk as any).result,
                  success: true,
                })}\n\n`
                controller.enqueue(encoder.encode(toolResultEvent))
                break
              }

              case "error": {
                console.error("[Agent Chat] Stream error:", chunk.error)
                const errorEvent = `event: error\ndata: ${JSON.stringify({
                  type: "error",
                  message: String(chunk.error),
                })}\n\n`
                controller.enqueue(encoder.encode(errorEvent))
                break
              }
            }
          }

          // Send done event
          const doneEvent = `event: done\ndata: ${JSON.stringify({
            type: "done",
            usage: {
              inputTokens: 0,
              outputTokens: 0,
              costUsd: 0,
            },
          })}\n\n`
          controller.enqueue(encoder.encode(doneEvent))
          console.log("[Agent Chat] Stream complete")
        } catch (error) {
          console.error("[Agent Chat] Stream error:", error)
          const errorEvent = `event: error\ndata: ${JSON.stringify({
            type: "error",
            message: error instanceof Error ? error.message : "Stream error",
          })}\n\n`
          controller.enqueue(encoder.encode(errorEvent))
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    })
  } catch (error) {
    console.error("[Agent Chat API] Error:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
}

function getDefaultSystemPrompt(): string {
  return `You are a helpful AI assistant for a finance management application. 
You help users with their financial questions and provide accurate, helpful information.
Be concise and friendly.`
}
