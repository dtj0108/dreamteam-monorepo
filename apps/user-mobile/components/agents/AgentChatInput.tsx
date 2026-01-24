import { useState, useCallback, useRef } from "react";
import {
  View,
  TextInput,
  Text,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";

interface AgentChatInputProps {
  agentName?: string;
  placeholder?: string;
  onSend: (content: string) => Promise<void>;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  showVoiceToggle?: boolean;
  isVoiceMode?: boolean;
  onVoiceToggle?: () => void;
}

export function AgentChatInput({
  agentName,
  placeholder,
  onSend,
  onStop,
  isStreaming = false,
  disabled = false,
  showVoiceToggle = true,
  isVoiceMode = false,
  onVoiceToggle,
}: AgentChatInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  const hasContent = content.trim().length > 0;
  const canSend = hasContent && !disabled && !isSending && !isStreaming;

  const displayPlaceholder =
    placeholder || (agentName ? `Message ${agentName}...` : "Send a message...");

  const handleSend = useCallback(async () => {
    if (!canSend) return;

    const messageContent = content.trim();
    setContent("");
    setIsSending(true);

    try {
      await onSend(messageContent);
    } catch (error) {
      setContent(messageContent);
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  }, [content, canSend, onSend]);

  const handleStop = useCallback(() => {
    onStop?.();
  }, [onStop]);

  const inputContent = (
    <View className="flex-row items-end">
      <TextInput
        ref={inputRef}
        className="max-h-32 flex-1 py-2 text-base text-foreground"
        placeholder={displayPlaceholder}
        placeholderTextColor="#9ca3af"
        value={content}
        onChangeText={setContent}
        multiline
        editable={!disabled && !isStreaming && !isVoiceMode}
        returnKeyType="default"
        blurOnSubmit={false}
        textAlignVertical="center"
      />

      {/* Single action button - Speak or Send */}
      <View className="ml-2 pb-1">
        {isStreaming ? (
          // Stop button during streaming
          <Pressable
            onPress={handleStop}
            className="h-8 w-8 items-center justify-center rounded-full bg-red-500 active:opacity-70"
          >
            <Ionicons name="stop" size={14} color="white" />
          </Pressable>
        ) : isSending ? (
          // Loading spinner
          <View className="h-8 w-8 items-center justify-center">
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : hasContent ? (
          // Send button when there's text
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            className="active:opacity-70"
          >
            <Ionicons
              name="arrow-up-circle"
              size={32}
              color={canSend ? Colors.primary : "#d1d5db"}
            />
          </Pressable>
        ) : showVoiceToggle && onVoiceToggle ? (
          // Pill-shaped "Speak" button when empty
          <Pressable
            onPress={onVoiceToggle}
            disabled={disabled}
            className="flex-row items-center rounded-full bg-primary px-4 py-2 active:opacity-70"
          >
            <Ionicons name="mic" size={16} color="white" />
            <Text className="ml-1 font-medium text-white">Speak</Text>
          </Pressable>
        ) : (
          // Fallback send button when voice is disabled
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            className="active:opacity-70"
          >
            <Ionicons
              name="arrow-up-circle"
              size={32}
              color="#d1d5db"
            />
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <View
      className="px-4"
      style={{ paddingTop: 8, paddingBottom: Math.max(4, insets.bottom - 10) }}
    >
      {Platform.OS === "ios" ? (
        <GlassView
          style={{
            borderRadius: 24,
            paddingHorizontal: 16,
            paddingVertical: 8,
            overflow: "hidden",
          }}
        >
          {inputContent}
        </GlassView>
      ) : (
        <View className="rounded-3xl bg-gray-100 px-4 py-2">
          {inputContent}
        </View>
      )}
    </View>
  );
}
