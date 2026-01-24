import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { Colors } from "@/constants/Colors";
import { useChannels, useDMConversations } from "@/lib/hooks/useTeam";
import { Channel, DirectMessageConversation } from "@/lib/types/team";

type TabType = "all" | "channels" | "dms";

interface UnifiedMessage {
  id: string;
  type: "channel" | "dm";
  name: string;
  emoji?: string;
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  isOnline?: boolean;
}

export default function UnifiedInboxScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // Fetch data
  const {
    data: channelsData,
    isLoading: channelsLoading,
    refetch: refetchChannels,
  } = useChannels();
  const {
    data: dmsData,
    isLoading: dmsLoading,
    refetch: refetchDMs,
  } = useDMConversations();

  const isLoading = channelsLoading || dmsLoading;

  // Transform data into unified format
  const unifiedMessages = useMemo(() => {
    const messages: UnifiedMessage[] = [];

    // Add channels
    if (channelsData?.channels && (activeTab === "all" || activeTab === "channels")) {
      channelsData.channels.forEach((channel) => {
        messages.push({
          id: `channel-${channel.id}`,
          type: "channel",
          name: channel.name,
          emoji: channel.type === "private" ? "🔒" : "#",
          lastMessage: channel.last_message_preview || undefined,
          lastMessageAt: channel.last_message_at || undefined,
          unreadCount: channel.unread_count || 0,
        });
      });
    }

    // Add DMs
    if (dmsData?.conversations && (activeTab === "all" || activeTab === "dms")) {
      dmsData.conversations.forEach((dm: DirectMessageConversation) => {
        const participant = dm.participant;
        messages.push({
          id: `dm-${dm.id}`,
          type: "dm",
          name: participant?.display_name || participant?.user?.name || "Unknown",
          avatarUrl: participant?.user?.avatar_url || undefined,
          lastMessage: dm.last_message?.content,
          lastMessageAt: dm.last_message?.created_at,
          unreadCount: dm.unread_count || 0,
          isOnline: participant?.presence?.status === "online",
        });
      });
    }

    // Filter unread if toggle is on
    let filtered = showUnreadOnly
      ? messages.filter((m) => m.unreadCount > 0)
      : messages;

    // Sort by last message time
    filtered.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });

    return filtered;
  }, [channelsData, dmsData, activeTab, showUnreadOnly]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchChannels(), refetchDMs()]);
  }, [refetchChannels, refetchDMs]);

  const handleItemPress = useCallback(
    (item: UnifiedMessage) => {
      if (item.type === "channel") {
        const channelId = item.id.replace("channel-", "");
        router.push(`/team/channels/${channelId}`);
      } else {
        const dmId = item.id.replace("dm-", "");
        router.push(`/team/dm/${dmId}`);
      }
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: UnifiedMessage }) => (
      <Pressable
        className="flex-row items-center border-b border-border px-4 py-3 active:bg-muted"
        onPress={() => handleItemPress(item)}
      >
        {/* Avatar/Icon */}
        <View className="relative">
          {item.type === "channel" ? (
            <View className="h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Text className="text-xl">
                {item.emoji === "🔒" ? "🔒" : "#"}
              </Text>
            </View>
          ) : item.avatarUrl ? (
            <View className="h-12 w-12 overflow-hidden rounded-full bg-muted">
              {/* Would use expo-image here */}
              <View className="h-full w-full items-center justify-center">
                <Text className="text-lg font-semibold text-muted-foreground">
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
          ) : (
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Text className="text-lg font-semibold text-white">
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Online indicator for DMs */}
          {item.type === "dm" && item.isOnline && (
            <View className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-success" />
          )}
        </View>

        {/* Content */}
        <View className="ml-3 flex-1">
          <View className="flex-row items-center justify-between">
            <Text
              className={`font-semibold ${
                item.unreadCount > 0 ? "text-foreground" : "text-foreground"
              }`}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.lastMessageAt && (
              <Text className="text-xs text-muted-foreground">
                {formatMessageTime(item.lastMessageAt)}
              </Text>
            )}
          </View>
          <View className="mt-0.5 flex-row items-center justify-between">
            <Text
              className={`flex-1 text-sm ${
                item.unreadCount > 0
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }`}
              numberOfLines={1}
            >
              {item.lastMessage || "No messages yet"}
            </Text>
            {item.unreadCount > 0 && (
              <View className="ml-2 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 py-0.5">
                <Text className="text-xs font-semibold text-white">
                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    ),
    [handleItemPress]
  );

  const tabs: { key: TabType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "channels", label: "Channels" },
    { key: "dms", label: "DMs" },
  ];

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="border-b border-border px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-foreground">Inbox</Text>
          <Pressable
            className={`flex-row items-center rounded-full px-3 py-1.5 ${
              showUnreadOnly ? "bg-primary" : "bg-muted"
            }`}
            onPress={() => setShowUnreadOnly(!showUnreadOnly)}
          >
            <FontAwesome
              name="filter"
              size={12}
              color={showUnreadOnly ? "#fff" : Colors.mutedForeground}
            />
            <Text
              className={`ml-1.5 text-xs font-medium ${
                showUnreadOnly ? "text-white" : "text-muted-foreground"
              }`}
            >
              Unread
            </Text>
          </Pressable>
        </View>

        {/* Tabs */}
        <View className="mt-3 flex-row gap-2">
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              className={`rounded-full px-4 py-2 ${
                activeTab === tab.key ? "bg-primary" : "bg-muted"
              }`}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                className={`text-sm font-medium ${
                  activeTab === tab.key ? "text-white" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Content */}
      {isLoading && unifiedMessages.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : unifiedMessages.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <FontAwesome name="inbox" size={48} color={Colors.mutedForeground} />
          <Text className="mt-4 text-center text-lg font-semibold text-foreground">
            {showUnreadOnly ? "No unread messages" : "No messages yet"}
          </Text>
          <Text className="mt-2 text-center text-muted-foreground">
            {showUnreadOnly
              ? "You're all caught up!"
              : "Start a conversation in channels or DMs"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={unifiedMessages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
}
