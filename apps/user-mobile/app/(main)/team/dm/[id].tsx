import { useCallback, useLayoutEffect } from "react";
import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";

import { Colors } from "@/constants/Colors";
import {
  useDMConversation,
  useDMMessages,
  useSendDMMessage,
  useToggleMuteDM,
  useWorkspaceMembers,
} from "@/lib/hooks/useTeam";
import { useDMSubscription, useTeam } from "@/providers/team-provider";
import { Message, getMemberDisplayName, Attachment } from "@/lib/types/team";
import { MessageList } from "@/components/team/MessageList";
import { MessageInput } from "@/components/team/MessageInput";
import { PresenceIndicator } from "@/components/team/PresenceIndicator";
import { useFileAttachments } from "@/lib/hooks/useFileAttachments";

export default function DMViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Hide parent header
  useLayoutEffect(() => {
    navigation.getParent()?.getParent()?.setOptions({ headerShown: false });
    return () => {
      navigation.getParent()?.getParent()?.setOptions({ headerShown: true });
    };
  }, [navigation]);

  // Subscribe to real-time updates
  useDMSubscription(id);

  // Typing indicator
  const { sendTyping, getTypingIndicator } = useTeam();
  const typingText = id ? getTypingIndicator(id) : "";

  // Fetch DM and messages
  const { data: dm, isLoading: dmLoading } = useDMConversation(id);
  const {
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDMMessages(id, { limit: 50 });

  // Mutations
  const sendMessageMutation = useSendDMMessage();
  const toggleMuteMutation = useToggleMuteDM();

  // Workspace members for @mentions
  const { data: membersData, isLoading: membersLoading } = useWorkspaceMembers();
  const workspaceMembers = membersData?.members || [];

  // File attachments
  const {
    pendingAttachments,
    showPicker,
    removeAttachment,
    clearAttachments,
  } = useFileAttachments();

  const participant = dm?.participant;

  // Flatten paginated messages
  const messages =
    messagesData?.pages.flatMap((page) => page.messages).reverse() || [];

  const isLoading = dmLoading || messagesLoading;

  // Handlers
  const handleBack = () => {
    router.back();
  };

  const handleSend = useCallback(
    async (content: string, mentions?: string[], attachments?: Attachment[]) => {
      if (!id) return;

      // Allow sending if there's content OR attachments
      if (!content.trim() && (!attachments || attachments.length === 0)) return;

      await sendMessageMutation.mutateAsync({
        dmId: id,
        data: {
          content: content.trim(),
          mentions,
          attachments: attachments?.map((a) => ({
            type: a.type,
            url: a.url,
            name: a.name,
            size: a.size,
          })),
        },
      });

      // Clear attachments after successful send
      clearAttachments();
    },
    [id, sendMessageMutation, clearAttachments]
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleMuteToggle = useCallback(() => {
    if (!id) return;
    toggleMuteMutation.mutate({ id, isMuted: dm?.is_muted || false });
  }, [id, dm, toggleMuteMutation]);

  const handleMessagePress = useCallback((message: Message) => {
    console.log("Message pressed:", message.id);
  }, []);

  const handleThreadPress = useCallback((message: Message) => {
    console.log("Thread pressed:", message.id);
  }, []);

  const handleReactionPress = useCallback(
    (message: Message, emoji: string) => {
      console.log("Reaction pressed:", message.id, emoji);
    },
    []
  );

  const handleTyping = useCallback(() => {
    if (id) {
      sendTyping(id, true);
    }
  }, [id, sendTyping]);

  const handleAttachmentPress = useCallback(() => {
    showPicker();
  }, [showPicker]);

  const handleMicrophonePress = useCallback(() => {
    // TODO: Start voice recording
    console.log("Start voice recording");
  }, []);

  const handleSettingsPress = useCallback(() => {
    // TODO: Show DM settings
    console.log("Show DM settings");
  }, []);

  if (!id) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-muted-foreground">Conversation not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? -20 : 0}
      >
        {/* Header */}
        <View className="border-b border-border bg-background">
          <View className="flex-row items-center px-4 py-3">
            {/* Back Button */}
            <Pressable
              className="mr-3 h-8 w-8 items-center justify-center rounded-full active:bg-muted"
              onPress={handleBack}
            >
              <Ionicons name="chevron-back" size={24} color="#0f172a" />
            </Pressable>

            {participant ? (
              <>
                {/* Avatar with presence - rounded square */}
                <View className="relative">
                  {participant.user.avatar_url ? (
                    <Image
                      source={{ uri: participant.user.avatar_url }}
                      className="h-10 w-10 rounded-lg"
                    />
                  ) : (
                    <View className="h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Text className="text-lg font-semibold text-muted-foreground">
                        {(participant.user.name || "U").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {participant.presence && (
                    <View className="absolute -bottom-0.5 -right-0.5">
                      <PresenceIndicator
                        status={participant.presence.status}
                        size="sm"
                      />
                    </View>
                  )}
                </View>

                {/* User Info */}
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    {getMemberDisplayName(participant)}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {participant.presence?.status_message ||
                      (participant.presence?.status === "online"
                        ? "Online"
                        : participant.presence?.status === "away"
                        ? "Away"
                        : participant.presence?.status === "dnd"
                        ? "Do Not Disturb"
                        : "Offline")}
                  </Text>
                </View>

                {/* Action Icons */}
                <View className="flex-row items-center gap-1">
                  {/* Mute Toggle */}
                  <Pressable
                    className="h-9 w-9 items-center justify-center rounded-full active:bg-muted"
                    onPress={handleMuteToggle}
                  >
                    <Ionicons
                      name={dm?.is_muted ? "notifications-off-outline" : "notifications-outline"}
                      size={22}
                      color="#64748b"
                    />
                  </Pressable>

                  {/* Settings */}
                  <Pressable
                    className="h-9 w-9 items-center justify-center rounded-full active:bg-muted"
                    onPress={handleSettingsPress}
                  >
                    <Ionicons name="options-outline" size={22} color="#64748b" />
                  </Pressable>
                </View>
              </>
            ) : (
              isLoading && (
                <ActivityIndicator size="small" color={Colors.primary} />
              )
            )}
          </View>
        </View>

        {/* Messages */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <MessageList
            messages={messages}
            dmId={id}
            onMessagePress={handleMessagePress}
            onThreadPress={handleThreadPress}
            onReactionPress={handleReactionPress}
            onLoadMore={handleLoadMore}
            isLoadingMore={isFetchingNextPage}
            hasMore={hasNextPage || false}
          />
        )}

        {/* Typing Indicator */}
        {typingText ? (
          <View className="px-4 py-1">
            <Text className="text-sm italic text-muted-foreground">
              {typingText}
            </Text>
          </View>
        ) : null}

        {/* Message Input */}
        <MessageInput
          dmId={id}
          placeholder={`Message ${
            participant ? getMemberDisplayName(participant) : "..."
          }`}
          onSend={handleSend}
          onTyping={handleTyping}
          onAttachmentPress={handleAttachmentPress}
          onMicrophonePress={handleMicrophonePress}
          disabled={sendMessageMutation.isPending}
          workspaceMembers={workspaceMembers}
          membersLoading={membersLoading}
          pendingAttachments={pendingAttachments}
          onRemoveAttachment={removeAttachment}
        />
      </KeyboardAvoidingView>
    </View>
  );
}
