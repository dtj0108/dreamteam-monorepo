/**
 * Agent Server - Express Server Entry Point
 *
 * This server handles the agent-chat endpoint using Claude Agent SDK.
 * It's deployed to Railway because it requires subprocess spawning
 * (for Claude Code CLI + MCP server), which Vercel serverless doesn't support.
 *
 * Flow:
 * Mobile Request → Vercel → rewrites to Railway → Claude Agent SDK → MCP Server → Supabase
 */

import express from "express"
import cors from "cors"
import { agentChatHandler } from "./agent-chat.js"
import { agentChannelMessageHandler } from "./agent-channel-handler.js"
import { scheduledExecutionHandler } from "./scheduled-execution.js"
import { testTool, type ToolTestRequest } from "./tools-test.js"
import { sendAgentServerErrorEmail } from "./lib/error-email.js"

const app = express()

// CORS configuration for cross-origin requests
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
)

// Parse JSON request bodies
app.use(express.json())

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  })
})

// Main agent chat endpoint
app.post("/agent-chat", agentChatHandler)

// Agent channel webhook endpoint (triggered by Supabase)
app.post("/agent-channel-message", agentChannelMessageHandler)

// Scheduled execution endpoint (called by admin cron)
app.post("/scheduled-execution", scheduledExecutionHandler)

// Tool testing endpoint - executes tools via MCP server for admin testing
app.post("/tools/test", async (req, res) => {
  try {
    const { toolName, toolInput, workspaceId } = req.body as ToolTestRequest

    if (!toolName || !workspaceId) {
      return res.status(400).json({ error: "toolName and workspaceId required" })
    }

    console.log(`[Tools Test] Testing tool: ${toolName} for workspace: ${workspaceId}`)

    const result = await testTool({
      toolName,
      toolInput: toolInput || {},
      workspaceId,
    })

    console.log(`[Tools Test] Result for ${toolName}: success=${result.success}, latency=${result.latencyMs}ms`)

    res.json(result)
  } catch (err) {
    console.error("[Tools Test] Error:", err)
    try {
      await sendAgentServerErrorEmail({
        source: "tools-test",
        statusCode: 500,
        error: err,
        request: req,
        context: {
          toolName: (req.body as ToolTestRequest | undefined)?.toolName,
          workspaceId: (req.body as ToolTestRequest | undefined)?.workspaceId,
        },
      })
      res.locals.errorReported = true
    } catch (notifyError) {
      console.error("[Tools Test] Failed to send error email:", notifyError)
    }
    res.status(500).json({ error: "Test execution failed" })
  }
})

// Handle OPTIONS preflight requests
app.options("/agent-chat", (_req, res) => {
  res.status(204).end()
})

app.options("/agent-channel-message", (_req, res) => {
  res.status(204).end()
})

app.options("/tools/test", (_req, res) => {
  res.status(204).end()
})

app.options("/scheduled-execution", (_req, res) => {
  res.status(204).end()
})

// Error handling middleware
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[Server] Unhandled error:", err)
    if (!res.locals.errorReported) {
      sendAgentServerErrorEmail({
        source: "unhandled-error",
        statusCode: 500,
        error: err,
        request: _req,
      }).catch((notifyError) => {
        console.error("[Server] Failed to send error email:", notifyError)
      })
      res.locals.errorReported = true
    }
    res.status(500).json({
      error: "Internal server error",
      message: err.message,
    })
  }
)

// Start server
const PORT = process.env.PORT || 3002
app.listen(PORT, () => {
  console.log(`Agent server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
  console.log(`Agent chat: POST http://localhost:${PORT}/agent-chat`)
  console.log(`Agent channel webhook: POST http://localhost:${PORT}/agent-channel-message`)
  console.log(`Scheduled execution: POST http://localhost:${PORT}/scheduled-execution`)
})
