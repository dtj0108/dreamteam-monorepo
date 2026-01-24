import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";

import { Colors } from "@/constants/Colors";
import { useThread, useReplyToThread } from "@/lib/hooks/useTeam";
import { Message } from "@/lib/types/team";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { MessageItem } from "./MessageItem";
import { useAuth } from "@/providers/auth-provider";

interface ThreadPanelProps {
  parentMessage: Message | null;
  isOpen: boolean;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MIN_HEIGHT = SCREEN_HEIGHT * 0.5;
const MAX_HEIGHT = SCREEN_HEIGHT * 0.9;

export function ThreadPanel({
  parentMessage,
  isOpen,
  onClose,
}: ThreadPanelProps) {
  const { user } = useAuth();
  const [sheetHeight, setSheetHeight] = useState(MIN_HEIGHT);

  // Fetch thread data
  const {
    data: threadData,
    isLoading: threadLoading,
  } = useThread(parentMessage?.id || "", { limit: 50 });

  // Reply mutation
  const replyMutation = useReplyToThread();

  const replies = threadData?.replies || [];

  // Handlers
  const handleSend = useCallback(
    async (content: string) => {
      if (!parentMessage || !content.trim()) return;

      await replyMutation.mutateAsync({
        messageId: parentMessage.id,
        content: content.trim(),
      });
    },
    [parentMessage, replyMutation]
  );

  const handleTyping = useCallback(() => {
    // Typing indicator
  }, []);

  const handleMessagePress = useCallback((message: Message) => {
    console.log("Thread message pressed:", message.id);
  }, []);

  const handleReactionPress = useCallback(
    (message: Message, emoji: string) => {
      console.log("Thread reaction pressed:", message.id, emoji);
    },
    []
  );

  if (!parentMessage) {
    return null;
  }

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-background">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View className="flex-row items-center border-b border-border px-4 py-3">
            <Text className="flex-1 text-lg font-semibold text-foreground">
              Thread
            </Text>
            <Pressable
              className="h-8 w-8 items-center justify-center rounded-full active:bg-muted"
              onPress={onClose}
            >
              <FontAwesome name="times" size={18} color={Colors.foreground} />
            </Pressable>
          </View>

          {/* Parent Message */}
          <View className="border-b border-border px-4 py-3">
            <MessageItem
              message={parentMessage}
              isOwn={parentMessage.sender_id === user?.id}
              showAvatar={true}
              showTimestamp={true}
              isInThread={true}
              onPress={() => {}}
              onLongPress={() => {}}
              onThreadPress={() => {}}
              onReactionPress={(emoji) => handleReactionPress(parentMessage, emoji)}
            />
          </View>

          {/* Reply count */}
          <View className="flex-row items-center border-b border-border px-4 py-2">
            <Text className="text-sm font-medium text-muted-foreground">
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </Text>
          </View>

          {/* Replies */}
          {threadLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : replies.length === 0 ? (
            <View className="flex-1 items-center justify-center px-4">
              <FontAwesome name="reply" size={40} color="#d1d5db" />
              <Text className="mt-4 text-lg font-medium text-foreground">
                No replies yet
              </Text>
              <Text className="mt-1 text-center text-muted-foreground">
                Be the first to reply to this message
              </Text>
            </View>
          ) : (
            <MessageList
              messages={replies}
              threadId={parentMessage.id}
              onMessagePress={handleMessagePress}
              onThreadPress={() => {}}
              onReactionPress={handleReactionPress}
              onLoadMore={() => {}}
              isLoadingMore={false}
              hasMore={false}
            />
          )}

          {/* Reply Input */}
          <MessageInput
            threadId={parentMessage.id}
            placeholder="Reply in thread..."
            onSend={handleSend}
            onTyping={handleTyping}
            disabled={replyMutation.isPending}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
