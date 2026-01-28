export { 
  getSession, 
  is2FAComplete,
  complete2FA,
  // Legacy exports (deprecated)
  createSession, 
  destroySession,
  type SessionUser,
  type SessionData 
} from './session'

export {
  checkRateLimit,
  getRateLimitHeaders,
  rateLimitPresets,
  type RateLimitOptions,
  type RateLimitResult,
} from './rate-limit'
