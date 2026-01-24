/**
 * Slack Integration Types
 */

// Slack API response types
export interface SlackChannel {
  id: string
  name: string
  is_private: boolean
  is_archived: boolean
  is_member: boolean
  topic?: { value: string }
  purpose?: { value: string }
  num_members?: number
  created: number
}

export interface SlackUser {
  id: string
  name: string
  real_name?: string
  profile: {
    display_name?: string
    real_name?: string
    email?: string
    image_72?: string
    image_192?: string
  }
  deleted: boolean
  is_bot: boolean
}

export interface SlackMessage {
  type: string
  ts: string
  user?: string
  bot_id?: string
  username?: string
  text: string
  thread_ts?: string
  reply_count?: number
  files?: SlackFile[]
  attachments?: SlackAttachment[]
  subtype?: string
}

export interface SlackFile {
  id: string
  name: string
  title?: string
  mimetype: string
  filetype: string
  size: number
  url_private?: string
}

export interface SlackAttachment {
  title?: string
  text?: string
  fallback?: string
  image_url?: string
}

// Slack API responses
export interface SlackAuthTestResponse {
  ok: boolean
  url?: string
  team?: string
  team_id?: string
  user?: string
  user_id?: string
  error?: string
}

export interface SlackConversationsListResponse {
  ok: boolean
  channels?: SlackChannel[]
  response_metadata?: {
    next_cursor?: string
  }
  error?: string
}

export interface SlackConversationsHistoryResponse {
  ok: boolean
  messages?: SlackMessage[]
  has_more?: boolean
  response_metadata?: {
    next_cursor?: string
  }
  error?: string
}

export interface SlackConversationsRepliesResponse {
  ok: boolean
  messages?: SlackMessage[]
  has_more?: boolean
  response_metadata?: {
    next_cursor?: string
  }
  error?: string
}

export interface SlackUsersListResponse {
  ok: boolean
  members?: SlackUser[]
  response_metadata?: {
    next_cursor?: string
  }
  error?: string
}

// DreamTeam Slack integration types
export interface SlackIntegration {
  id: string
  workspace_id: string
  user_id: string
  encrypted_access_token: string
  slack_team_id: string
  slack_team_name: string
  status: "active" | "error" | "disconnected"
  last_sync_at: string | null
  created_at: string
  updated_at: string
}

// Import configuration types
export interface SlackImportFilters {
  dateRange?: "7days" | "30days" | "90days" | "all"
  messageLimit?: number
  includeThreads: boolean
}

export interface SlackChannelWithCount extends SlackChannel {
  message_count?: number
}

export interface SlackImportRequest {
  workspaceId: string
  channelIds: string[]
  filters: SlackImportFilters
}

export interface SlackImportResult {
  channelsImported: number
  messagesImported: number
  usersCreated: number
  errors: string[]
}

// User mapping
export interface SlackUserMapping {
  slackUserId: string
  slackUserName: string
  slackEmail?: string
  dreamTeamProfileId: string
  isPlaceholder: boolean
}
