/**
 * Slack Web API Client
 * Documentation: https://api.slack.com/methods
 */

import type {
  SlackAuthTestResponse,
  SlackConversationsListResponse,
  SlackConversationsHistoryResponse,
  SlackConversationsRepliesResponse,
  SlackUsersListResponse,
  SlackChannel,
  SlackMessage,
  SlackUser,
  SlackChannelWithCount,
} from "@/types/slack"

const SLACK_API_BASE = "https://slack.com/api"

export class SlackClient {
  private token: string

  constructor(token: string) {
    this.token = token
  }

  private async fetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${SLACK_API_BASE}/${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    })

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`)
    }

    const data = await response.json() as T & { ok: boolean; error?: string }

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error || "Unknown error"}`)
    }

    return data
  }

  /**
   * Validate the token and get workspace info
   */
  async validateToken(): Promise<{ teamId: string; teamName: string }> {
    const response = await this.fetch<SlackAuthTestResponse>("auth.test")

    if (!response.team_id || !response.team) {
      throw new Error("Unable to get workspace information")
    }

    return {
      teamId: response.team_id,
      teamName: response.team,
    }
  }

  /**
   * Fetch all channels (public and private) the bot has access to
   */
  async getChannels(): Promise<SlackChannel[]> {
    const allChannels: SlackChannel[] = []
    let cursor: string | undefined

    while (true) {
      const params: Record<string, string> = {
        types: "public_channel,private_channel",
        exclude_archived: "false",
        limit: "200",
      }
      if (cursor) {
        params.cursor = cursor
      }

      const response = await this.fetch<SlackConversationsListResponse>(
        "conversations.list",
        params
      )

      if (response.channels) {
        allChannels.push(...response.channels)
      }

      cursor = response.response_metadata?.next_cursor
      if (!cursor) break
    }

    return allChannels
  }

  /**
   * Get channels with message counts
   */
  async getChannelsWithCounts(): Promise<SlackChannelWithCount[]> {
    const channels = await this.getChannels()

    // For each channel, get a rough message count by fetching with limit 1
    // This is a trade-off between accuracy and API calls
    const channelsWithCounts: SlackChannelWithCount[] = await Promise.all(
      channels.map(async (channel) => {
        try {
          // We can't easily get exact counts, so we'll estimate based on channel age
          // For now, we'll just mark it as having messages or not
          const response = await this.fetch<SlackConversationsHistoryResponse>(
            "conversations.history",
            { channel: channel.id, limit: "1" }
          )
          return {
            ...channel,
            message_count: response.messages?.length ? undefined : 0,
          }
        } catch {
          // Bot may not have access to this channel
          return {
            ...channel,
            message_count: 0,
          }
        }
      })
    )

    return channelsWithCounts
  }

  /**
   * Fetch messages from a channel with pagination
   */
  async getMessages(
    channelId: string,
    options?: {
      oldest?: string // Unix timestamp
      latest?: string // Unix timestamp
      limit?: number
    }
  ): Promise<SlackMessage[]> {
    const allMessages: SlackMessage[] = []
    let cursor: string | undefined
    const maxMessages = options?.limit || Infinity
    const batchSize = Math.min(200, maxMessages)

    while (allMessages.length < maxMessages) {
      const params: Record<string, string> = {
        channel: channelId,
        limit: String(batchSize),
      }
      if (cursor) {
        params.cursor = cursor
      }
      if (options?.oldest) {
        params.oldest = options.oldest
      }
      if (options?.latest) {
        params.latest = options.latest
      }

      const response = await this.fetch<SlackConversationsHistoryResponse>(
        "conversations.history",
        params
      )

      if (response.messages) {
        allMessages.push(...response.messages)
      }

      cursor = response.response_metadata?.next_cursor
      if (!cursor || !response.has_more) break
    }

    // Trim to limit if we went over
    return allMessages.slice(0, maxMessages)
  }

  /**
   * Fetch thread replies for a parent message
   */
  async getThreadReplies(channelId: string, threadTs: string): Promise<SlackMessage[]> {
    const allReplies: SlackMessage[] = []
    let cursor: string | undefined

    while (true) {
      const params: Record<string, string> = {
        channel: channelId,
        ts: threadTs,
        limit: "200",
      }
      if (cursor) {
        params.cursor = cursor
      }

      const response = await this.fetch<SlackConversationsRepliesResponse>(
        "conversations.replies",
        params
      )

      if (response.messages) {
        // First message is the parent, skip it
        const replies = response.messages.slice(1)
        allReplies.push(...replies)
      }

      cursor = response.response_metadata?.next_cursor
      if (!cursor || !response.has_more) break
    }

    return allReplies
  }

  /**
   * Join a public channel (requires channels:join scope)
   */
  async joinChannel(channelId: string): Promise<void> {
    const response = await fetch(`${SLACK_API_BASE}/conversations.join`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channel: channelId }),
    })

    const data = (await response.json()) as { ok: boolean; error?: string }

    // "already_in_channel" is not an error - bot is already a member
    if (!data.ok && data.error !== "already_in_channel") {
      throw new Error(`Failed to join channel: ${data.error}`)
    }
  }

  /**
   * Fetch specific users by their IDs
   */
  async getUsersByIds(userIds: string[]): Promise<SlackUser[]> {
    const users: SlackUser[] = []

    for (const userId of userIds) {
      try {
        const response = await fetch(
          `${SLACK_API_BASE}/users.info?user=${userId}`,
          {
            headers: {
              Authorization: `Bearer ${this.token}`,
            },
          }
        )

        const data = (await response.json()) as {
          ok: boolean
          user?: SlackUser
          error?: string
        }

        if (data.ok && data.user) {
          users.push(data.user)
        }
      } catch (error) {
        console.error(`Failed to fetch user ${userId}:`, error)
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    return users
  }

  /**
   * Fetch all users in the workspace
   */
  async getUsers(): Promise<SlackUser[]> {
    const allUsers: SlackUser[] = []
    let cursor: string | undefined

    while (true) {
      const params: Record<string, string> = {
        limit: "200",
      }
      if (cursor) {
        params.cursor = cursor
      }

      const response = await this.fetch<SlackUsersListResponse>("users.list", params)

      if (response.members) {
        // Filter out deleted users and bots
        const activeUsers = response.members.filter(
          (user) => !user.deleted && !user.is_bot && user.id !== "USLACKBOT"
        )
        allUsers.push(...activeUsers)
      }

      cursor = response.response_metadata?.next_cursor
      if (!cursor) break
    }

    return allUsers
  }

  /**
   * Transform Slack message content to include file attachment placeholders
   */
  static transformMessageContent(message: SlackMessage): string {
    let content = message.text || ""

    // Add file attachment placeholders
    if (message.files && message.files.length > 0) {
      const fileRefs = message.files.map((file) => {
        const icon = file.mimetype?.startsWith("image/") ? "Image" : "File"
        return `[📎 ${icon}: ${file.name || file.title || "attachment"}]`
      })
      if (content) {
        content += "\n" + fileRefs.join("\n")
      } else {
        content = fileRefs.join("\n")
      }
    }

    // Handle Slack attachments (unfurls, etc.)
    if (message.attachments && message.attachments.length > 0) {
      const attachmentRefs = message.attachments
        .filter((a) => a.title || a.fallback)
        .map((a) => `[📎 ${a.title || a.fallback}]`)
      if (attachmentRefs.length > 0) {
        if (content) {
          content += "\n" + attachmentRefs.join("\n")
        } else {
          content = attachmentRefs.join("\n")
        }
      }
    }

    return content
  }

  /**
   * Convert Slack timestamp to ISO date string
   */
  static slackTsToDate(ts: string): string {
    const unixSeconds = parseFloat(ts)
    return new Date(unixSeconds * 1000).toISOString()
  }

  /**
   * Calculate oldest timestamp for date range filter
   */
  static getOldestTs(dateRange: "7days" | "30days" | "90days" | "all"): string | undefined {
    if (dateRange === "all") return undefined

    const now = Date.now()
    const days = dateRange === "7days" ? 7 : dateRange === "30days" ? 30 : 90
    const oldest = new Date(now - days * 24 * 60 * 60 * 1000)

    return String(oldest.getTime() / 1000)
  }
}
