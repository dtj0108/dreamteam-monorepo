import { useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";

import { Colors } from "@/constants/Colors";
import type { ConversationListItem } from "@/lib/types/agents";

interface ConversationSheetProps {
  visible: boolean;
  onClose: () => void;
  conversations: ConversationListItem[];
  isLoading?: boolean;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  currentConversationId?: string;
}

// Skeleton loading card component
function SkeletonCard({ delay = 0 }: { delay?: number }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim, delay]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View className="mx-4 mb-3 flex-row items-center rounded-xl bg-white p-4">
      {/* Icon skeleton */}
      <Animated.View
        style={{ opacity }}
        className="h-10 w-10 rounded-full bg-gray-200"
      />
      {/* Text skeleton */}
      <View className="ml-3 flex-1">
        <Animated.View
          style={{ opacity }}
          className="mb-2 h-4 w-3/4 rounded bg-gray-200"
        />
        <Animated.View
          style={{ opacity }}
          className="h-3 w-1/3 rounded bg-gray-200"
        />
      </View>
    </View>
  );
}

export function ConversationSheet({
  visible,
  onClose,
  conversations,
  isLoading,
  onSelectConversation,
  onNewConversation,
  currentConversationId,
}: ConversationSheetProps) {
  const renderConversationItem = ({ item }: { item: ConversationListItem }) => {
    const isActive = item.id === currentConversationId;

    return (
      <Pressable
        className="mx-4 mb-3 flex-row items-center rounded-xl bg-white p-4 active:scale-[0.98]"
        style={[
          {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 1,
          },
          isActive && {
            borderWidth: 2,
            borderColor: Colors.primary,
            backgroundColor: Colors.primary + "08",
          },
        ]}
        onPress={() => {
          onSelectConversation(item.id);
          onClose();
        }}
      >
        {/* Chat icon */}
        <View
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: isActive ? Colors.primary + "20" : "#f5f5f5" }}
        >
          <Ionicons
            name="chatbubble-outline"
            size={18}
            color={isActive ? Colors.primary : Colors.mutedForeground}
          />
        </View>

        {/* Conversation info */}
        <View className="ml-3 flex-1">
          <Text
            className="font-medium text-foreground"
            numberOfLines={1}
            style={isActive && { color: Colors.primary }}
          >
            {item.title || "Untitled conversation"}
          </Text>
          <Text className="mt-0.5 text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(item.updated_at), {
              addSuffix: true,
            })}
          </Text>
        </View>

        {/* Chevron or checkmark for active */}
        {isActive ? (
          <View
            className="h-6 w-6 items-center justify-center rounded-full"
            style={{ backgroundColor: Colors.primary }}
          >
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        ) : (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={Colors.mutedForeground}
          />
        )}
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="max-h-[70%] rounded-t-3xl bg-neutral-50">
          {/* Drag Handle */}
          <View className="items-center pt-3 pb-1">
            <View className="h-1 w-10 rounded-full bg-gray-300" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3">
            <View className="flex-row items-center">
              <Ionicons
                name="time-outline"
                size={22}
                color={Colors.foreground}
              />
              <Text className="ml-2 text-lg font-semibold text-foreground">
                History
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="h-8 w-8 items-center justify-center rounded-full active:opacity-70"
              style={{ backgroundColor: "rgba(0,0,0,0.05)" }}
            >
              <Ionicons name="close" size={18} color={Colors.mutedForeground} />
            </Pressable>
          </View>

          {/* New conversation button - outlined style */}
          <Pressable
            className="mx-4 mb-4 flex-row items-center justify-center rounded-xl border-2 py-3 active:opacity-70"
            style={{ borderColor: Colors.primary }}
            onPress={() => {
              onNewConversation();
              onClose();
            }}
          >
            <Ionicons name="add" size={18} color={Colors.primary} />
            <Text className="ml-2 font-medium" style={{ color: Colors.primary }}>
              Start New Conversation
            </Text>
          </Pressable>

          {/* Conversations list */}
          {isLoading ? (
            <View className="pb-8">
              <SkeletonCard delay={0} />
              <SkeletonCard delay={100} />
              <SkeletonCard delay={200} />
            </View>
          ) : conversations.length === 0 ? (
            <View className="items-center px-8 py-12">
              <View
                className="mb-4 h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: Colors.primary + "15" }}
              >
                <Ionicons
                  name="chatbubbles-outline"
                  size={32}
                  color={Colors.primary}
                />
              </View>
              <Text className="text-center text-lg font-medium text-foreground">
                No conversations yet
              </Text>
              <Text className="mt-2 text-center text-muted-foreground">
                Start a new conversation to chat with this agent
              </Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={renderConversationItem}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
