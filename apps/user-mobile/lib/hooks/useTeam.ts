import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";

import {
  getChannels,
  getChannel,
  createChannel,
  updateChannel,
  deleteChannel,
  joinChannel,
  leaveChannel,
  starChannel,
  unstarChannel,
  muteChannel,
  unmuteChannel,
  getChannelMembers,
  addChannelMember,
  removeChannelMember,
  getChannelMessages,
  sendChannelMessage,
  getMessage,
  updateMessage,
  deleteMessage,
  pinMessage,
  unpinMessage,
  getThread,
  replyToThread,
  addReaction,
  removeReaction,
  getDMConversations,
  getDMConversation,
  startDMConversation,
  getDMMessages,
  sendDMMessage,
  muteDM,
  unmuteDM,
  updatePresence,
  getUserPresence,
  getMentions,
  markMentionRead,
  markAllMentionsRead,
  searchMessages,
  getAgents,
  getAgent,
  getAgentConversation,
  getWorkspaceMembers,
} from "../api/team";
import {
  Channel,
  ChannelWithMembership,
  ChannelsResponse,
  ChannelResponse,
  ChannelsQueryParams,
  CreateChannelInput,
  UpdateChannelInput,
  Message,
  MessagesResponse,
  MessagesQueryParams,
  SendMessageInput,
  ThreadResponse,
  DirectMessageConversation,
  DMConversationsResponse,
  CreateDMInput,
  UserPresence,
  UpdatePresenceInput,
  MentionsResponse,
  SearchResponse,
  SearchFilters,
  Agent,
  AgentsResponse,
  AgentConversation,
  WorkspaceMembersResponse,
} from "../types/team";

// ============================================================================
// Query Keys
// ============================================================================

export const teamKeys = {
  all: ["team"] as const,

  // Channels
  channels: {
    all: () => [...teamKeys.all, "channels"] as const,
    list: (params?: ChannelsQueryParams) =>
      [...teamKeys.channels.all(), "list", params] as const,
    detail: (id: string) => [...teamKeys.channels.all(), "detail", id] as const,
    members: (id: string) =>
      [...teamKeys.channels.detail(id), "members"] as const,
    messages: (id: string, params?: MessagesQueryParams) =>
      [...teamKeys.channels.detail(id), "messages", params] as const,
  },

  // DMs
  dms: {
    all: () => [...teamKeys.all, "dms"] as const,
    list: () => [...teamKeys.dms.all(), "list"] as const,
    detail: (id: string) => [...teamKeys.dms.all(), "detail", id] as const,
    messages: (id: string, params?: MessagesQueryParams) =>
      [...teamKeys.dms.detail(id), "messages", params] as const,
  },

  // Threads
  threads: (messageId: string) =>
    [...teamKeys.all, "threads", messageId] as const,

  // Messages (single)
  messages: {
    detail: (id: string) => [...teamKeys.all, "messages", id] as const,
  },

  // Mentions
  mentions: (unreadOnly?: boolean) =>
    [...teamKeys.all, "mentions", { unreadOnly }] as const,

  // Search
  search: (query: string, filters?: SearchFilters) =>
    [...teamKeys.all, "search", query, filters] as const,

  // Agents
  agents: {
    all: () => [...teamKeys.all, "agents"] as const,
    list: () => [...teamKeys.agents.all(), "list"] as const,
    detail: (id: string) => [...teamKeys.agents.all(), "detail", id] as const,
    conversation: (agentId: string, conversationId: string) =>
      [...teamKeys.agents.detail(agentId), "conversation", conversationId] as const,
  },

  // Members
  members: () => [...teamKeys.all, "members"] as const,

  // Presence
  presence: (userId: string) =>
    [...teamKeys.all, "presence", userId] as const,
};

// ============================================================================
// Channels Hooks
// ============================================================================

export function useChannels(params?: ChannelsQueryParams) {
  return useQuery<ChannelsResponse>({
    queryKey: teamKeys.channels.list(params),
    queryFn: () => getChannels(params),
  });
}

export function useChannel(id: string) {
  return useQuery<ChannelResponse>({
    queryKey: teamKeys.channels.detail(id),
    queryFn: () => getChannel(id),
    enabled: !!id,
  });
}

export function useChannelMembers(channelId: string) {
  return useQuery<WorkspaceMembersResponse>({
    queryKey: teamKeys.channels.members(channelId),
    queryFn: () => getChannelMembers(channelId),
    enabled: !!channelId,
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChannelInput) => createChannel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.channels.all() });
    },
  });
}

