/**
 * Nylas v3 SDK wrapper for email and calendar integration.
 *
 * Uses Nylas Hosted OAuth with API Key authentication.
 * Following the same patterns as lib/plaid.ts.
 */

import { createHmac, timingSafeEqual } from 'crypto'

// ============================================
// Configuration
// ============================================

const NYLAS_CLIENT_ID = process.env.NYLAS_CLIENT_ID!
const NYLAS_API_KEY = process.env.NYLAS_API_KEY!
const NYLAS_API_URI = process.env.NYLAS_API_URI || 'https://api.us.nylas.com'
const NYLAS_REDIRECT_URI = process.env.NYLAS_REDIRECT_URI!
const NYLAS_WEBHOOK_SECRET = process.env.NYLAS_WEBHOOK_SECRET

// ============================================
// Result Types
// ============================================

export interface NylasResult<T> {
  success: boolean
  data?: T
  error?: string
  errorCode?: string
}

export interface AuthUrlData {
  authUrl: string
  state: string
}

export interface TokenExchangeData {
  grantId: string
  accessToken: string
  email: string
  provider: 'google' | 'microsoft'
  scopes: string[]
}

export interface NylasEmail {
  id: string
  threadId: string | null
  subject: string | null
  snippet: string | null
  from: Array<{ email: string; name?: string }>
  to: Array<{ email: string; name?: string }>
  cc: Array<{ email: string; name?: string }>
  bcc: Array<{ email: string; name?: string }>
  date: number
  unread: boolean
  starred: boolean
  folders: string[]
  hasAttachments: boolean
}

export interface NylasEmailDetail extends NylasEmail {
  body: string
  replyTo: Array<{ email: string; name?: string }>
}

export interface NylasCalendar {
  id: string
  name: string
  description: string | null
  isPrimary: boolean
  readOnly: boolean
  timezone: string | null
}

export interface NylasEventParticipant {
  email: string
  name?: string
  status: 'yes' | 'no' | 'maybe' | 'noreply'
}

export interface NylasCalendarEvent {
  id: string
  calendarId: string
  title: string | null
  description: string | null
  location: string | null
  when: {
    startTime: number
    endTime: number
    startTimezone?: string
    endTimezone?: string
  }
  status: 'confirmed' | 'tentative' | 'cancelled'
  busy: boolean
  participants: NylasEventParticipant[]
  conferencing?: {
    provider: string
    details: {
      url?: string
      meetingCode?: string
      password?: string
    }
  }
}

export interface CreateEventInput {
  title: string
  description?: string
  location?: string
  when: {
    startTime: number
    endTime: number
    startTimezone?: string
    endTimezone?: string
  }
  participants?: Array<{ email: string; name?: string }>
  busy?: boolean
}

// ============================================
// Helper Functions
// ============================================

/**
 * Make an authenticated request to the Nylas API
 */
