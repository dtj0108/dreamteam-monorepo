import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { Colors } from "@/constants/Colors";
import { useAgentDetail, useAgentConversations } from "@/lib/hooks/useAgentsData";
import { useAgentChat, ChatMessage } from "@/lib/hooks/useAgentChat";
import { getConversation } from "@/lib/api/agents";
import { useAgentVoiceChat } from "@/lib/hooks/useAgentVoiceChat";
import { useWorkspace } from "@/providers/workspace-provider";
import {
  ChatMessageBubble,
  ConversationSheet,
  AgentChatInput,
  TypingIndicator,
  ThinkingText,
} from "@/components/agents";
import { VoiceOverlay } from "@/components/voice";

export default function AgentChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);

  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id || "";

  // Fetch agent details
  const { data: agentData, isLoading: agentLoading, error: agentError } = useAgentDetail(id);
  const agent = agentData?.agent;

  // Fetch conversation history
  const { data: conversations, isLoading: conversationsLoading } =
    useAgentConversations(id);

  // Chat state - use localAgentId if available
  const chatAgentId = agentData?.localAgent?.id || id || "";

  const {
    messages,
    status,
    isStreaming,
    usage,
    sendMessage,
    stopGeneration,
    clearMessages,
    conversationId,
    setMessages,
    setConversationId,
  } = useAgentChat({
    agentId: chatAgentId,
    workspaceId,
    onConversationCreated: (newConvId) => {
      console.log("New conversation created:", newConvId);
    },
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  // Voice chat state
  const voiceChat = useAgentVoiceChat({
    agentId: chatAgentId,
    instructions: agent?.system_prompt,
    onTranscriptUpdate: (userTranscript, assistantTranscript) => {
      // Could sync transcripts to message history here if desired
      console.log("[VoiceChat] Transcripts updated");
    },
    onError: (err) => {
      Alert.alert("Voice Error", err.message);
    },
    onSessionEnd: () => {
      setIsVoiceMode(false);
    },
  });

  // Handlers
  const handleBack = () => {
    router.back();
  };

  const handleSend = useCallback(
    async (content: string) => {
      await sendMessage(content);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    [sendMessage]
  );

  const handleNewChat = useCallback(() => {
    Alert.alert(
      "New Conversation",
      "Start a new conversation with this agent?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start New",
          onPress: clearMessages,
        },
      ]
    );
  }, [clearMessages]);

  const handleSelectConversation = useCallback(
    async (selectedConversationId: string) => {
      try {
        const conversation = await getConversation(selectedConversationId);
        const loadedMessages: ChatMessage[] = (conversation.messages || []).map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          parts: msg.parts
            ? msg.parts.map((p) => {
                if (p.type === "text") {
                  return { type: "text" as const, text: p.text || "" };
                } else if (p.type === "reasoning") {
                  return { type: "reasoning" as const, reasoning: p.reasoning || "" };
                } else if (p.type === "tool-invocation" && p.toolInvocation) {
                  return {
                    type: "tool-call" as const,
                    toolCallId: p.toolInvocation.toolCallId,
                    toolName: p.toolInvocation.toolName,
                    args: p.toolInvocation.args,
                    result: p.toolInvocation.result,
                    state: p.toolInvocation.state === "result" ? "completed" as const : "pending" as const,
                  };
                }
                return { type: "text" as const, text: msg.content };
              })
            : [{ type: "text" as const, text: msg.content }],
          createdAt: new Date(msg.created_at),
        }));
        setMessages(loadedMessages);
        setConversationId(selectedConversationId);
        setShowHistory(false);
      } catch (err) {
        Alert.alert("Error", "Failed to load conversation");
      }
    },
    [setMessages, setConversationId]
  );

  // Voice mode handlers
  const handleVoiceToggle = useCallback(async () => {
    if (isVoiceMode) {
      // End voice session
      voiceChat.endSession();
      setIsVoiceMode(false);
    } else {
      // Start voice session
      setIsVoiceMode(true);
      try {
        await voiceChat.startSession();
      } catch (err) {
        setIsVoiceMode(false);
        // Error already shown via onError callback
      }
    }
  }, [isVoiceMode, voiceChat]);

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const isLastMessage = index === messages.length - 1;
      return (
        <ChatMessageBubble
          message={item}
          agentName={agent?.name}
          department={agent?.department?.name}
          isStreaming={isLastMessage && isStreaming && item.role === "assistant"}
        />
      );
    },
    [agent, messages, isStreaming]
  );

  if (!id) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50">
        <Text className="text-muted-foreground">Agent not found</Text>
      </View>
    );
  }

  // Glass header content
  const headerContent = (
    <View
      className="flex-row items-center px-4 py-3"
      style={{ paddingTop: insets.top + 8 }}
    >
      {/* Back button */}
      <Pressable
        onPress={handleBack}
        className="mr-3 h-10 w-10 items-center justify-center rounded-full active:opacity-70"
        style={{ backgroundColor: "rgba(0,0,0,0.05)" }}
      >
        <Ionicons name="chevron-back" size={22} color={Colors.foreground} />
      </Pressable>

      {/* Agent info */}
      {agentLoading ? (
        <ActivityIndicator size="small" color={Colors.primary} />
      ) : agentError ? (
        <Text className="text-red-500">Error loading agent</Text>
      ) : agent ? (
        <>
          {/* Avatar */}
          <View
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: Colors.primary + "15" }}
          >
            {agent.avatar_url ? (
              <Image
                source={{ uri: agent.avatar_url }}
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <Text className="text-lg">✨</Text>
            )}
          </View>

          {/* Name and status */}
          <View className="ml-3 flex-1">
            <Text className="text-base font-semibold text-foreground">
              {agent.name}
            </Text>
            <View className="flex-row items-center">
              {status === "idle" && (
                <>
                  <View className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <Text className="ml-1.5 text-xs text-gray-500">Online</Text>
                </>
              )}
              {status === "connecting" && (
                <>
                  <View className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <Text className="ml-1.5 text-xs text-amber-600">
                    Connecting...
                  </Text>
                </>
              )}
              {status === "streaming" && (
                <View className="flex-row items-center">
                  <TypingIndicator size="small" color={Colors.primary} />
                  <ThinkingText
                    agentName={agent?.name}
                    department={agent?.department?.name}
                    color={Colors.primary}
                  />
                </View>
              )}
            </View>
          </View>
        </>
      ) : (
        <Text className="text-gray-400">Loading...</Text>
      )}

      {/* Action buttons */}
      <View className="flex-row items-center gap-1">
        {/* New chat */}
        <Pressable
          onPress={handleNewChat}
          className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
          style={{ backgroundColor: "rgba(0,0,0,0.05)" }}
        >
          <Ionicons name="add" size={22} color={Colors.foreground} />
        </Pressable>

        {/* History */}
        <Pressable
          onPress={() => setShowHistory(true)}
          className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
          style={{ backgroundColor: "rgba(0,0,0,0.05)" }}
        >
          <Ionicons
            name="time-outline"
            size={20}
            color={Colors.foreground}
          />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-neutral-50">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Glass Header */}
        {Platform.OS === "ios" ? (
          <GlassView
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10,
            }}
          >
            {headerContent}
          </GlassView>
        ) : (
          <View
            className="absolute left-0 right-0 top-0 z-10 bg-white/95"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 2,
            }}
          >
            {headerContent}
          </View>
        )}

        {/* Messages or Empty State */}
        {messages.length === 0 ? (
          <View
            className="flex-1 items-center justify-center px-8"
            style={{ paddingTop: insets.top + 80 }}
          >
            {agentLoading || (!agent && !agentError) ? (
              // Show loading state while agent data loads
              <>
                <LottieView
                  source={require("@/ai-sphere-animation.json")}
                  autoPlay
                  loop
                  style={{ width: 200, height: 200 }}
                />
                <ActivityIndicator
                  size="small"
                  color={Colors.primary}
                  style={{ marginTop: 24 }}
                />
              </>
            ) : agentError ? (
              // Show error state if API failed
              <>
                <Ionicons name="warning-outline" size={48} color="#ef4444" />
                <Text className="mt-4 text-lg font-medium text-red-500">
                  Failed to load agent
                </Text>
                <Pressable
                  onPress={() => router.back()}
                  className="mt-4 rounded-full bg-primary px-6 py-2"
                >
                  <Text className="text-white font-medium">Go Back</Text>
                </Pressable>
              </>
            ) : (
              <>
                {/* Agent Avatar */}
                {agent?.avatar_url ? (
                  <Image
                    source={{ uri: agent.avatar_url }}
                    className="h-24 w-24 rounded-full"
                  />
                ) : (
                  <LottieView
                    source={require("@/ai-sphere-animation.json")}
                    autoPlay
                    loop
                    style={{ width: 200, height: 200 }}
                  />
                )}

                {/* Agent Name */}
                <Text className="mt-6 text-2xl font-semibold text-foreground">
                  {agent?.name || "AI Assistant"}
                </Text>

                {/* Description */}
                {(agent?.user_description || agent?.description) && (
                  <Text className="mt-2 text-center leading-relaxed text-gray-500">
                    {agent.user_description || agent.description}
                  </Text>
                )}
              </>
            )}
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            extraData={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingTop: insets.top + 80,
              paddingHorizontal: 16,
              paddingBottom: 16,
            }}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
          />
        )}

        {/* Input */}
        <AgentChatInput
          agentName={agent?.name}
          onSend={handleSend}
          onStop={stopGeneration}
          isStreaming={isStreaming}
          showVoiceToggle={true}
          isVoiceMode={isVoiceMode}
          onVoiceToggle={handleVoiceToggle}
        />
      </KeyboardAvoidingView>

      {/* Voice Chat Overlay */}
      <VoiceOverlay
        visible={isVoiceMode && voiceChat.isConnected}
        agentName={agent?.name}
        agentAvatar={agent?.avatar_url || undefined}
        status={voiceChat.status}
        inputLevel={voiceChat.inputLevel}
        outputLevel={voiceChat.outputLevel}
        userTranscript={voiceChat.userTranscript}
        assistantTranscript={voiceChat.assistantTranscript}
        isMuted={voiceChat.isMuted}
        voice={voiceChat.voice}
        onToggleMute={voiceChat.toggleMute}
        onEndCall={handleVoiceToggle}
        onInterrupt={voiceChat.interrupt}
        onChangeVoice={voiceChat.setVoice}
      />

      {/* Conversation History Sheet */}
      <ConversationSheet
        visible={showHistory}
        onClose={() => setShowHistory(false)}
        conversations={conversations || []}
        isLoading={conversationsLoading}
        onSelectConversation={handleSelectConversation}
        onNewConversation={() => {
          clearMessages();
          setShowHistory(false);
        }}
        currentConversationId={conversationId}
      />
    </View>
  );
}
