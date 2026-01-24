import { supabase } from "../supabase";
import { Message, UserPresence, PresenceStatus } from "../types/team";

// ============================================================================
// Types
// ============================================================================

export interface MessageCallbacks {
  onInsert?: (message: Message) => void;
  onUpdate?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
}

export interface TypingCallback {
  (userId: string, userName: string): void;
}

export interface PresenceCallback {
  (onlineUsers: Map<string, UserPresence>): void;
}

type SubscriptionChannel = ReturnType<typeof supabase.channel>;

// ============================================================================
// Active Subscriptions Registry
// ============================================================================

const activeSubscriptions = new Map<string, SubscriptionChannel>();

// ============================================================================
// Message Subscriptions
// ============================================================================

/**
 * Subscribe to real-time message updates for a channel
 */
export function subscribeToChannelMessages(
  channelId: string,
  callbacks: MessageCallbacks
): () => void {
  const key = `channel:messages:${channelId}`;

  // Don't create duplicate subscriptions
  if (activeSubscriptions.has(key)) {
    return () => unsubscribe(key);
  }

  const channel = supabase
    .channel(key)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `channel_id=eq.${channelId}`,
      },
      (payload) => {
        callbacks.onInsert?.(payload.new as Message);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `channel_id=eq.${channelId}`,
      },
      (payload) => {
        callbacks.onUpdate?.(payload.new as Message);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "messages",
        filter: `channel_id=eq.${channelId}`,
      },
      (payload) => {
        callbacks.onDelete?.((payload.old as { id: string }).id);
      }
    )
    .subscribe();

  activeSubscriptions.set(key, channel);

  return () => unsubscribe(key);
}

/**
 * Subscribe to real-time message updates for a DM conversation
 */
export function subscribeToDMMessages(
  dmId: string,
  callbacks: MessageCallbacks
): () => void {
  const key = `dm:messages:${dmId}`;

  if (activeSubscriptions.has(key)) {
    return () => unsubscribe(key);
  }

  const channel = supabase
    .channel(key)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `dm_conversation_id=eq.${dmId}`,
      },
      (payload) => {
        callbacks.onInsert?.(payload.new as Message);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `dm_conversation_id=eq.${dmId}`,
      },
      (payload) => {
        callbacks.onUpdate?.(payload.new as Message);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "messages",
        filter: `dm_conversation_id=eq.${dmId}`,
      },
      (payload) => {
        callbacks.onDelete?.((payload.old as { id: string }).id);
      }
    )
    .subscribe();

  activeSubscriptions.set(key, channel);

  return () => unsubscribe(key);
}

/**
 * Subscribe to real-time message updates for a thread
 */
export function subscribeToThreadMessages(
  threadId: string,
  callbacks: MessageCallbacks
): () => void {
  const key = `thread:messages:${threadId}`;

  if (activeSubscriptions.has(key)) {
    return () => unsubscribe(key);
  }

  const channel = supabase
    .channel(key)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `parent_id=eq.${threadId}`,
      },
      (payload) => {
        callbacks.onInsert?.(payload.new as Message);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `parent_id=eq.${threadId}`,
      },
      (payload) => {
        callbacks.onUpdate?.(payload.new as Message);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "messages",
        filter: `parent_id=eq.${threadId}`,
      },
      (payload) => {
        callbacks.onDelete?.((payload.old as { id: string }).id);
      }
    )
    .subscribe();

  activeSubscriptions.set(key, channel);

  return () => unsubscribe(key);
}

// ============================================================================
// Typing Indicators
// ============================================================================

/**
 * Subscribe to typing indicators for a channel
 */
export function subscribeToChannelTyping(
  channelId: string,
  onTyping: TypingCallback
): () => void {
  const key = `channel:typing:${channelId}`;

  if (activeSubscriptions.has(key)) {
    return () => unsubscribe(key);
  }

  const channel = supabase
    .channel(key)
    .on("broadcast", { event: "typing" }, ({ payload }) => {
      onTyping(payload.user_id, payload.user_name);
    })
    .subscribe();

  activeSubscriptions.set(key, channel);

  return () => unsubscribe(key);
}

/**
 * Subscribe to typing indicators for a DM
 */