export function useUpdateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChannelInput }) =>
      updateChannel(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.channels.all() });
      queryClient.invalidateQueries({ queryKey: teamKeys.channels.detail(id) });
    },
  });
}

export function useDeleteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteChannel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.channels.all() });
    },
  });
}

export function useJoinChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => joinChannel(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.channels.all() });
      queryClient.invalidateQueries({ queryKey: teamKeys.channels.detail(id) });
    },
  });
}

export function useLeaveChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => leaveChannel(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.channels.all() });
      queryClient.invalidateQueries({ queryKey: teamKeys.channels.detail(id) });
    },
  });
}

export function useToggleStarChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isStarred }: { id: string; isStarred: boolean }) =>
      isStarred ? unstarChannel(id) : starChannel(id),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.channels.all() });
      queryClient.invalidateQueries({ queryKey: teamKeys.channels.detail(id) });
    },
  });
}

export function useToggleMuteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isMuted }: { id: string; isMuted: boolean }) =>
      isMuted ? unmuteChannel(id) : muteChannel(id),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.channels.all() });
      queryClient.invalidateQueries({ queryKey: teamKeys.channels.detail(id) });
    },
  });
}

export function useAddChannelMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ channelId, userId }: { channelId: string; userId: string }) =>
      addChannelMember(channelId, userId),
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({
        queryKey: teamKeys.channels.members(channelId),
      });
      queryClient.invalidateQueries({
        queryKey: teamKeys.channels.detail(channelId),
      });
    },
  });
}

export function useRemoveChannelMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ channelId, userId }: { channelId: string; userId: string }) =>
      removeChannelMember(channelId, userId),
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({
        queryKey: teamKeys.channels.members(channelId),
      });
      queryClient.invalidateQueries({
        queryKey: teamKeys.channels.detail(channelId),
      });
    },
  });
}

// ============================================================================
// Messages Hooks
// ============================================================================

export function useChannelMessages(
  channelId: string,
  params?: Omit<MessagesQueryParams, "before">
) {
  return useInfiniteQuery<MessagesResponse>({
    queryKey: teamKeys.channels.messages(channelId, params),
    queryFn: ({ pageParam }) =>
      getChannelMessages(channelId, { ...params, before: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor : undefined,
    enabled: !!channelId,
  });
}

export function useSendChannelMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      channelId,
      data,
    }: {
      channelId: string;
      data: SendMessageInput;
    }) => sendChannelMessage(channelId, data),
    onSuccess: (_, { channelId }) => {
      // Use detail key as prefix to match all message queries regardless of params
      queryClient.invalidateQueries({
        queryKey: teamKeys.channels.detail(channelId),
      });
    },
  });
}

export function useMessage(id: string) {
  return useQuery<Message>({
    queryKey: teamKeys.messages.detail(id),
    queryFn: () => getMessage(id),
    enabled: !!id,
  });
}

export function useUpdateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      updateMessage(id, content),
    onSuccess: (updatedMessage) => {
      // Invalidate the message's channel or DM messages
      if (updatedMessage.channel_id) {
        queryClient.invalidateQueries({
          queryKey: teamKeys.channels.messages(updatedMessage.channel_id),
        });
      }
      if (updatedMessage.dm_conversation_id) {
        queryClient.invalidateQueries({
          queryKey: teamKeys.dms.messages(updatedMessage.dm_conversation_id),
        });
      }
      if (updatedMessage.thread_id) {
        queryClient.invalidateQueries({
          queryKey: teamKeys.threads(updatedMessage.thread_id),
        });
      }
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMessage(id),
    onSuccess: () => {
      // Invalidate all messages since we don't know which channel/DM
      queryClient.invalidateQueries({ queryKey: teamKeys.channels.all() });
      queryClient.invalidateQueries({ queryKey: teamKeys.dms.all() });
    },
  });
}

export function useTogglePinMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) =>
      isPinned ? unpinMessage(id) : pinMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.channels.all() });
      queryClient.invalidateQueries({ queryKey: teamKeys.dms.all() });
    },
  });
}

// ============================================================================
// Thread Hooks
// ============================================================================

export function useThread(messageId: string, params?: MessagesQueryParams) {
  return useQuery<ThreadResponse>({
    queryKey: teamKeys.threads(messageId),
    queryFn: () => getThread(messageId, params),
    enabled: !!messageId,
  });
}

export function useReplyToThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      replyToThread(messageId, content),
    onSuccess: (_, { messageId }) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.threads(messageId) });
      // Also invalidate parent channel messages to update reply count
      queryClient.invalidateQueries({ queryKey: teamKeys.channels.all() });
    },
  });
}

