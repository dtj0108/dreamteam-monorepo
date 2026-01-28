/**
 * Hallucination Detection Module
 *
 * Detects suspicious patterns in agent responses that may indicate
 * the agent fabricated data instead of using tools to query real data.
 */

export interface HallucinationCheckResult {
  isLikelyHallucination: boolean
  confidence: "low" | "medium" | "high"
  indicators: HallucinationIndicator[]
  summary: string
}

export interface HallucinationIndicator {
  type: HallucinationType
  description: string
  evidence: string[]
  severity: "low" | "medium" | "high"
}

export type HallucinationType =
  | "generic_names"
  | "round_numbers"
  | "fictitious_tools"
  | "no_tool_calls_with_data"
  | "placeholder_patterns"
  | "suspicious_data_format"

// Common placeholder/generic names that suggest fabrication
const GENERIC_NAMES = [
  "alice",
  "bob",
  "charlie",
  "dana",
  "eve",
  "frank",
  "grace",
  "heidi",
  "ivan",
  "judy",
  "mallory",
  "oscar",
  "peggy",
  "trent",
  "victor",
  "wendy",
  "john doe",
  "jane doe",
  "john smith",
  "jane smith",
  "acme",
  "example",
  "sample",
  "test user",
  "demo",
]

// Tool names that don't exist but agents might claim to use
const FICTITIOUS_TOOLS = [
  "task_update",
  "task_assign",
  "update_task",
  "assign_task",
  "get_workload",
  "fetch_team",
  "query_database",
  "execute_query",
  "run_query",
  "database_query",
]

// Patterns that suggest placeholder/example data
const PLACEHOLDER_PATTERNS = [
  /\bxxx+\b/i,
  /\byyy+\b/i,
  /\bzzz+\b/i,
  /\[.*placeholder.*\]/i,
  /\[.*example.*\]/i,
  /\[.*insert.*\]/i,
  /\(to be determined\)/i,
  /\(tbd\)/i,
  /lorem ipsum/i,
  /foo\s*bar/i,
  /example\.(com|org|net)/i,
]

// Round number patterns (exactly 8 hours, 10.5 hours, etc.)
const ROUND_HOUR_PATTERN = /\b(\d+)(\.0|\.5)?\s*(hours?|hrs?)\b/gi

/**
 * Check if a response likely contains hallucinated data.
 *
 * @param response - The agent's response text
 * @param toolCalls - Array of tool calls made during execution
 * @param taskPrompt - The original task prompt
 * @param availableTools - Number of tools available to the agent
 */
export function detectHallucination(
  response: string,
  toolCalls: any[],
  taskPrompt: string,
  availableTools: number
): HallucinationCheckResult {
  const indicators: HallucinationIndicator[] = []
  const responseLower = response.toLowerCase()

  // Check 1: No tool calls but response contains data-like content
  const isDataDependentTask = checkIfDataDependentTask(taskPrompt)
  if (isDataDependentTask && toolCalls.length === 0 && availableTools > 0) {
    // Agent had tools but didn't use them for a data-dependent task
    indicators.push({
      type: "no_tool_calls_with_data",
      description: "Task requires data but no tools were called despite tools being available",
      evidence: ["Task appears data-dependent", `${availableTools} tools available`, "0 tool calls made"],
      severity: "high",
    })
  }

  if (isDataDependentTask && toolCalls.length === 0 && availableTools === 0) {
    // Agent had no tools but still produced data-like content
    const hasDataContent = checkIfResponseContainsData(response)
    if (hasDataContent) {
      indicators.push({
        type: "no_tool_calls_with_data",
        description: "Response contains data but no tools were available to query it",
        evidence: ["No tools available", "Response contains data-like content"],
        severity: "high",
      })
    }
  }

  // Check 2: Generic/placeholder names
  const foundNames = findGenericNames(responseLower)
  if (foundNames.length > 0) {
    indicators.push({
      type: "generic_names",
      description: "Response contains generic placeholder names commonly used in examples",
      evidence: foundNames.slice(0, 5), // Limit evidence
      severity: foundNames.length >= 3 ? "high" : foundNames.length >= 2 ? "medium" : "low",
    })
  }

  // Check 3: Fictitious tool references
  const fictitiousRefs = findFictitiousToolReferences(response)
  if (fictitiousRefs.length > 0) {
    indicators.push({
      type: "fictitious_tools",
      description: "Response references tools that don't exist",
      evidence: fictitiousRefs,
      severity: "high",
    })
  }

  // Check 4: Placeholder patterns
  const placeholders = findPlaceholderPatterns(response)
  if (placeholders.length > 0) {
    indicators.push({
      type: "placeholder_patterns",
      description: "Response contains placeholder or example patterns",
      evidence: placeholders.slice(0, 5),
      severity: "medium",
    })
  }

  // Check 5: Suspicious round numbers (for capacity/workload reports)
  const roundNumbers = findSuspiciousRoundNumbers(response, taskPrompt)
  if (roundNumbers.length >= 3) {
    indicators.push({
      type: "round_numbers",
      description: "Response contains many suspiciously round numbers",
      evidence: roundNumbers.slice(0, 5),
      severity: roundNumbers.length >= 5 ? "high" : "medium",
    })
  }

  // Calculate overall assessment
  const highSeverityCount = indicators.filter((i) => i.severity === "high").length
  const mediumSeverityCount = indicators.filter((i) => i.severity === "medium").length

  let isLikelyHallucination = false
  let confidence: "low" | "medium" | "high" = "low"

  if (highSeverityCount >= 2) {
    isLikelyHallucination = true
    confidence = "high"
  } else if (highSeverityCount === 1 && mediumSeverityCount >= 1) {
    isLikelyHallucination = true
    confidence = "medium"
  } else if (highSeverityCount === 1) {
    isLikelyHallucination = true
    confidence = "low"
  } else if (mediumSeverityCount >= 2) {
    isLikelyHallucination = true
    confidence = "low"
  }

  const summary = isLikelyHallucination
    ? `Likely hallucination detected (${confidence} confidence): ${indicators.map((i) => i.type).join(", ")}`
    : "No hallucination indicators detected"

  return {
    isLikelyHallucination,
    confidence,
    indicators,
    summary,
  }
}

