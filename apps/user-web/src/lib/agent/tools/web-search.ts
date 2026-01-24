import { z } from "zod"
import { tool } from "ai"
import type { ToolContext, WebSearchResult } from "../types"

export const webSearchSchema = z.object({
  query: z.string().describe("Search query for financial news or information"),
  type: z
    .enum(["news", "stocks", "general"])
    .optional()
    .default("general")
    .describe("Type of financial information to search"),
})

export function createWebSearchTool(_context: ToolContext) {
  return tool({
    description:
      "Search the web for financial news, stock information, or general financial topics.",
    inputSchema: webSearchSchema,
    execute: async (params: z.infer<typeof webSearchSchema>): Promise<WebSearchResult> => {
      const { query, type = "general" } = params

      // Enhance query based on type
      let enhancedQuery = query
      if (type === "news") {
        enhancedQuery = `${query} financial news`
      } else if (type === "stocks") {
        enhancedQuery = `${query} stock market`
      }

      // Check for Tavily API key
      const tavilyApiKey = process.env.TAVILY_API_KEY

      if (!tavilyApiKey) {
        // Fallback: Return a message indicating web search is not configured
        return {
          results: [
            {
              title: "Web Search Not Configured",
              url: "",
              snippet:
                "Web search requires a TAVILY_API_KEY environment variable. Please configure it to enable web search functionality.",
            },
          ],
          query: enhancedQuery,
        }
      }

      try {
        // Use Tavily API for search
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: tavilyApiKey,
            query: enhancedQuery,
            search_depth: "basic",
            max_results: 5,
            include_domains: type === "news"
              ? ["bloomberg.com", "reuters.com", "cnbc.com", "wsj.com", "ft.com"]
              : undefined,
          }),
        })

        if (!response.ok) {
          throw new Error(`Tavily API error: ${response.statusText}`)
        }

        const data = await response.json()

        return {
          results: (data.results || []).map((result: any) => ({
            title: result.title,
            url: result.url,
            snippet: result.content?.substring(0, 200) || "",
          })),
          query: enhancedQuery,
        }
      } catch (error) {
        return {
          results: [
            {
              title: "Search Error",
              url: "",
              snippet:
                error instanceof Error
                  ? error.message
                  : "An error occurred while searching.",
            },
          ],
          query: enhancedQuery,
        }
      }
    },
  })
}
