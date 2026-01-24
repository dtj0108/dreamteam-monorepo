/**
 * Team test fixtures
 */

export const testWorkspaceId = 'workspace-123'
export const testUserId = 'test-user-id'

// ============================================
// Channel fixtures
// ============================================
export const mockChannel = {
  id: 'channel-123',
  workspace_id: testWorkspaceId,
  name: 'general',
  description: 'General discussion',
  is_private: false,
  created_by: testUserId,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockPrivateChannel = {
  id: 'channel-456',
  workspace_id: testWorkspaceId,
  name: 'private-team',
  description: 'Private team channel',
  is_private: true,
  created_by: testUserId,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockChannelList = [mockChannel, mockPrivateChannel]

export const mockChannelMember = {
  id: 'member-123',
  channel_id: 'channel-123',
  user_id: testUserId,
  role: 'member',
  notifications_enabled: true,
  joined_at: '2024-01-01T00:00:00Z',
  profile: {
    id: testUserId,
    name: 'Test User',
    avatar_url: null,
  },
}

export const mockChannelMemberList = [
  mockChannelMember,
  {
    id: 'member-456',
    channel_id: 'channel-123',
    user_id: 'user-456',
    role: 'admin',
    notifications_enabled: true,
    joined_at: '2024-01-02T00:00:00Z',
    profile: {
      id: 'user-456',
      name: 'Admin User',
      avatar_url: null,
    },
  },
]

// ============================================
// Message fixtures
// ============================================
export const mockMessage = {
  id: 'message-123',
  channel_id: 'channel-123',
  conversation_id: null,
  sender_id: testUserId,
  content: 'Hello, world!',
  parent_id: null,
  is_pinned: false,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  sender: {
    id: testUserId,
    name: 'Test User',
    avatar_url: null,
  },
}

export const mockReplyMessage = {
  id: 'message-456',
  channel_id: 'channel-123',
  conversation_id: null,
  sender_id: 'user-456',
  content: 'Hello back!',
  parent_id: 'message-123',
  is_pinned: false,
  created_at: '2024-01-15T10:05:00Z',
  updated_at: '2024-01-15T10:05:00Z',
  sender: {
    id: 'user-456',
    name: 'Other User',
    avatar_url: null,
  },
}

export const mockMessageList = [mockMessage, mockReplyMessage]

export const mockReaction = {
  id: 'reaction-123',
  message_id: 'message-123',
  user_id: testUserId,
  emoji: '👍',
  created_at: '2024-01-15T10:01:00Z',
}

// ============================================
// DM/Conversation fixtures
// ============================================
export const mockConversation = {
  id: 'conversation-123',
  workspace_id: testWorkspaceId,
  is_archived: false,
  created_at: '2024-01-10T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  participants: [
    {
      id: 'participant-1',
      conversation_id: 'conversation-123',
      user_id: testUserId,
      last_read_at: '2024-01-15T10:00:00Z',
      profile: {
        id: testUserId,
        name: 'Test User',
        avatar_url: null,
      },
    },
    {
      id: 'participant-2',
      conversation_id: 'conversation-123',
      user_id: 'user-456',
      last_read_at: '2024-01-15T09:00:00Z',
      profile: {
        id: 'user-456',
        name: 'Other User',
        avatar_url: null,
      },
    },
  ],
}

export const mockConversationList = [
  mockConversation,
  {
    id: 'conversation-456',
    workspace_id: testWorkspaceId,
    is_archived: true,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-08T00:00:00Z',
    participants: [],
  },
]

export const mockDMMessage = {
  id: 'dm-message-123',
  channel_id: null,
  conversation_id: 'conversation-123',
  sender_id: testUserId,
  content: 'Hey, how are you?',
  parent_id: null,
  is_pinned: false,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

// ============================================
// Workspace fixtures
// ============================================
export const mockWorkspace = {
  id: testWorkspaceId,
  name: 'Acme Corp',
  slug: 'acme-corp',
  description: 'Acme Corporation workspace',
  logo_url: null,
  settings: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockWorkspaceMember = {
  id: 'ws-member-123',
  workspace_id: testWorkspaceId,
  user_id: testUserId,
  role: 'member',
  status: 'active',
  joined_at: '2024-01-01T00:00:00Z',
  profile: {
    id: testUserId,
    name: 'Test User',
    email: 'test@example.com',
    avatar_url: null,
  },
}

export const mockWorkspaceMemberList = [
  mockWorkspaceMember,
  {
    id: 'ws-member-456',
    workspace_id: testWorkspaceId,
    user_id: 'user-456',
    role: 'admin',
    status: 'active',
    joined_at: '2024-01-01T00:00:00Z',
    profile: {
      id: 'user-456',
      name: 'Admin User',
      email: 'admin@example.com',
      avatar_url: null,
    },
  },
  {
    id: 'ws-member-789',
    workspace_id: testWorkspaceId,
    user_id: 'user-789',
    role: 'owner',
    status: 'active',
    joined_at: '2024-01-01T00:00:00Z',
    profile: {
      id: 'user-789',
      name: 'Owner User',
      email: 'owner@example.com',
      avatar_url: null,
    },
  },
]
