/**
 * Content Sanitizer
 * 
 * Removes AI function call artifacts and other metadata that shouldn't be displayed to users.
 * Handles xAI/Claude function call XML tags, date patterns, and other internal markers.
 */

// Pattern to match xAI function call blocks - these are the main culprits
const XAI_FUNCTION_CALL_PATTERN = /<xai:function_call[^>]*>[\s\S]*?<\/xai:function_call>/g

// Pattern to match XML-like tags that might be function-related (e.g., </xai:function_call>)
const XML_TAG_PATTERN = /<\/?[a-z_]+:[a-z_]+[^>]*>/gi

// Pattern to match UUIDs that appear immediately after dates (function call context)
// This is more specific to avoid removing legitimate UUID mentions
const DATE_FOLLOWED_BY_UUID_PATTERN = /\d{4}-\d{2}-\d{2}\s+[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi

// Pattern to match orphaned date pairs (two dates in a row with space)
// These typically appear in function call metadata
const ORPHANED_DATE_PAIR_PATTERN = /\d{4}-\d{2}-\d{2}\s+\d{4}-\d{2}-\d{2}/g

// Pattern to match multiple UUIDs in sequence (2 or more)
// This indicates function call metadata rather than legitimate content
const UUID_SEQUENCE_PATTERN = /(?:\s*[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\s*){2,}/gi

// Pattern to match standalone UUIDs surrounded by whitespace or at word boundaries
// This catches single UUIDs that are likely tool call IDs
const STANDALONE_UUID_PATTERN = /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi

/**
 * Sanitize message content by removing function call artifacts and metadata
 * Returns original content if sanitization would result in empty string
 */
export function sanitizeMessageContent(content: string): string {
  if (!content || typeof content !== "string") {
    return content
  }

  const originalContent = content
  let sanitized = content

  // Remove xAI function call blocks (highest priority)
  sanitized = sanitized.replace(XAI_FUNCTION_CALL_PATTERN, "")

  // Remove XML-like tags
  sanitized = sanitized.replace(XML_TAG_PATTERN, "")

  // Remove date followed by UUID patterns
  sanitized = sanitized.replace(DATE_FOLLOWED_BY_UUID_PATTERN, " ")

  // Remove orphaned date pairs
  sanitized = sanitized.replace(ORPHANED_DATE_PAIR_PATTERN, " ")

  // Remove UUID sequences (2+ UUIDs in a row)
  sanitized = sanitized.replace(UUID_SEQUENCE_PATTERN, " ")
  
  // Remove standalone UUIDs (likely tool call IDs)
  sanitized = sanitized.replace(STANDALONE_UUID_PATTERN, " ")

  // Clean up excessive whitespace BUT preserve newlines for markdown
  // Only collapse multiple spaces/tabs, not newlines
  sanitized = sanitized.replace(/[ \t]{2,}/g, " ")
  // Trim overall (don't trim each line to preserve indentation)
  sanitized = sanitized.trim()

  // If sanitization resulted in empty string but original had content,
  // return the original content (sanitizer was too aggressive)
  if (!sanitized && originalContent.trim()) {
    console.warn("[ContentSanitizer] Sanitization would empty content, returning original")
    return originalContent.trim()
  }

  return sanitized
}

/**
 * Check if content appears to contain function call artifacts
 */
export function containsFunctionArtifacts(content: string): boolean {
  if (!content || typeof content !== "string") {
    return false
  }

  return (
    XAI_FUNCTION_CALL_PATTERN.test(content) ||
    XML_TAG_PATTERN.test(content) ||
    DATE_FOLLOWED_BY_UUID_PATTERN.test(content)
  )
}

/**
 * Sanitize a text part's content
 */
export function sanitizeTextPart(text: string): string {
  return sanitizeMessageContent(text)
}

/**
 * Sanitize all text content in message parts
 */
export function sanitizeMessageParts(parts: Array<{ type: string; text?: string }>): Array<{ type: string; text?: string }> {
  return parts.map((part) => {
    if (part.type === "text" && part.text) {
      return {
        ...part,
        text: sanitizeMessageContent(part.text),
      }
    }
    return part
  })
}
