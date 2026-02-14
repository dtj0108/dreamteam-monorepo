import { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { ProductSwitcher } from "@/components/ProductSwitcher";

import { Colors } from "@/constants/Colors";
import { useAgents, useChannels, useDMConversations } from "@/lib/hooks/useTeam";
import { ChannelWithMembership } from "@/lib/types/team";
import { QuickActionCard } from "@/components/team/QuickActionCard";
import { CollapsibleSection } from "@/components/team/CollapsibleSection";
import { ChannelListItem } from "@/components/team/ChannelListItem";
import { DMListItem } from "@/components/team/DMListItem";
import { FABMenu } from "@/components/team/FABMenu";
import { isAvailable as isHuddleAvailable } from "@/modules/chime-sdk/src";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Fetch channels and DMs
  const {
    data: channelsData,
    isLoading: channelsLoading,
    refetch: refetchChannels,
  } = useChannels({ joined: true });

  const {
    data: dmsData,
    isLoading: dmsLoading,
    refetch: refetchDMs,
  } = useDMConversations();
  const {
    data: agentsData,
    refetch: refetchAgents,
  } = useAgents();

  const channels = channelsData?.channels || [];
  const dms = dmsData?.conversations || [];
  const agents = agentsData?.agents || [];
  const isLoading = channelsLoading || dmsLoading;

  // Calculate unreads - channels and DMs with unread messages
  const unreads = useMemo(() => {
    const unreadChannels = channels
      .filter((c) => (c.unread_count || 0) > 0)
      .map((c) => ({
        type: "channel" as const,
        id: c.id,
        name: c.name,
        unreadCount: c.unread_count || 0,
        isPrivate: c.type === "private",
      }));

    const unreadDMs = dms
      .filter((d) => (d.unread_count || 0) > 0)
      .map((d) => ({
        type: "dm" as const,
        id: d.id,
        name: d.participant?.display_name || d.participant?.user?.name || "Unknown",
        unreadCount: d.unread_count || 0,
        avatarUrl: d.participant?.user?.avatar_url,
      }));

    const unreadAgents = agents
      .filter((agent) => (agent.unread_count || 0) > 0)
      .map((agent) => ({
        type: "agent" as const,
        id: agent.id,
        name: agent.name,
        unreadCount: agent.unread_count || 0,
        emoji: agent.emoji || "✨",
      }));

    return [...unreadChannels, ...unreadDMs, ...unreadAgents];
  }, [channels, dms, agents]);

  // Calculate totals
  const totalUnread = unreads.reduce((sum, u) => sum + u.unreadCount, 0);
  const dmUnreadCount = dms.reduce((sum, dm) => sum + (dm.unread_count || 0), 0);
  const agentUnreadCount = agents.reduce(
    (sum, agent) => sum + (agent.unread_count || 0),
    0
  );
  const directMessageUnreadCount = dmUnreadCount + agentUnreadCount;

  // Handlers
  const handleChannelPress = (channel: ChannelWithMembership) => {
    router.push(`/(main)/team/channels/${channel.id}`);
  };

  const handleUnreadPress = (item: (typeof unreads)[0]) => {
    if (item.type === "channel") {
      router.push(`/(main)/team/channels/${item.id}`);
    } else if (item.type === "agent") {
      router.push(`/(main)/team/agents/${item.id}`);
    } else {
      router.push(`/(main)/team/dm/${item.id}`);
    }
  };

  const handleCreateChannel = () => {
    router.push("/(main)/team/channels/new");
  };

  const handleRefresh = () => {
    refetchChannels();
    refetchDMs();
    refetchAgents();
  };

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header with ProductSwitcher */}
      <View className="px-4 py-2">
        <ProductSwitcher />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={handleRefresh} />
          }
        >
          {/* Quick Action Cards */}
          <View className="flex-row gap-3 px-4 py-4">
            <QuickActionCard
              icon="cafe-outline"
              title="Catch Up"
              subtitle={totalUnread > 0 ? `${totalUnread} new` : "All caught up"}
              hasNotification={totalUnread > 0}
              isActive={totalUnread > 0}
              flex
            />
            <QuickActionCard
              icon="chatbubbles-outline"
              title="Threads"
              subtitle="0 new"
              flex
            />
            <QuickActionCard
              icon="headset-outline"
              title="Huddles"
              subtitle="0 live"
              flex
            />
          </View>

          {/* Unreads Section */}
          {unreads.length > 0 && (
            <CollapsibleSection title="Unreads" defaultExpanded={true}>
              {unreads.map((item) => (
                <Pressable
                  key={`${item.type}-${item.id}`}
                  onPress={() => handleUnreadPress(item)}
                  className="mb-2 flex-row items-center rounded-xl bg-white p-3"
                >
                  <View className="h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    {item.type === "channel" ? (
                      item.isPrivate ? (
                        <Ionicons name="lock-closed" size={20} color="#64748b" />
                      ) : (
                        <Text className="text-lg font-bold text-gray-500">#</Text>
                      )
                    ) : item.type === "agent" ? (
                      <View className="h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                        <Text className="text-lg">{item.emoji}</Text>
                      </View>
                    ) : (
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-sky-100">
                        <Text className="text-sm font-semibold text-sky-600">
                          {item.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="ml-3 flex-1 text-base font-medium text-foreground">
                    {item.type === "channel" ? `#${item.name}` : item.name}
                  </Text>
                  <View className="rounded-full bg-primary px-2.5 py-1">
                    <Text className="text-xs font-semibold text-white">
                      {item.unreadCount > 99 ? "99+" : item.unreadCount}
                    </Text>
                  </View>
                </Pressable>
              ))}

              {/* Add channel button */}
              <Pressable
                onPress={handleCreateChannel}
                className="flex-row items-center py-2"
              >
                <Ionicons name="add" size={20} color="#64748b" />
                <Text className="ml-2 text-base text-muted-foreground">
                  Add channel
                </Text>
              </Pressable>
            </CollapsibleSection>
          )}

          {/* Channels Section */}
          <CollapsibleSection
            title="Channels"
            defaultExpanded={true}
            rightElement={
              <Pressable onPress={handleCreateChannel} className="mr-2">
                <Ionicons name="add-circle-outline" size={20} color="#64748b" />
              </Pressable>
            }
          >
            {channels.length === 0 ? (
              <View className="items-center py-8">
                <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
                <Text className="mt-4 text-base font-medium text-foreground">
                  No channels yet
                </Text>
                <Text className="mt-1 text-center text-sm text-muted-foreground">
                  Create a channel to start messaging
                </Text>
                <Pressable
                  className="mt-4 flex-row items-center rounded-full bg-primary px-4 py-2 active:opacity-70"
                  onPress={handleCreateChannel}
                >
                  <Ionicons name="add" size={16} color="white" />
                  <Text className="ml-2 font-medium text-white">
                    Create Channel
                  </Text>
                </Pressable>
              </View>
            ) : (
              channels.map((channel) => (
                <ChannelListItem
                  key={channel.id}
                  channel={channel}
                  onPress={() => handleChannelPress(channel)}
                />
              ))
            )}
          </CollapsibleSection>

          {/* Direct Messages Section */}
          <CollapsibleSection
            title="Direct Messages"
            defaultExpanded={true}
            badgeCount={directMessageUnreadCount}
            rightElement={
              <Pressable onPress={() => router.push("/(main)/team/dm/new")} className="mr-2">
                <Ionicons name="add-circle-outline" size={20} color="#64748b" />
              </Pressable>
            }
          >
            {dms.length === 0 ? (
              <View className="items-center py-8">
                <Ionicons name="person-outline" size={48} color="#d1d5db" />
                <Text className="mt-4 text-base font-medium text-foreground">
                  No conversations yet
                </Text>
                <Text className="mt-1 text-center text-sm text-muted-foreground">
                  Start a direct message with a teammate
                </Text>
                <Pressable
                  className="mt-4 flex-row items-center rounded-full bg-primary px-4 py-2 active:opacity-70"
                  onPress={() => router.push("/(main)/team/dm/new")}
                >
                  <Ionicons name="add" size={16} color="white" />
                  <Text className="ml-2 font-medium text-white">
                    New Message
                  </Text>
                </Pressable>
              </View>
            ) : (
              dms.map((dm) => (
                <DMListItem
                  key={dm.id}
                  conversation={dm}
                  onPress={() => router.push(`/(main)/team/dm/${dm.id}`)}
                />
              ))
            )}
          </CollapsibleSection>
        </ScrollView>
      )}

      {/* FAB Menu */}
      <FABMenu
        onCreateChannel={handleCreateChannel}
        onStartDM={() => router.push("/(main)/team/dm/new")}
        onStartHuddle={() => {
          if (!isHuddleAvailable) {
            Alert.alert(
              "Development Build Required",
              "Huddles require a development build with native code.\n\nRun: eas build --profile development",
              [{ text: "OK" }]
            );
            return;
          }
          // Navigate to start a new huddle - uses a general meeting room
          router.push("/(main)/team/meeting/general");
        }}
      />
    </View>
  );
}
