import { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { ProductSwitcher } from "@/components/ProductSwitcher";

import { Colors } from "@/constants/Colors";
import {
  useMentions,
  useMarkMentionRead,
  useMarkAllMentionsRead,
} from "@/lib/hooks/useTeam";
import { Mention } from "@/lib/types/team";
import { MentionItem } from "@/components/team/MentionItem";

type FilterType = "all" | "unread";

export default function MentionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterType>("all");

  // Fetch mentions
  const unreadOnly = filter === "unread";
  const {
    data: mentionsData,
    isLoading,
    refetch,
  } = useMentions(unreadOnly);

  // Mutations
  const markReadMutation = useMarkMentionRead();
  const markAllReadMutation = useMarkAllMentionsRead();

  const mentions = mentionsData?.mentions || [];

  // Calculate unread count
  const unreadCount = useMemo(() => {
    return mentions.filter((m) => !m.is_read).length;
  }, [mentions]);

  // Handlers
  const handleMentionPress = (mention: Mention) => {
    // Mark as read
    if (!mention.is_read) {
      markReadMutation.mutate(mention.id);
    }

    // Navigate to the message context
    if (mention.message.channel) {
      router.push(`/(main)/team/channels/${mention.message.channel.id}`);
    } else if (mention.message.dm) {
      router.push(`/(main)/team/dm/${mention.message.dm.id}`);
    }
  };

  const handleMarkRead = (mention: Mention) => {
    markReadMutation.mutate(mention.id);
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  const FilterButton = ({
    type,
    label,
    count,
  }: {
    type: FilterType;
    label: string;
    count?: number;
  }) => (
    <Pressable
      className={`flex-row items-center rounded-lg px-3 py-2 ${
        filter === type ? "bg-primary" : "bg-muted"
      }`}
      onPress={() => setFilter(type)}
    >
      <Text
        className={`text-sm font-medium ${
          filter === type ? "text-white" : "text-muted-foreground"
        }`}
      >
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View
          className={`ml-2 min-w-[20px] items-center rounded-full px-1.5 py-0.5 ${
            filter === type ? "bg-white/20" : "bg-primary"
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              filter === type ? "text-white" : "text-white"
            }`}
          >
            {count > 99 ? "99+" : count}
          </Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header with ProductSwitcher */}
      <View className="px-4 py-2">
        <ProductSwitcher />
      </View>

      {/* Content Header */}
      <View className="px-4 py-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-foreground">
              Mentions
            </Text>
            <Text className="text-sm text-muted-foreground">
              {mentions.length} mention{mentions.length !== 1 ? "s" : ""}
              {unreadCount > 0 && ` • ${unreadCount} unread`}
            </Text>
          </View>

          {/* Mark all read button */}
          {unreadCount > 0 && (
            <Pressable
              className="rounded-lg bg-muted px-3 py-2 active:opacity-70"
              onPress={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
            >
              {markAllReadMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text className="text-sm font-medium text-primary">
                  Mark all read
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* Filters */}
      <View className="flex-row gap-2 px-4 py-2">
        <FilterButton type="all" label="All" />
        <FilterButton type="unread" label="Unread" count={unreadCount} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} />
          }
        >
          {mentions.length === 0 ? (
            <View className="flex-1 items-center justify-center py-12">
              <FontAwesome name="at" size={48} color="#d1d5db" />
              <Text className="mt-4 text-lg font-medium text-foreground">
                No mentions
              </Text>
              <Text className="mt-1 text-center text-muted-foreground">
                {filter === "unread"
                  ? "You've read all your mentions"
                  : "When someone @mentions you, it will appear here"}
              </Text>
            </View>
          ) : (
            mentions.map((mention) => (
              <MentionItem
                key={mention.id}
                mention={mention}
                onPress={() => handleMentionPress(mention)}
                onMarkRead={() => handleMarkRead(mention)}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
