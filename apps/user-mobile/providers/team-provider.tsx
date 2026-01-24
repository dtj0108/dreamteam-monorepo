import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useAuth } from "./auth-provider";
import { useWorkspace } from "./workspace-provider";
import {
  PresenceStatus,
  TypingUser,
  UserPresence,
  getTypingText,
} from "@/lib/types/team";
import { teamKeys } from "@/lib/hooks/useTeam";
import { playNotificationSound, initializeAudio } from "@/lib/audio";
import { showBrowserNotification } from "@/lib/hooks/useBrowserNotifications";

// ============================================================================
// Types
// ============================================================================

interface TeamContextType {
  // Presence
  onlineUsers: Map<string, UserPresence>;
  updateMyPresence: (status: PresenceStatus, message?: string) => void;
  getPresence: (userId: string) => UserPresence | undefined;

  // Typing indicators
  typingUsers: Map<string, TypingUser[]>;
  sendTyping: (channelOrDmId: string, isDM?: boolean) => void;
  getTypingIndicator: (channelOrDmId: string) => string;

  // Unread counts
  unreadCounts: Map<string, number>;
  totalUnreadMentions: number;
  markChannelRead: (channelId: string) => void;
  markDMRead: (dmId: string) => void;

  // Active conversation
  activeChannelId: string | null;
  activeDMId: string | null;
  setActiveChannel: (id: string | null) => void;
  setActiveDM: (id: string | null) => void;

  // Realtime subscriptions
  subscribeToMessages: (channelOrDmId: string, isDM?: boolean) => void;
  unsubscribeFromMessages: (channelOrDmId: string, isDM?: boolean) => void;