async function nylasRequest<T>(
  path: string,
  options: {
    method?: string
    body?: unknown
    grantId?: string
  } = {}
): Promise<NylasResult<T>> {
  const { method = 'GET', body, grantId } = options

  // Build the URL - some endpoints need the grant ID in the path
  const url = grantId
    ? `${NYLAS_API_URI}/v3/grants/${grantId}${path}`
    : `${NYLAS_API_URI}/v3${path}`

  try {
    console.log('[Nylas] Making request:', { url, method })

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json()

    console.log('[Nylas] Raw response:', {
      status: response.status,
      ok: response.ok,
      dataKeys: data ? Object.keys(data) : 'null',
      dataPreview: JSON.stringify(data)?.substring(0, 300),
    })

    if (!response.ok) {
      console.error('Nylas API error:', data)
      return {
        success: false,
        error: data.error?.message || data.message || 'Request failed',
        errorCode: data.error?.type || data.type,
      }
    }

    // Return the full response structure - let callers extract what they need
    return {
      success: true,
      data: data,
    }
  } catch (error) {
    console.error('Nylas request failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    }
  }
}

// ============================================
// OAuth Functions
// ============================================

/**
 * Generate OAuth URL for user authentication.
 *
 * @param userId - Internal user ID to include in state
 * @param provider - 'google' or 'microsoft'
 * @param scopes - OAuth scopes to request
 */
export function generateAuthUrl(
  userId: string,
  workspaceId: string,
  provider: 'google' | 'microsoft',
  scopes: string[] = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/calendar']
): NylasResult<AuthUrlData> {
  if (!NYLAS_CLIENT_ID || !NYLAS_REDIRECT_URI) {
    return {
      success: false,
      error: 'Nylas is not configured. Missing NYLAS_CLIENT_ID or NYLAS_REDIRECT_URI.',
    }
  }

  // Generate state with user context for callback verification
  const stateData = {
    userId,
    workspaceId,
    provider,
    timestamp: Date.now(),
  }
  const state = Buffer.from(JSON.stringify(stateData)).toString('base64url')

  // Build OAuth URL
  const params = new URLSearchParams({
    client_id: NYLAS_CLIENT_ID,
    redirect_uri: NYLAS_REDIRECT_URI,
    response_type: 'code',
    access_type: 'offline',
    provider,
    state,
  })

  // Add scopes based on provider
  if (provider === 'google') {
    params.set('scope', scopes.join(' '))
  } else if (provider === 'microsoft') {
    // Microsoft uses different scope format
    params.set('scope', 'Mail.Read Mail.Send Calendars.ReadWrite')
  }

  return {
    success: true,
    data: {
      authUrl: `${NYLAS_API_URI}/v3/connect/auth?${params.toString()}`,
      state,
    },
  }
}

/**
 * Parse and verify the state parameter from OAuth callback.
 */
export function parseOAuthState(state: string): {
  valid: boolean
  userId?: string
  workspaceId?: string
  provider?: 'google' | 'microsoft'
  error?: string
} {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8')
    const data = JSON.parse(decoded)

    // Check timestamp is within 1 hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    if (data.timestamp < oneHourAgo) {
      return { valid: false, error: 'OAuth state expired' }
    }

    return {
      valid: true,
      userId: data.userId,
      workspaceId: data.workspaceId,
      provider: data.provider,
    }
  } catch {
    return { valid: false, error: 'Invalid OAuth state' }
  }
}

/**
 * Exchange an authorization code for an access token.
 */
