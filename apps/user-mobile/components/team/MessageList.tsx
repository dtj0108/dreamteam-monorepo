import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  ListRenderItem,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";
import {
  Message,
  isConsecutiveMessage,
  shouldShowDateSeparator,
  formatDateSeparator,
} from "@/lib/types/team";
import { useAuth } from "@/providers/auth-provider";
import { MessageItem } from "./MessageItem";

interface MessageListProps {
  messages: Message[];
  channelId?: string;
  dmId?: string;
  threadId?: string;
  onMessagePress: (message: Message) => void;
  onThreadPress: (message: Message) => void;
  onReactionPress: (message: Message, emoji: string) => void;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  hasMore: boolean;
}

export function MessageList({
  messages,
  channelId,
  dmId,
  threadId,
  onMessagePress,
  onThreadPress,
  onReactionPress,
  onLoadMore,
  isLoadingMore,
  hasMore,
}: MessageListProps) {
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Handle scroll to determine if we should show "scroll to bottom" button
  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      setShowScrollButton(offsetY > 200);
    },
    []
  );

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    setShowScrollButton(false);
  }, []);

  const renderItem: ListRenderItem<Message> = useCallback(
    ({ item, index }) => {
      const previousMessage = messages[index + 1]; // +1 because list is inverted
      const isOwn = item.sender_id === user?.id;
      const showAvatar = !isConsecutiveMessage(item, previousMessage);
      const showDateSeparator = shouldShowDateSeparator(item, previousMessage);

      return (
        <>
          <MessageItem
            message={item}
            isOwn={isOwn}
            showAvatar={showAvatar}
            showTimestamp={showAvatar}
            isInThread={!!threadId}
            onPress={() => onMessagePress(item)}
            onLongPress={() => onMessagePress(item)}
            onThreadPress={() => onThreadPress(item)}
            onReactionPress={(emoji) => onReactionPress(item, emoji)}
          />
          {/* Date separator - bold left-aligned text */}
          {showDateSeparator && (
            <View className="px-4 pb-2 pt-4">
              <Text className="text-sm font-semibold text-foreground">
                {formatDateSeparator(item.created_at)}
              </Text>
            </View>
          )}
        </>
      );
    },
    [
      messages,
      user?.id,
      threadId,
      onMessagePress,
      onThreadPress,
      onReactionPress,
    ]
  );

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }, [isLoadingMore]);

  const renderEmpty = useCallback(() => {
    return (
      <View
        className="flex-1 items-center justify-center py-12"
        style={{ transform: [{ scaleY: -1 }] }}
      >
        <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
        <Text className="mt-4 text-lg font-medium text-foreground">
          No messages yet
        </Text>
        <Text className="mt-1 text-center text-muted-foreground">
          Be the first to send a message!
        </Text>
      </View>
    );
  }, []);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <View className="flex-1 bg-white">
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        inverted
        contentContainerStyle={{
          paddingTop: 16,
          flexGrow: 1,
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onEndReached={hasMore ? onLoadMore : undefined}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
      />

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <Pressable
          className="absolute bottom-4 right-4 h-10 w-10 items-center justify-center rounded-full bg-gray-800 shadow-lg active:opacity-70"
          onPress={scrollToBottom}
        >
          <Ionicons name="chevron-down" size={20} color="white" />
        </Pressable>
      )}
    </View>
  );
}