  // Connection status
  isConnected: boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

// ============================================================================
// Constants
// ============================================================================

const TYPING_EXPIRY_MS = 5000; // Typing indicator expires after 5 seconds
const TYPING_DEBOUNCE_MS = 300; // Debounce typing events

// ============================================================================
// Provider
// ============================================================================

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  // State
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserPresence>>(
    new Map()
  );
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser[]>>(
    new Map()
  );
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(
    new Map()
  );
  const [totalUnreadMentions, setTotalUnreadMentions] = useState(0);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeDMId, setActiveDMId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Refs for cleanup
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );
  const messageChannelsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(
    new Map()
  );
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastTypingRef = useRef<number>(0);

  // ============================================================================
  // Presence Management
  // ============================================================================

  const updateMyPresence = useCallback(
    async (status: PresenceStatus, message?: string) => {
      if (!user || !presenceChannelRef.current) return;

      try {
        await presenceChannelRef.current.track({
          user_id: user.id,
          status,
          status_message: message || null,
          last_seen_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error updating presence:", error);
      }
    },
    [user]
  );

  const getPresence = useCallback(
    (userId: string): UserPresence | undefined => {
      return onlineUsers.get(userId);
    },
    [onlineUsers]
  );

  // ============================================================================
  // Typing Indicators
  // ============================================================================

  const sendTyping = useCallback(
    (channelOrDmId: string, isDM = false) => {
      if (!user) return;

      // Debounce typing events
      const now = Date.now();
      if (now - lastTypingRef.current < TYPING_DEBOUNCE_MS) return;
      lastTypingRef.current = now;

      const channelName = isDM
        ? `typing:dm:${channelOrDmId}`
        : `typing:channel:${channelOrDmId}`;

      const channel = supabase.channel(channelName);
      channel.send({
        type: "broadcast",
        event: "typing",
        payload: {
          user_id: user.id,
          user_name: user.user_metadata?.name || user.email || "User",
        },
      });
    },
    [user]
  );

  const getTypingIndicator = useCallback(
    (channelOrDmId: string): string => {
      const typing = typingUsers.get(channelOrDmId) || [];
      // Filter out expired typing indicators
      const activeTyping = typing.filter(
        (t) => t.expires_at > Date.now()
      );
      // Filter out current user
      const othersTyping = activeTyping.filter(
        (t) => t.user_id !== user?.id
      );
      return getTypingText(othersTyping);
    },
    [typingUsers, user]
  );

  const handleTypingEvent = useCallback(
    (channelOrDmId: string, userId: string, userName: string) => {
      if (userId === user?.id) return; // Ignore own typing

      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        const current = newMap.get(channelOrDmId) || [];

        // Update or add typing user
        const existingIndex = current.findIndex((t) => t.user_id === userId);
        const typingUser: TypingUser = {
          user_id: userId,
          user_name: userName,
          expires_at: Date.now() + TYPING_EXPIRY_MS,
        };

        if (existingIndex >= 0) {
          current[existingIndex] = typingUser;
        } else {
          current.push(typingUser);
        }

        newMap.set(channelOrDmId, current);
        return newMap;
      });

      // Set up expiry cleanup
      const timeoutKey = `${channelOrDmId}:${userId}`;
      const existingTimeout = typingTimeoutsRef.current.get(timeoutKey);
      if (existingTimeout) clearTimeout(existingTimeout);

      typingTimeoutsRef.current.set(
        timeoutKey,
        setTimeout(() => {
          setTypingUsers((prev) => {
            const newMap = new Map(prev);
            const current = newMap.get(channelOrDmId) || [];
            const filtered = current.filter((t) => t.user_id !== userId);
            if (filtered.length > 0) {
              newMap.set(channelOrDmId, filtered);
            } else {
              newMap.delete(channelOrDmId);
            }
            return newMap;
          });
          typingTimeoutsRef.current.delete(timeoutKey);
        }, TYPING_EXPIRY_MS)
      );
    },
    [user]
  );

  // ============================================================================
  // Unread Management
  // ============================================================================

  const markChannelRead = useCallback((channelId: string) => {
    setUnreadCounts((prev) => {
      const newMap = new Map(prev);
      newMap.delete(channelId);
      return newMap;
    });
  }, []);

  const markDMRead = useCallback((dmId: string) => {
    setUnreadCounts((prev) => {
      const newMap = new Map(prev);
      newMap.delete(dmId);
      return newMap;
    });
  }, []);

  // ============================================================================
  // Active Conversation Management
  // ============================================================================

  const setActiveChannel = useCallback(
    (id: string | null) => {
      setActiveChannelId(id);
      setActiveDMId(null);
      if (id) markChannelRead(id);
    },
    [markChannelRead]
  );

  const setActiveDM = useCallback(
    (id: string | null) => {
      setActiveDMId(id);
      setActiveChannelId(null);
      if (id) markDMRead(id);
    },
    [markDMRead]
  );

  // ============================================================================
  // Message Realtime Subscriptions
  // ============================================================================

  const subscribeToMessages = useCallback(
    (channelOrDmId: string, isDM = false) => {
      const key = isDM ? `dm:${channelOrDmId}` : `channel:${channelOrDmId}`;

      // Already subscribed
      if (messageChannelsRef.current.has(key)) return;

      const filter = isDM
        ? `dm_conversation_id=eq.${channelOrDmId}`
        : `channel_id=eq.${channelOrDmId}`;

      const channel = supabase
        .channel(key)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter,
          },
          (payload) => {
            const { eventType, new: newMessage, old: oldMessage } = payload;

            // Invalidate queries to refresh data
            if (isDM) {
              queryClient.invalidateQueries({
                queryKey: teamKeys.dms.messages(channelOrDmId),
              });
            } else {
              queryClient.invalidateQueries({
                queryKey: teamKeys.channels.messages(channelOrDmId),
              });
            }

            // Handle unread counts and notifications for new messages
            if (
              eventType === "INSERT" &&
              newMessage &&
              (newMessage as { sender_id: string }).sender_id !== user?.id
            ) {
              const isActive = isDM
                ? activeDMId === channelOrDmId
                : activeChannelId === channelOrDmId;

              // Check if message mentions current user
              const mentions = (newMessage as { mentions?: string[] }).mentions;
              const hasMention = mentions?.includes(user?.id || "");

              if (!isActive) {
                setUnreadCounts((prev) => {
                  const newMap = new Map(prev);
                  const current = newMap.get(channelOrDmId) || 0;
                  newMap.set(channelOrDmId, current + 1);
                  return newMap;
                });

                if (hasMention) {
                  setTotalUnreadMentions((prev) => prev + 1);
                }
              }

              // Play notification sound (always, even if active - like Slack)
              // Use "mention" sound if user was mentioned, otherwise "message"
              if (hasMention) {
                playNotificationSound("mention");
              } else {
                playNotificationSound("message");
              }

              // Show browser notification on web platform (only if not active)
              if (Platform.OS === "web" && !isActive) {
                const senderName =
                  (newMessage as { sender?: { name?: string } }).sender?.name ||
                  "Someone";
                const content =
                  (newMessage as { content?: string }).content || "";
                const preview = content.length > 100 ? content.slice(0, 100) + "..." : content;

                showBrowserNotification(
                  hasMention ? `${senderName} mentioned you` : `New message from ${senderName}`,
                  {
                    body: preview,
                    tag: `message-${(newMessage as { id: string }).id}`,
                  }
                );
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setIsConnected(true);
          }
        });

      messageChannelsRef.current.set(key, channel);

      // Also subscribe to typing
      const typingChannel = supabase
        .channel(isDM ? `typing:dm:${channelOrDmId}` : `typing:channel:${channelOrDmId}`)
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          handleTypingEvent(
            channelOrDmId,
            payload.user_id,
            payload.user_name
          );
        })
        .subscribe();

      messageChannelsRef.current.set(`typing:${key}`, typingChannel);
    },
    [user, activeChannelId, activeDMId, queryClient, handleTypingEvent]
  );

  const unsubscribeFromMessages = useCallback((channelOrDmId: string, isDM = false) => {
    const key = isDM ? `dm:${channelOrDmId}` : `channel:${channelOrDmId}`;

    const messageChannel = messageChannelsRef.current.get(key);
    if (messageChannel) {
      supabase.removeChannel(messageChannel);
      messageChannelsRef.current.delete(key);
    }

    const typingChannel = messageChannelsRef.current.get(`typing:${key}`);
    if (typingChannel) {
      supabase.removeChannel(typingChannel);
      messageChannelsRef.current.delete(`typing:${key}`);
    }
  }, []);

  // ============================================================================
  // Initialize Audio
  // ============================================================================

  useEffect(() => {
    // Initialize audio on mount (only on native platforms)
    if (Platform.OS !== "web") {
      initializeAudio();
    }
  }, []);

  // ============================================================================
  // Presence Subscription
  // ============================================================================

  useEffect(() => {
    if (!user || !currentWorkspace) return;

    // Set up presence channel
    const presenceChannel = supabase.channel(
      `presence:${currentWorkspace.id}`
    );

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const newOnlineUsers = new Map<string, UserPresence>();

        Object.entries(state).forEach(([, presences]) => {
          (presences as unknown as Array<{
            user_id: string;
            status: PresenceStatus;
            status_message: string | null;
            last_seen_at: string;
          }>).forEach((presence) => {
            newOnlineUsers.set(presence.user_id, {
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

        setOnlineUsers(newOnlineUsers);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        setOnlineUsers((prev) => {
          const newMap = new Map(prev);
          (newPresences as unknown as Array<{
            user_id: string;
            status: PresenceStatus;
            status_message: string | null;
            last_seen_at: string;
          }>).forEach((presence) => {
            newMap.set(presence.user_id, {
              user_id: presence.user_id,
              status: presence.status,
              status_message: presence.status_message,
              status_emoji: null,
              status_expiry: null,
              last_seen_at: presence.last_seen_at,
              updated_at: presence.last_seen_at,
            });
          });
          return newMap;
        });
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        setOnlineUsers((prev) => {
          const newMap = new Map(prev);
          (leftPresences as unknown as Array<{ user_id: string }>).forEach((presence) => {
            newMap.delete(presence.user_id);
          });
          return newMap;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
          // Track own presence
          await presenceChannel.track({
            user_id: user.id,
            status: "online" as PresenceStatus,
            status_message: null,
            last_seen_at: new Date().toISOString(),
          });
        }
      });

    presenceChannelRef.current = presenceChannel;

    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    };
  }, [user, currentWorkspace]);

  // ============================================================================
  // App State Handling (Background/Foreground)
  // ============================================================================

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        // App came to foreground
        updateMyPresence("online");
      } else if (nextAppState === "background" || nextAppState === "inactive") {
        // App went to background
        updateMyPresence("away");
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [updateMyPresence]);

  // ============================================================================
  // Cleanup on Unmount
  // ============================================================================

  useEffect(() => {
    return () => {
      // Clean up all message channels
      messageChannelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      messageChannelsRef.current.clear();

      // Clean up typing timeouts
      typingTimeoutsRef.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
      typingTimeoutsRef.current.clear();
    };
  }, []);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: TeamContextType = {
    // Presence
    onlineUsers,
    updateMyPresence,
    getPresence,

    // Typing
    typingUsers,
    sendTyping,
    getTypingIndicator,

    // Unread
    unreadCounts,
    totalUnreadMentions,
    markChannelRead,
    markDMRead,

    // Active conversation
    activeChannelId,
    activeDMId,
    setActiveChannel,
    setActiveDM,

    // Realtime subscriptions
    subscribeToMessages,
    unsubscribeFromMessages,

    // Connection
    isConnected,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
}

// ============================================================================
// Additional Hooks for Specific Features
// ============================================================================

/**
 * Hook to subscribe to a specific channel's messages in realtime
 */
export function useChannelSubscription(channelId: string | null) {
  const { setActiveChannel, subscribeToMessages, unsubscribeFromMessages } = useTeam();

  useEffect(() => {
    if (channelId) {
      setActiveChannel(channelId);
      subscribeToMessages(channelId, false);
    }
    return () => {
      if (channelId) {
        setActiveChannel(null);
        unsubscribeFromMessages(channelId, false);
      }
    };
  }, [channelId, setActiveChannel, subscribeToMessages, unsubscribeFromMessages]);
}

/**
 * Hook to subscribe to a specific DM's messages in realtime
 */
export function useDMSubscription(dmId: string | null) {
  const { setActiveDM, subscribeToMessages, unsubscribeFromMessages } = useTeam();

  useEffect(() => {
    if (dmId) {
      setActiveDM(dmId);
      subscribeToMessages(dmId, true);
    }
    return () => {
      if (dmId) {
        setActiveDM(null);
        unsubscribeFromMessages(dmId, true);
      }
    };
  }, [dmId, setActiveDM, subscribeToMessages, unsubscribeFromMessages]);
}