export function subscribeToDMTyping(
  dmId: string,
  onTyping: TypingCallback
): () => void {
  const key = `dm:typing:${dmId}`;

  if (activeSubscriptions.has(key)) {
    return () => unsubscribe(key);
  }

  const channel = supabase
    .channel(key)
    .on("broadcast", { event: "typing" }, ({ payload }) => {
      onTyping(payload.user_id, payload.user_name);
    })
    .subscribe();

  activeSubscriptions.set(key, channel);

  return () => unsubscribe(key);
}

/**
 * Broadcast typing indicator for a channel
 */
export function broadcastChannelTyping(
  channelId: string,
  userId: string,
  userName: string
): void {
  const key = `channel:typing:${channelId}`;
  const channel = activeSubscriptions.get(key);

  if (channel) {
    channel.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId, user_name: userName },
    });
  } else {
    // Create temporary channel just to send
    const tempChannel = supabase.channel(key);
    tempChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        tempChannel.send({
          type: "broadcast",
          event: "typing",
          payload: { user_id: userId, user_name: userName },
        });
        // Unsubscribe after sending
        setTimeout(() => {
          supabase.removeChannel(tempChannel);
        }, 100);
      }
    });
  }
}

/**
 * Broadcast typing indicator for a DM
 */
export function broadcastDMTyping(
  dmId: string,
  userId: string,
  userName: string
): void {
  const key = `dm:typing:${dmId}`;
  const channel = activeSubscriptions.get(key);

  if (channel) {
    channel.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId, user_name: userName },
    });
  } else {
    const tempChannel = supabase.channel(key);
    tempChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        tempChannel.send({
          type: "broadcast",
          event: "typing",
          payload: { user_id: userId, user_name: userName },
        });
        setTimeout(() => {
          supabase.removeChannel(tempChannel);
        }, 100);
      }
    });
  }
}

// ============================================================================
// Presence
// ============================================================================

/**
 * Subscribe to workspace presence updates
 */
export function subscribeToPresence(
  workspaceId: string,
  onPresenceChange: PresenceCallback
): () => void {
  const key = `presence:${workspaceId}`;

  if (activeSubscriptions.has(key)) {
    return () => unsubscribe(key);
  }

  const channel = supabase.channel(key);

  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const onlineUsers = new Map<string, UserPresence>();

      Object.entries(state).forEach(([, presences]) => {
        (presences as unknown as Array<{
          user_id: string;
          status: PresenceStatus;
          status_message: string | null;
          last_seen_at: string;
        }>).forEach((presence) => {
          onlineUsers.set(presence.user_id, {
            user_id: presence.user_id,
            status: presence.status,
            status_message: presence.status_message,
            status_emoji: null,
            status_expiry: null,
            last_seen_at: presence.last_seen_at,
            updated_at: presence.last_seen_at,
          });
        });
      });

      onPresenceChange(onlineUsers);
    })
    .subscribe();

  activeSubscriptions.set(key, channel);

  return () => unsubscribe(key);
}

/**
 * Track own presence in a workspace
 */
export async function trackPresence(
  workspaceId: string,
  userId: string,
  status: PresenceStatus = "online",
  statusMessage?: string
): Promise<void> {
  const key = `presence:${workspaceId}`;
  let channel = activeSubscriptions.get(key);

  if (!channel) {
    channel = supabase.channel(key);
    activeSubscriptions.set(key, channel);
    await new Promise<void>((resolve) => {
      channel!.subscribe((subscriptionStatus) => {
        if (subscriptionStatus === "SUBSCRIBED") {
          resolve();
        }
      });
    });
  }

  await channel.track({
    user_id: userId,
    status,
    status_message: statusMessage || null,
    last_seen_at: new Date().toISOString(),
  });
}

/**
 * Untrack own presence (go offline)
 */
export async function untrackPresence(workspaceId: string): Promise<void> {
  const key = `presence:${workspaceId}`;
  const channel = activeSubscriptions.get(key);

  if (channel) {
    await channel.untrack();
  }
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Unsubscribe from a specific subscription
 */
export function unsubscribe(key: string): void {
  const channel = activeSubscriptions.get(key);
  if (channel) {
    supabase.removeChannel(channel);
    activeSubscriptions.delete(key);
  }
}

/**
 * Unsubscribe from all active subscriptions
 */
export function unsubscribeAll(): void {
  activeSubscriptions.forEach((channel, key) => {
    supabase.removeChannel(channel);
    activeSubscriptions.delete(key);
  });
}

/**
 * Get list of active subscription keys
 */
export function getActiveSubscriptions(): string[] {
  return Array.from(activeSubscriptions.keys());
}