/**
 * Check if the task prompt implies data access is needed
 */
function checkIfDataDependentTask(taskPrompt: string): boolean {
  const dataKeywords = [
    "check",
    "review",
    "analyze",
    "report",
    "list",
    "show",
    "get",
    "fetch",
    "find",
    "query",
    "status",
    "capacity",
    "workload",
    "team",
    "members",
    "tasks",
    "projects",
    "data",
    "database",
    "metrics",
    "statistics",
    "current",
    "today",
    "this week",
    "progress",
    "update",
  ]

  const promptLower = taskPrompt.toLowerCase()
  return dataKeywords.some((keyword) => promptLower.includes(keyword))
}

/**
 * Check if response contains data-like content
 */
function checkIfResponseContainsData(response: string): boolean {
  // Check for structured data patterns
  const dataPatterns = [
    /\d+\s*(hours?|hrs?|tasks?|items?|projects?)/i,
    /\d+%/,
    /\$\d+/,
    /\d+\/\d+/,
    /(completed|in progress|pending|blocked):\s*\d+/i,
    /team\s*members?/i,
    /assigned\s*to/i,
    /workload/i,
    /capacity/i,
  ]

  return dataPatterns.some((pattern) => pattern.test(response))
}

/**
 * Find generic/placeholder names in text
 */
function findGenericNames(text: string): string[] {
  const found: string[] = []

  for (const name of GENERIC_NAMES) {
    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${name}\\b`, "gi")
    if (regex.test(text)) {
      found.push(name)
    }
  }

  return found
}

/**
 * Find references to fictitious tools
 */
function findFictitiousToolReferences(response: string): string[] {
  const found: string[] = []
  const responseLower = response.toLowerCase()

  for (const tool of FICTITIOUS_TOOLS) {
    if (responseLower.includes(tool)) {
      found.push(tool)
    }
  }

  // Also check for patterns like "I used the X tool" or "called X"
  const usedToolPattern = /(?:used|called|invoked|executed)\s+(?:the\s+)?(\w+(?:_\w+)*)\s+(?:tool|function)/gi
  let match
  while ((match = usedToolPattern.exec(response)) !== null) {
    const toolName = match[1].toLowerCase()
    if (FICTITIOUS_TOOLS.includes(toolName) && !found.includes(toolName)) {
      found.push(toolName)
    }
  }

  return found
}

/**
 * Find placeholder patterns in text
 */
function findPlaceholderPatterns(response: string): string[] {
  const found: string[] = []

  for (const pattern of PLACEHOLDER_PATTERNS) {
    const match = response.match(pattern)
    if (match) {
      found.push(match[0])
    }
  }

  return found
}

/**
 * Find suspiciously round numbers in capacity/workload reports
 */
function findSuspiciousRoundNumbers(response: string, taskPrompt: string): string[] {
  // Only check for round numbers if this looks like a capacity/workload report
  const isCapacityReport =
    /capacity|workload|hours?|allocation|utilization/i.test(taskPrompt) ||
    /capacity|workload|hours?|allocation|utilization/i.test(response)

  if (!isCapacityReport) return []

  const found: string[] = []
  let match

  while ((match = ROUND_HOUR_PATTERN.exec(response)) !== null) {
    const num = parseFloat(match[1] + (match[2] || ""))
    // Flag exact hours or .5 hours as suspicious
    if (num === Math.floor(num) || num % 0.5 === 0) {
      found.push(match[0])
    }
  }

  // Reset regex lastIndex
  ROUND_HOUR_PATTERN.lastIndex = 0

  return found
}

/**
 * Format hallucination check result for logging
 */
export function formatHallucinationResult(result: HallucinationCheckResult): string {
  if (!result.isLikelyHallucination) {
    return "Hallucination check: PASSED"
  }

  const lines = [`Hallucination check: WARNING (${result.confidence} confidence)`, `Summary: ${result.summary}`, "Indicators:"]

  for (const indicator of result.indicators) {
    lines.push(`  - [${indicator.severity.toUpperCase()}] ${indicator.type}: ${indicator.description}`)
    if (indicator.evidence.length > 0) {
      lines.push(`    Evidence: ${indicator.evidence.join(", ")}`)
    }
  }

  return lines.join("\n")
}