export async function exchangeCodeForToken(
  code: string
): Promise<NylasResult<TokenExchangeData>> {
  if (!NYLAS_CLIENT_ID) {
    return {
      success: false,
      error: 'Nylas is not configured. Missing NYLAS_CLIENT_ID.',
    }
  }

  try {
    const response = await fetch(`${NYLAS_API_URI}/v3/connect/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: NYLAS_CLIENT_ID,
        client_secret: NYLAS_API_KEY,
        redirect_uri: NYLAS_REDIRECT_URI,
        code,
        grant_type: 'authorization_code',
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Nylas token exchange error:', data)
      return {
        success: false,
        error: data.error?.message || data.message || 'Token exchange failed',
        errorCode: data.error?.type || data.type,
      }
    }

    return {
      success: true,
      data: {
        grantId: data.grant_id,
        accessToken: data.access_token,
        email: data.email,
        provider: data.provider as 'google' | 'microsoft',
        scopes: data.scope?.split(' ') || [],
      },
    }
  } catch (error) {
    console.error('Token exchange failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token exchange failed',
    }
  }
}

// ============================================
// Grant Functions
// ============================================

/**
 * Get details about a specific grant.
 */
export async function getGrant(grantId: string): Promise<NylasResult<{
  id: string
  provider: string
  email: string
  grantStatus: string
  scope: string[]
}>> {
  return nylasRequest(`/grants/${grantId}`)
}

/**
 * Revoke/delete a grant (disconnect the account).
 */
export async function deleteGrant(grantId: string): Promise<NylasResult<void>> {
  return nylasRequest(`/grants/${grantId}`, { method: 'DELETE' })
}

// ============================================
// Email Functions
// ============================================

/**
 * List emails from a connected account.
 */
export async function listEmails(
  grantId: string,
  options: {
    limit?: number
    pageToken?: string
    unread?: boolean
    in?: string // folder name like 'inbox', 'sent', etc.
  } = {}
): Promise<NylasResult<{ emails: NylasEmail[]; nextCursor?: string }>> {
  const params = new URLSearchParams()

  if (options.limit) params.set('limit', options.limit.toString())
  if (options.pageToken) params.set('page_token', options.pageToken)
  if (options.unread !== undefined) params.set('unread', options.unread.toString())
  if (options.in) params.set('in', options.in)

  const queryString = params.toString()
  const path = `/messages${queryString ? `?${queryString}` : ''}`

  console.log('[Nylas] Fetching emails:', { grantId, path })

  const result = await nylasRequest<{
    data: Array<{
      id: string
      thread_id: string | null
      subject: string | null
      snippet: string | null
      from: Array<{ email: string; name?: string }>
      to: Array<{ email: string; name?: string }>
      cc: Array<{ email: string; name?: string }>
      bcc: Array<{ email: string; name?: string }>
      date: number
      unread: boolean
      starred: boolean
      folders: string[]
      attachments?: unknown[]
    }>
    next_cursor?: string
  }>(path, { grantId })

  console.log('[Nylas] Emails result:', {
    success: result.success,
    hasData: !!result.data,
    emailCount: result.data?.data?.length ?? 'no data array',
    error: result.error,
    errorCode: result.errorCode,
    rawData: JSON.stringify(result.data)?.substring(0, 500),
  })

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error,
      errorCode: result.errorCode,
    }
  }

  const emails: NylasEmail[] = (result.data.data || []).map((msg) => ({
    id: msg.id,
    threadId: msg.thread_id,
    subject: msg.subject,
    snippet: msg.snippet,
    from: msg.from || [],
    to: msg.to || [],
    cc: msg.cc || [],
    bcc: msg.bcc || [],
    date: msg.date,
    unread: msg.unread,
    starred: msg.starred,
    folders: msg.folders || [],
    hasAttachments: (msg.attachments?.length || 0) > 0,
  }))

  return {
    success: true,
    data: {
      emails,
      nextCursor: result.data.next_cursor,
    },
  }
}

/**
 * Get a specific email by ID with full body.
 */
export async function getEmail(
  grantId: string,
  messageId: string
): Promise<NylasResult<NylasEmailDetail>> {
  const result = await nylasRequest<{
    data: {
      id: string
      thread_id: string | null
      subject: string | null
      snippet: string | null
      body: string
      from: Array<{ email: string; name?: string }>
      to: Array<{ email: string; name?: string }>
      cc: Array<{ email: string; name?: string }>
      bcc: Array<{ email: string; name?: string }>
      reply_to: Array<{ email: string; name?: string }>
      date: number
      unread: boolean
      starred: boolean
      folders: string[]
      attachments?: unknown[]
    }
  }>(`/messages/${messageId}`, { grantId })

  if (!result.success || !result.data?.data) {
    return {
      success: false,
      error: result.error,
      errorCode: result.errorCode,
    }
  }

  const msg = result.data.data
  return {
    success: true,
    data: {
      id: msg.id,
      threadId: msg.thread_id,
      subject: msg.subject,
      snippet: msg.snippet,
      body: msg.body || '',
      from: msg.from || [],
      to: msg.to || [],
      cc: msg.cc || [],
      bcc: msg.bcc || [],
      replyTo: msg.reply_to || [],
      date: msg.date,
      unread: msg.unread,
      starred: msg.starred,
      folders: msg.folders || [],
      hasAttachments: (msg.attachments?.length || 0) > 0,
    },
  }
}

/**
 * Update email properties (mark read/unread, star/unstar).
 */
export async function updateEmail(
  grantId: string,
  messageId: string,
  updates: {
    unread?: boolean
    starred?: boolean
    folders?: string[]
  }
): Promise<NylasResult<void>> {
  return nylasRequest(`/messages/${messageId}`, {
    grantId,
    method: 'PUT',
    body: updates,
  })
}

/**
 * Send an email.
 */
export async function sendEmail(
  grantId: string,
  email: {
    to: Array<{ email: string; name?: string }>
    cc?: Array<{ email: string; name?: string }>
    bcc?: Array<{ email: string; name?: string }>
    subject: string
    body: string
    replyToMessageId?: string
  }
): Promise<NylasResult<{ id: string }>> {
  const body: Record<string, unknown> = {
    to: email.to,
    subject: email.subject,
    body: email.body,
  }

  if (email.cc?.length) body.cc = email.cc
  if (email.bcc?.length) body.bcc = email.bcc
  if (email.replyToMessageId) body.reply_to_message_id = email.replyToMessageId

  const result = await nylasRequest<{
    data: { id: string }
  }>('/messages/send', {
    grantId,
    method: 'POST',
    body,
  })

  if (!result.success || !result.data?.data) {
    return {
      success: false,
      error: result.error,
      errorCode: result.errorCode,
    }
  }

  return {
    success: true,
    data: { id: result.data.data.id },
  }
}

/**
 * Search emails using Nylas search.
 */
export async function searchEmails(
  grantId: string,
  query: string,
  options: { limit?: number } = {}
): Promise<NylasResult<{ emails: NylasEmail[] }>> {
  const params = new URLSearchParams()
  params.set('search_query_native', query)
  if (options.limit) params.set('limit', options.limit.toString())

  const path = `/messages?${params.toString()}`

  const result = await nylasRequest<{
    data: Array<{
      id: string
      thread_id: string | null
      subject: string | null
      snippet: string | null
      from: Array<{ email: string; name?: string }>
      to: Array<{ email: string; name?: string }>
      cc: Array<{ email: string; name?: string }>
      bcc: Array<{ email: string; name?: string }>
      date: number
      unread: boolean
      starred: boolean
      folders: string[]
      attachments?: unknown[]
    }>
  }>(path, { grantId })

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error,
      errorCode: result.errorCode,
    }
  }

  const emails: NylasEmail[] = (result.data.data || []).map((msg) => ({
    id: msg.id,
    threadId: msg.thread_id,
    subject: msg.subject,
    snippet: msg.snippet,
    from: msg.from || [],
    to: msg.to || [],
    cc: msg.cc || [],
    bcc: msg.bcc || [],
    date: msg.date,
    unread: msg.unread,
    starred: msg.starred,
    folders: msg.folders || [],
    hasAttachments: (msg.attachments?.length || 0) > 0,
  }))

  return {
    success: true,
    data: { emails },
  }
}

// ============================================
// Calendar Functions
// ============================================

/**
 * List calendars for a connected account.
 */
export async function listCalendars(
  grantId: string
): Promise<NylasResult<NylasCalendar[]>> {
  const result = await nylasRequest<{
    data: Array<{
      id: string
      name: string
      description: string | null
      is_primary: boolean
      read_only: boolean
      timezone: string | null
    }>
  }>('/calendars', { grantId })

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error,
      errorCode: result.errorCode,
    }
  }

  const calendars: NylasCalendar[] = (result.data.data || []).map((cal) => ({
    id: cal.id,
    name: cal.name,
    description: cal.description,
    isPrimary: cal.is_primary,
    readOnly: cal.read_only,
    timezone: cal.timezone,
  }))

  return { success: true, data: calendars }
}

/**
 * List events from a calendar.
 */
export async function listEvents(
  grantId: string,
  calendarId: string,
  options: {
    startTime?: number // Unix timestamp
    endTime?: number // Unix timestamp
    limit?: number
    pageToken?: string
  } = {}
): Promise<NylasResult<{ events: NylasCalendarEvent[]; nextCursor?: string }>> {
  const params = new URLSearchParams()
  params.set('calendar_id', calendarId)

  if (options.startTime) params.set('start', options.startTime.toString())
  if (options.endTime) params.set('end', options.endTime.toString())
  if (options.limit) params.set('limit', options.limit.toString())
  if (options.pageToken) params.set('page_token', options.pageToken)

  const result = await nylasRequest<{
    data: Array<{
      id: string
      calendar_id: string
      title: string | null
      description: string | null
      location: string | null
      when: {
        start_time: number
        end_time: number
        start_timezone?: string
        end_timezone?: string
      }
      status: 'confirmed' | 'tentative' | 'cancelled'
      busy: boolean
      participants: Array<{
        email: string
        name?: string
        status: string
      }>
      conferencing?: {
        provider: string
        details: {
          url?: string
          meeting_code?: string
          password?: string
        }
      }
    }>
    next_cursor?: string
  }>(`/events?${params.toString()}`, { grantId })

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error,
      errorCode: result.errorCode,
    }
  }

  const events: NylasCalendarEvent[] = (result.data.data || []).map((evt) => ({
    id: evt.id,
    calendarId: evt.calendar_id,
    title: evt.title,
    description: evt.description,
    location: evt.location,
    when: {
      startTime: evt.when.start_time,
      endTime: evt.when.end_time,
      startTimezone: evt.when.start_timezone,
      endTimezone: evt.when.end_timezone,
    },
    status: evt.status,
    busy: evt.busy,
    participants: (evt.participants || []).map((p) => ({
      email: p.email,
      name: p.name,
      status: p.status as 'yes' | 'no' | 'maybe' | 'noreply',
    })),
    conferencing: evt.conferencing ? {
      provider: evt.conferencing.provider,
      details: {
        url: evt.conferencing.details.url,
        meetingCode: evt.conferencing.details.meeting_code,
        password: evt.conferencing.details.password,
      },
    } : undefined,
  }))

  return {
    success: true,
    data: {
      events,
      nextCursor: result.data.next_cursor,
    },
  }
}

/**
 * Get a specific event by ID.
 */
export async function getEvent(
  grantId: string,
  calendarId: string,
  eventId: string
): Promise<NylasResult<NylasCalendarEvent>> {
  const params = new URLSearchParams({ calendar_id: calendarId })

  const result = await nylasRequest<{
    id: string
    calendar_id: string
    title: string | null
    description: string | null
    location: string | null
    when: {
      start_time: number
      end_time: number
      start_timezone?: string
      end_timezone?: string
    }
    status: 'confirmed' | 'tentative' | 'cancelled'
    busy: boolean
    participants: Array<{
      email: string
      name?: string
      status: string
    }>
    conferencing?: {
      provider: string
      details: {
        url?: string
        meeting_code?: string
        password?: string
      }
    }
  }>(`/events/${eventId}?${params.toString()}`, { grantId })

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error,
      errorCode: result.errorCode,
    }
  }

  const evt = result.data
  return {
    success: true,
    data: {
      id: evt.id,
      calendarId: evt.calendar_id,
      title: evt.title,
      description: evt.description,
      location: evt.location,
      when: {
        startTime: evt.when.start_time,
        endTime: evt.when.end_time,
        startTimezone: evt.when.start_timezone,
        endTimezone: evt.when.end_timezone,
      },
      status: evt.status,
      busy: evt.busy,
      participants: (evt.participants || []).map((p) => ({
        email: p.email,
        name: p.name,
        status: p.status as 'yes' | 'no' | 'maybe' | 'noreply',
      })),
      conferencing: evt.conferencing ? {
        provider: evt.conferencing.provider,
        details: {
          url: evt.conferencing.details.url,
          meetingCode: evt.conferencing.details.meeting_code,
          password: evt.conferencing.details.password,
        },
      } : undefined,
    },
  }
}

/**
 * Create a new calendar event.
 */
export async function createEvent(
  grantId: string,
  calendarId: string,
  event: CreateEventInput
): Promise<NylasResult<NylasCalendarEvent>> {
  const params = new URLSearchParams({ calendar_id: calendarId })

  const body = {
    title: event.title,
    description: event.description,
    location: event.location,
    when: {
      start_time: event.when.startTime,
      end_time: event.when.endTime,
      start_timezone: event.when.startTimezone,
      end_timezone: event.when.endTimezone,
    },
    participants: event.participants?.map((p) => ({
      email: p.email,
      name: p.name,
    })),
    busy: event.busy ?? true,
  }

  const result = await nylasRequest<{
    id: string
    calendar_id: string
    title: string | null
    description: string | null
    location: string | null
    when: {
      start_time: number
      end_time: number
      start_timezone?: string
      end_timezone?: string
    }
    status: 'confirmed' | 'tentative' | 'cancelled'
    busy: boolean
    participants: Array<{
      email: string
      name?: string
      status: string
    }>
  }>(`/events?${params.toString()}`, {
    grantId,
    method: 'POST',
    body,
  })

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error,
      errorCode: result.errorCode,
    }
  }

  const evt = result.data
  return {
    success: true,
    data: {
      id: evt.id,
      calendarId: evt.calendar_id,
      title: evt.title,
      description: evt.description,
      location: evt.location,
      when: {
        startTime: evt.when.start_time,
        endTime: evt.when.end_time,
        startTimezone: evt.when.start_timezone,
        endTimezone: evt.when.end_timezone,
      },
      status: evt.status,
      busy: evt.busy,
      participants: (evt.participants || []).map((p) => ({
        email: p.email,
        name: p.name,
        status: p.status as 'yes' | 'no' | 'maybe' | 'noreply',
      })),
    },
  }
}

/**
 * Update an existing calendar event.
 */
export async function updateEvent(
  grantId: string,
  calendarId: string,
  eventId: string,
  updates: Partial<CreateEventInput>
): Promise<NylasResult<NylasCalendarEvent>> {
  const params = new URLSearchParams({ calendar_id: calendarId })

  const body: Record<string, unknown> = {}
  if (updates.title !== undefined) body.title = updates.title
  if (updates.description !== undefined) body.description = updates.description
  if (updates.location !== undefined) body.location = updates.location
  if (updates.when) {
    body.when = {
      start_time: updates.when.startTime,
      end_time: updates.when.endTime,
      start_timezone: updates.when.startTimezone,
      end_timezone: updates.when.endTimezone,
    }
  }
  if (updates.participants) {
    body.participants = updates.participants.map((p) => ({
      email: p.email,
      name: p.name,
    }))
  }
  if (updates.busy !== undefined) body.busy = updates.busy

  const result = await nylasRequest<{
    id: string
    calendar_id: string
    title: string | null
    description: string | null
    location: string | null
    when: {
      start_time: number
      end_time: number
      start_timezone?: string
      end_timezone?: string
    }
    status: 'confirmed' | 'tentative' | 'cancelled'
    busy: boolean
    participants: Array<{
      email: string
      name?: string
      status: string
    }>
  }>(`/events/${eventId}?${params.toString()}`, {
    grantId,
    method: 'PUT',
    body,
  })

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error,
      errorCode: result.errorCode,
    }
  }

  const evt = result.data
  return {
    success: true,
    data: {
      id: evt.id,
      calendarId: evt.calendar_id,
      title: evt.title,
      description: evt.description,
      location: evt.location,
      when: {
        startTime: evt.when.start_time,
        endTime: evt.when.end_time,
        startTimezone: evt.when.start_timezone,
        endTimezone: evt.when.end_timezone,
      },
      status: evt.status,
      busy: evt.busy,
      participants: (evt.participants || []).map((p) => ({
        email: p.email,
        name: p.name,
        status: p.status as 'yes' | 'no' | 'maybe' | 'noreply',
      })),
    },
  }
}

/**
 * Delete a calendar event.
 */
export async function deleteEvent(
  grantId: string,
  calendarId: string,
  eventId: string
): Promise<NylasResult<void>> {
  const params = new URLSearchParams({ calendar_id: calendarId })
  return nylasRequest(`/events/${eventId}?${params.toString()}`, {
    grantId,
    method: 'DELETE',
  })
}

// ============================================
// Webhook Verification
// ============================================

/**
 * Verify a Nylas webhook signature.
 *
 * Nylas uses HMAC-SHA256 for webhook signatures.
 *
 * @param body - The raw request body as a string
 * @param signature - The X-Nylas-Signature header value
 * @returns true if the webhook is valid
 */
export function verifyWebhookSignature(
  body: string,
  signature: string | null
): { valid: boolean; error?: string } {
  if (!NYLAS_WEBHOOK_SECRET) {
    return { valid: false, error: 'Webhook secret not configured' }
  }

  if (!signature) {
    return { valid: false, error: 'Missing X-Nylas-Signature header' }
  }

  try {
    const expectedSignature = createHmac('sha256', NYLAS_WEBHOOK_SECRET)
      .update(body)
      .digest('hex')

    // Use timing-safe comparison to prevent timing attacks
    const isValid = timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' }
    }

    return { valid: true }
  } catch (error) {
    console.error('Webhook verification failed:', error)
    return { valid: false, error: 'Verification failed' }
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if Nylas is configured.
 */
export function isNylasConfigured(): boolean {
  return !!(NYLAS_CLIENT_ID && NYLAS_API_KEY)
}

/**
 * Get the Nylas API URI (useful for debugging).
 */
export function getNylasApiUri(): string {
  return NYLAS_API_URI
}
