/**
 * Rate limiting utility for API endpoints
 * Uses in-memory storage with optional Redis backend
 */

interface RateLimitStore {
  get(key: string): number | undefined
  set(key: string, value: number, ttlMs: number): void
  increment(key: string): number
}

// In-memory implementation (for serverless environments)
class MemoryStore implements RateLimitStore {
  private store = new Map<string, { count: number; expires: number }>()

  get(key: string): number | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expires) {
      this.store.delete(key)
      return undefined
    }
    return entry.count
  }

  set(key: string, value: number, ttlMs: number): void {
    this.store.set(key, { count: value, expires: Date.now() + ttlMs })
  }

  increment(key: string): number {
    const entry = this.store.get(key)
    if (!entry || Date.now() > entry.expires) {
      this.store.set(key, { count: 1, expires: Date.now() + 60000 })
      return 1
    }
    entry.count++
    return entry.count
  }
}

export interface RateLimitOptions {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Max requests per window
  keyPrefix?: string    // Prefix for the rate limit key
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: Date
  totalHits: number
}

const defaultStore = new MemoryStore()

/**
 * Check if a request should be rate limited
 * 
 * @param identifier - Unique identifier (IP address, API key, etc.)
 * @param options - Rate limiting options
 * @returns Rate limit check result
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const key = `${options.keyPrefix || 'ratelimit'}:${identifier}`
  const windowMs = options.windowMs
  const maxRequests = options.maxRequests

  const current = defaultStore.get(key)
  const now = Date.now()
  const resetTime = new Date(now + windowMs)

  if (!current) {
    // First request in window
    defaultStore.set(key, 1, windowMs)
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime,
      totalHits: 1,
    }
  }

  const hits = defaultStore.increment(key)
  const remaining = Math.max(0, maxRequests - hits)

  return {
    allowed: hits <= maxRequests,
    remaining,
    resetTime,
    totalHits: hits,
  }
}

/**
 * Get rate limit headers for HTTP response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.totalHits.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(result.resetTime.getTime() / 1000).toString(),
  }
}

// Preset configurations for common use cases
export const rateLimitPresets = {
  // Cron endpoints: 10 requests per minute
  cron: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'cron',
  },
  // API endpoints: 100 requests per minute
  api: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyPrefix: 'api',
  },
  // Strict: 5 requests per minute
  strict: {
    windowMs: 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'strict',
  },
}