// ============================================================================
// Reaction Hooks
// ============================================================================

export function useAddReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      addReaction(messageId, emoji),
    onSuccess: () => {
      // Reactions affect message display, so invalidate messages
      queryClient.invalidateQueries({ queryKey: teamKeys.channels.all() });
      queryClient.invalidateQueries({ queryKey: teamKeys.dms.all() });
    },
  });
}

export function useRemoveReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      removeReaction(messageId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.channels.all() });
      queryClient.invalidateQueries({ queryKey: teamKeys.dms.all() });
    },
  });
}

// ============================================================================
// DM Hooks
// ============================================================================

export function useDMConversations() {
  return useQuery<DMConversationsResponse>({
    queryKey: teamKeys.dms.list(),
    queryFn: getDMConversations,
  });
}

export function useDMConversation(id: string) {
  return useQuery<DirectMessageConversation>({
    queryKey: teamKeys.dms.detail(id),
    queryFn: () => getDMConversation(id),
    enabled: !!id,
  });
}

export function useStartDMConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDMInput) => startDMConversation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.dms.list() });
    },
  });
}

export function useDMMessages(
  dmId: string,
  params?: Omit<MessagesQueryParams, "before">
) {
  return useInfiniteQuery<MessagesResponse>({
    queryKey: teamKeys.dms.messages(dmId, params),
    queryFn: ({ pageParam }) =>
      getDMMessages(dmId, { ...params, before: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor : undefined,
    enabled: !!dmId,
  });
}

export function useSendDMMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dmId, data }: { dmId: string; data: SendMessageInput }) =>
      sendDMMessage(dmId, data),
    onSuccess: (_, { dmId }) => {
      // Use detail key as prefix to match all message queries regardless of params
      queryClient.invalidateQueries({ queryKey: teamKeys.dms.detail(dmId) });
      queryClient.invalidateQueries({ queryKey: teamKeys.dms.list() });
    },
  });
}

export function useToggleMuteDM() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isMuted }: { id: string; isMuted: boolean }) =>
      isMuted ? unmuteDM(id) : muteDM(id),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.dms.detail(id) });
      queryClient.invalidateQueries({ queryKey: teamKeys.dms.list() });
    },
  });
}

// ============================================================================
// Presence Hooks
// ============================================================================

export function useUpdatePresence() {
  return useMutation({
    mutationFn: (data: UpdatePresenceInput) => updatePresence(data),
  });
}

export function useUserPresence(userId: string) {
  return useQuery<UserPresence>({
    queryKey: teamKeys.presence(userId),
    queryFn: () => getUserPresence(userId),
    enabled: !!userId,
    staleTime: 30000, // 30 seconds - presence changes frequently
  });
}

// ============================================================================
// Mentions Hooks
// ============================================================================

export function useMentions(unreadOnly?: boolean) {
  return useQuery<MentionsResponse>({
    queryKey: teamKeys.mentions(unreadOnly),
    queryFn: () => getMentions(unreadOnly),
  });
}

export function useMarkMentionRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markMentionRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.mentions() });
    },
  });
}

export function useMarkAllMentionsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllMentionsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.mentions() });
    },
  });
}

// ============================================================================
// Search Hooks
// ============================================================================

export function useMessageSearch(query: string, filters?: SearchFilters) {
  return useQuery<SearchResponse>({
    queryKey: teamKeys.search(query, filters),
    queryFn: () => searchMessages(query, filters),
    enabled: query.length >= 2,
  });
}

// ============================================================================
// Agent Hooks
// ============================================================================

export function useAgents() {
  return useQuery<AgentsResponse>({
    queryKey: teamKeys.agents.list(),
    queryFn: getAgents,
  });
}

export function useAgent(id: string) {
  return useQuery<Agent>({
    queryKey: teamKeys.agents.detail(id),
    queryFn: () => getAgent(id),
    enabled: !!id,
  });
}

export function useAgentConversation(agentId: string, conversationId: string) {
  return useQuery<AgentConversation>({
    queryKey: teamKeys.agents.conversation(agentId, conversationId),
    queryFn: () => getAgentConversation(agentId, conversationId),
    enabled: !!agentId && !!conversationId,
  });
}

// ============================================================================
// Members Hooks
// ============================================================================

export function useWorkspaceMembers() {
  return useQuery<WorkspaceMembersResponse>({
    queryKey: teamKeys.members(),
    queryFn: getWorkspaceMembers,
  });
}
