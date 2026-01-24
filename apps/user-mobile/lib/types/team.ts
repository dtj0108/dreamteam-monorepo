// Team Module Types

// ============================================================================
// Enums and Type Literals
// ============================================================================

export type PresenceStatus = "online" | "away" | "dnd" | "offline";
export type ChannelType = "public" | "private";
export type MessageType = "text" | "system" | "file";
export type AttachmentType = "image" | "document" | "video" | "audio" | "file";
export type ChannelMemberRole = "admin" | "member";
export type WorkspaceMemberRole = "owner" | "admin" | "member";
export type AgentMessageRole = "user" | "assistant" | "tool";

// ============================================================================
// Core Entities
// ============================================================================

export interface Channel {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  topic: string | null;
  type: ChannelType;
  is_archived: boolean;
  is_default: boolean;
  member_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChannelMembership {
  channel_id: string;
  user_id: string;
  role: ChannelMemberRole;
  is_starred: boolean;
  is_muted: boolean;
  last_read_at: string;
  joined_at: string;
}

export interface ChannelWithMembership extends Channel {
  membership?: ChannelMembership;
  unread_count?: number;
  last_message_at?: string;
  last_message_preview?: string;
}

export interface Attachment {
  id: string;
  type: AttachmentType;
  url: string;
  name: string;
  size: number;
  mime_type: string;
  dimensions?: {
    width: number;
    height: number;
  };
  thumbnail?: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
  includes_me: boolean;
}

export interface Message {
  id: string;
  channel_id: string | null;
  dm_conversation_id: string | null;
  sender_id: string;
  content: string;
  content_html: string | null;
  type: MessageType;
  thread_id: string | null;
  reply_count: number;
  reactions: Reaction[];
  attachments: Attachment[];
  mentions: string[];
  is_edited: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined relations
  sender?: MessageUser;
}

export interface MessageUser {
  id: string;
  name: string;
  avatar_url: string | null;
}

export interface DirectMessageConversation {
  id: string;
  workspace_id: string;
  participant_ids: [string, string];
  last_message_at: string | null;
  created_at: string;
  // Joined/computed
  participant?: WorkspaceMember;
  last_message?: Pick<Message, "id" | "content" | "created_at">;
  unread_count?: number;
  is_muted?: boolean;
}

export interface DirectMessageMembership {
  dm_id: string;
  user_id: string;
  is_muted: boolean;
  last_read_at: string;
}

export interface UserPresence {
  user_id: string;
  status: PresenceStatus;
  status_message: string | null;
  status_emoji: string | null;
  status_expiry: string | null;
  last_seen_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceMemberRole;
  display_name: string | null;
  title: string | null;
  timezone: string | null;
  joined_at: string;
  invited_by: string | null;
  // Joined relations
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  };
  presence?: UserPresence;
}

export interface Mention {
  id: string;
  message: {
    id: string;
    content: string;
    channel?: Pick<Channel, "id" | "name">;
    dm?: Pick<DirectMessageConversation, "id">;
    user: MessageUser;
    created_at: string;
  };
  is_read: boolean;
  created_at: string;
}

export interface SearchResult {
  message: {
    id: string;
    content: string;
    highlighted_content: string;
    channel?: Pick<Channel, "id" | "name">;
    dm?: Pick<DirectMessageConversation, "id">;
    user: MessageUser;
    created_at: string;
  };
  score: number;
}

// ============================================================================
// AI Agent Types
// ============================================================================

export interface Agent {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  avatar_url: string | null;
  emoji: string;
  system_prompt: string;
  model: string;
  capabilities: string[];
  tools: AgentTool[];
  is_enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: object;
}

export interface AgentConversation {
  id: string;
  agent_id: string;
  user_id: string;
  title: string | null;
  messages: AgentMessage[];
  created_at: string;
  updated_at: string;
}

export interface AgentMessage {
  role: AgentMessageRole;
  content: string;
  tool_calls?: AgentToolCall[];
  tool_results?: AgentToolResult[];
  created_at: string;
}

export interface AgentToolCall {
  id: string;
  name: string;
  args: object;
}

export interface AgentToolResult {
  tool_call_id: string;
  name: string;
  result: unknown;
}

// ============================================================================
// Thread Types
// ============================================================================

