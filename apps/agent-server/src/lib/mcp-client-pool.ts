/**
 * MCP Client Connection Pool
 *
 * Reuses MCP client connections across executions with the same workspace/tools
 * to reduce the 500ms-2s overhead of creating a new client for every task.
 */

import { createMCPClient, type MCPClientInstance } from "./mcp-client.js"

interface PoolKey {
  workspaceId: string
  toolNames: string[]
}

interface PooledClient {
  client: MCPClientInstance
  tools: Record<string, any>
  lastUsed: Date
  useCount: number
}

/**
 * MCP Client Connection Pool
 * Reuses MCP clients across executions with the same workspace/tools
 */
class MCPClientPool {
  private pool: Map<string, PooledClient> = new Map()
  private maxPoolSize: number
  private clientTTLMs: number
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(options: { maxPoolSize?: number; clientTTLMs?: number } = {}) {
    this.maxPoolSize = options.maxPoolSize || 10
    this.clientTTLMs = options.clientTTLMs || 5 * 60 * 1000 // 5 minutes
    this.startCleanupInterval()
  }

  private getPoolKey(workspaceId: string, toolNames: string[]): string {
    return `${workspaceId}:${toolNames.sort().join(",")}`
  }

  /**
   * Get or create an MCP client from the pool
   */
  async getClient(
    workspaceId: string,
    toolNames: string[],
    userId: string = "scheduled-execution"
  ): Promise<{ client: MCPClientInstance; tools: Record<string, any>; isNew: boolean }> {
    const key = this.getPoolKey(workspaceId, toolNames)
    const existing = this.pool.get(key)

    if (existing) {
      // Update usage stats
      existing.lastUsed = new Date()
      existing.useCount++
      console.log(
        `[MCP Pool] Reusing cached client for key: ${key} (used ${existing.useCount} times)`
      )
      return { client: existing.client, tools: existing.tools, isNew: false }
    }

    // Check pool size limit
    if (this.pool.size >= this.maxPoolSize) {
      await this.evictLRU()
    }

    // Create new client
    console.log(`[MCP Pool] Creating new client for key: ${key}`)
    const startTime = Date.now()
    const client = await createMCPClient({
      workspaceId,
      userId,
      enabledTools: toolNames,
    })
    const duration = Date.now() - startTime
    console.log(`[MCP Pool] Client created in ${duration}ms`)

    this.pool.set(key, {
      client,
      tools: client.tools,
      lastUsed: new Date(),
      useCount: 1,
    })

    return { client, tools: client.tools, isNew: true }
  }

  /**
   * Evict least recently used client
   */
  private async evictLRU(): Promise<void> {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.pool.entries()) {
      if (entry.lastUsed.getTime() < oldestTime) {
        oldestTime = entry.lastUsed.getTime()
        oldestKey = key
      }
    }

    if (oldestKey) {
      console.log(`[MCP Pool] Evicting LRU client: ${oldestKey}`)
      await this.closeClient(oldestKey)
    }
  }

  /**
   * Close a specific client
   */
  private async closeClient(key: string): Promise<void> {
    const entry = this.pool.get(key)
    if (entry) {
      try {
        await entry.client.close()
      } catch (error) {
        console.error(`[MCP Pool] Error closing client ${key}:`, error)
      }
      this.pool.delete(key)
    }
  }

  /**
   * Clean up stale clients periodically
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000) // Run every minute
  }

  /**
   * Remove clients that haven't been used recently
   */
  private async cleanup(): Promise<void> {
    const now = Date.now()
    const keysToRemove: string[] = []

    for (const [key, entry] of this.pool.entries()) {
      if (now - entry.lastUsed.getTime() > this.clientTTLMs) {
        keysToRemove.push(key)
      }
    }

    for (const key of keysToRemove) {
      console.log(`[MCP Pool] Cleaning up stale client: ${key}`)
      await this.closeClient(key)
    }

    if (keysToRemove.length > 0) {
      console.log(`[MCP Pool] Cleaned up ${keysToRemove.length} stale clients`)
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): { size: number; totalUses: number; keys: string[] } {
    let totalUses = 0
    for (const entry of this.pool.values()) {
      totalUses += entry.useCount
    }
    return {
      size: this.pool.size,
      totalUses,
      keys: Array.from(this.pool.keys()),
    }
  }

  /**
   * Close all clients and stop cleanup
   */
  async dispose(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    const closePromises = Array.from(this.pool.keys()).map((key) => this.closeClient(key))
    await Promise.all(closePromises)
    console.log("[MCP Pool] All clients closed")
  }
}

// Singleton instance
export const mcpClientPool = new MCPClientPool()
