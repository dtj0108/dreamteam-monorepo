import type { Request } from "express"
import { Resend } from "resend"

type ErrorContext = Record<string, unknown>

interface SendAgentServerErrorEmailParams {
  source: string
  statusCode: number
  error: unknown
  request?: Request
  context?: ErrorContext
}

const RECIPIENTS = ["drew@dreamteam.ai", "dev@dreamteam.ai", "hello@dreamteam.ai"]
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "DreamTeam <hello@dreamteam.com>"
const THROTTLE_MS = 10 * 60 * 1000

const lastSentByKey = new Map<string, number>()

let resend: Resend | null = null

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

function formatErrorMessage(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) {
    return { message: err.message || "Unknown error", stack: err.stack }
  }
  if (typeof err === "string") {
    return { message: err }
  }
  return { message: "Unknown error", stack: JSON.stringify(err) }
}

function truncate(value: string, maxLength: number = 600): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength)}…`
}

function stringifyContext(context?: ErrorContext): string {
  if (!context) return "None"
  const entries = Object.entries(context).filter(([, val]) => val !== undefined && val !== null)
  if (entries.length === 0) return "None"
  return entries
    .map(([key, val]) => {
      const value =
        typeof val === "string"
          ? truncate(val, 600)
          : truncate(JSON.stringify(val), 600)
      return `${key}: ${value}`
    })
    .join("\n")
}

function buildRequestLine(request?: Request): string {
  if (!request) return "Unknown"
  const method = request.method || "UNKNOWN"
  const url = request.originalUrl || request.url || "unknown"
  return `${method} ${url}`
}

function shouldThrottle(key: string): boolean {
  const now = Date.now()
  const lastSent = lastSentByKey.get(key)
  if (lastSent && now - lastSent < THROTTLE_MS) {
    return true
  }
  lastSentByKey.set(key, now)

  if (lastSentByKey.size > 500) {
    for (const [entryKey, timestamp] of lastSentByKey) {
      if (now - timestamp > THROTTLE_MS) {
        lastSentByKey.delete(entryKey)
      }
    }
  }

  return false
}

export async function sendAgentServerErrorEmail(
  params: SendAgentServerErrorEmailParams
): Promise<void> {
  const client = getResendClient()
  if (!client) {
    console.warn("[ErrorEmail] RESEND_API_KEY missing, skipping error email")
    return
  }

  const { source, statusCode, error, request, context } = params
  const { message, stack } = formatErrorMessage(error)
  const timestamp = new Date().toISOString()
  const routeLine = buildRequestLine(request)
  const contextText = stringifyContext(context)

  const throttleKey = `${source}:${statusCode}:${routeLine}:${message}`
  if (shouldThrottle(throttleKey)) {
    console.warn(`[ErrorEmail] Throttled duplicate error email: ${source}`)
    return
  }

  const subject = `[Agent Server Error] ${source}`

  const text = [
    `Agent Server Error (${source})`,
    `Timestamp: ${timestamp}`,
    `Route: ${routeLine}`,
    `Status: ${statusCode}`,
    `Error: ${message}`,
    stack ? `Stack: ${stack}` : null,
    "",
    "Context:",
    contextText,
  ]
    .filter(Boolean)
    .join("\n")

  const htmlContext = contextText
    .split("\n")
    .map((line) => `<li>${line.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</li>`)
    .join("")

  const html = `
    <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #111827;">
      <h2>Agent Server Error (${source})</h2>
      <p><strong>Timestamp:</strong> ${timestamp}</p>
      <p><strong>Route:</strong> ${routeLine}</p>
      <p><strong>Status:</strong> ${statusCode}</p>
      <p><strong>Error:</strong> ${message}</p>
      ${stack ? `<pre style="background:#f3f4f6;padding:12px;border-radius:6px;white-space:pre-wrap;">${stack.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>` : ""}
      <h3>Context</h3>
      <ul>${htmlContext || "<li>None</li>"}</ul>
    </div>
  `

  try {
    await client.emails.send({
      from: FROM_EMAIL,
      to: RECIPIENTS,
      subject,
      text,
      html,
    })
  } catch (sendError) {
    console.error("[ErrorEmail] Failed to send error email:", sendError)
  }
}