export interface Thread {
  parent_message: Message;
  replies: Message[];
  has_more: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ChannelsResponse {
  channels: ChannelWithMembership[];
}

export interface ChannelResponse {
  channel: Channel;
  members: WorkspaceMember[];
}

export interface MessagesResponse {
  messages: Message[];
  has_more: boolean;
  next_cursor?: string;
}

export interface ThreadResponse {
  parent_message: Message;
  replies: Message[];
  has_more: boolean;
}

export interface DMConversationsResponse {
  conversations: DirectMessageConversation[];
}

export interface MentionsResponse {
  mentions: Mention[];
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  has_more: boolean;
}

export interface AgentsResponse {
  agents: Agent[];
}

export interface WorkspaceMembersResponse {
  members: WorkspaceMember[];
}

export interface UploadResponse {
  id: string;
  url: string;
  type: AttachmentType;
  name: string;
  size: number;
  mime_type: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

// ============================================================================
// API Input Types
// ============================================================================

export interface ChannelsQueryParams {
  type?: ChannelType;
  joined?: boolean;
  starred?: boolean;
}

export interface MessagesQueryParams {
  limit?: number;
  before?: string;
  after?: string;
}

export interface CreateChannelInput {
  name: string;
  description?: string;
  type: ChannelType;
  member_ids?: string[];
}

export interface UpdateChannelInput {
  name?: string;
  description?: string;
  topic?: string;
}

export interface SendMessageInput {
  content: string;
  attachments?: Pick<Attachment, "type" | "url" | "name" | "size">[];
  mentions?: string[];
}

export interface CreateDMInput {
  user_id: string;
}

export interface UpdatePresenceInput {
  status: PresenceStatus;
  status_message?: string;
  status_emoji?: string;
  status_expiry?: string;
}

export interface SearchFilters {
  channel_id?: string;
  from_user_id?: string;
  after?: string;
  before?: string;
  has_attachments?: boolean;
}

export interface AgentChatInput {
  message: string;
  conversation_id?: string;
}

// ============================================================================
// Typing Indicator Types
// ============================================================================

export interface TypingUser {
  user_id: string;
  user_name: string;
  expires_at: number;
}

// ============================================================================
// Color Constants
// ============================================================================

export const PRESENCE_STATUS_COLORS: Record<PresenceStatus, string> = {
  online: "#22c55e", // green
  away: "#f59e0b", // amber
  dnd: "#ef4444", // red
  offline: "#9ca3af", // gray
};

export const CHANNEL_TYPE_ICONS: Record<ChannelType, string> = {
  public: "hashtag",
  private: "lock",
};

// ============================================================================
// Helper Functions
// ============================================================================

export const getPresenceStatusLabel = (status: PresenceStatus): string => {
  const labels: Record<PresenceStatus, string> = {
    online: "Online",
    away: "Away",
    dnd: "Do Not Disturb",
    offline: "Offline",
  };
  return labels[status];
};

export const getChannelTypeLabel = (type: ChannelType): string => {
  return type === "public" ? "Public" : "Private";
};

export const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

export const formatMessageTimestamp = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatDateSeparator = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === now.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

export const isConsecutiveMessage = (
  currentMsg: Message,
  previousMsg: Message | undefined,
  thresholdMinutes = 5
): boolean => {
  if (!previousMsg) return false;
  if (currentMsg.sender_id !== previousMsg.sender_id) return false;

  const currentTime = new Date(currentMsg.created_at).getTime();
  const previousTime = new Date(previousMsg.created_at).getTime();
  const diffMinutes = (currentTime - previousTime) / 60000;

  return diffMinutes < thresholdMinutes;
};

export const shouldShowDateSeparator = (
  currentMsg: Message,
  previousMsg: Message | undefined
): boolean => {
  if (!previousMsg) return true;

  const currentDate = new Date(currentMsg.created_at).toDateString();
  const previousDate = new Date(previousMsg.created_at).toDateString();

  return currentDate !== previousDate;
};

export const getMemberDisplayName = (member: WorkspaceMember): string => {
  return member.display_name || member.user.name;
};

export const getTypingText = (typingUsers: TypingUser[]): string => {
  if (typingUsers.length === 0) return "";
  if (typingUsers.length === 1) return `${typingUsers[0].user_name} is typing...`;
  if (typingUsers.length === 2) {
    return `${typingUsers[0].user_name} and ${typingUsers[1].user_name} are typing...`;
  }
  return `${typingUsers[0].user_name} and ${typingUsers.length - 1} others are typing...`;
};
