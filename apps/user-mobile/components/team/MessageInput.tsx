import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { Ionicons } from "@expo/vector-icons";

import { MentionAutocomplete } from "./MentionAutocomplete";
import { AttachmentPreview, PendingAttachment } from "./AttachmentPreview";
import { WorkspaceMember, getMemberDisplayName, Attachment } from "@/lib/types/team";

interface MessageInputProps {
  channelId?: string;
  dmId?: string;
  threadId?: string;
  channelName?: string; // For dynamic placeholder
  placeholder?: string;
  onSend: (content: string, mentions?: string[], attachments?: Attachment[]) => Promise<void>;
  onTyping: () => void;
  onAttachmentPress?: () => void;
  onMicrophonePress?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  // Mention support
  workspaceMembers?: WorkspaceMember[];
  membersLoading?: boolean;
  // Attachment support
  pendingAttachments?: PendingAttachment[];
  onRemoveAttachment?: (id: string) => void;
}

export function MessageInput({
  channelId,
  dmId,
  threadId,
  channelName,
  placeholder,
  onSend,
  onTyping,
  onAttachmentPress,
  onMicrophonePress,
  disabled = false,
  autoFocus = false,
  workspaceMembers = [],
  membersLoading = false,
  pendingAttachments = [],
  onRemoveAttachment,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  // Track mentioned user IDs for the message payload
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);

  // Auto-focus with delay for screen transition
  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const hasContent = content.trim().length > 0;
  const hasAttachments = pendingAttachments.some(a => a.status === "uploaded");
  const canSend = (hasContent || hasAttachments) && !disabled && !isSending;

  // Dynamic placeholder based on context
  const displayPlaceholder = placeholder || (channelName ? `Message #${channelName}` : "Message...");

  // Handle cursor position changes for mention detection
  const handleSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      setCursorPosition(e.nativeEvent.selection.start);
    },
    []
  );

  // Detect @ mentions in text
  const detectMention = useCallback((text: string, cursor: number) => {
    // Look backwards from cursor to find @
    let atIndex = -1;
    for (let i = cursor - 1; i >= 0; i--) {
      const char = text[i];
      if (char === "@") {
        // Check if @ is at start or preceded by whitespace
        if (i === 0 || /\s/.test(text[i - 1])) {
          atIndex = i;
          break;
        }
      }
      // Stop if we hit whitespace (no @ in this word)
      if (/\s/.test(char)) break;
    }

    if (atIndex >= 0) {
      const query = text.slice(atIndex + 1, cursor);
      // Only show if query doesn't contain spaces (single word)
      if (!query.includes(" ")) {
        setShowMentions(true);
        setMentionQuery(query);
        setMentionStartIndex(atIndex);
        return;
      }
    }

    setShowMentions(false);
    setMentionQuery("");
    setMentionStartIndex(-1);
  }, []);

  // Handle mention selection
  const handleMentionSelect = useCallback(
    (member: WorkspaceMember) => {
      const displayName = getMemberDisplayName(member);
      const mentionText = `@${displayName} `;

      // Replace the @query with the full mention
      const before = content.slice(0, mentionStartIndex);
      const after = content.slice(cursorPosition);
      const newContent = before + mentionText + after;

      setContent(newContent);
      setShowMentions(false);
      setMentionQuery("");
      setMentionStartIndex(-1);

      // Track the mentioned user ID
      if (!mentionedUserIds.includes(member.user_id)) {
        setMentionedUserIds((prev) => [...prev, member.user_id]);
      }

      // Focus back on input
      inputRef.current?.focus();
    },
    [content, mentionStartIndex, cursorPosition, mentionedUserIds]
  );

  // Close mention popup
  const handleCloseMentions = useCallback(() => {
    setShowMentions(false);
    setMentionQuery("");
    setMentionStartIndex(-1);
  }, []);

  // Open mention popup manually (@ button)
  const handleMentionButtonPress = useCallback(() => {
    // Insert @ at cursor and show popup
    const before = content.slice(0, cursorPosition);
    const after = content.slice(cursorPosition);
    const newContent = before + "@" + after;
    setContent(newContent);
    setShowMentions(true);
    setMentionQuery("");
    setMentionStartIndex(cursorPosition);
    inputRef.current?.focus();
  }, [content, cursorPosition]);

  const handleChangeText = useCallback(
    (text: string) => {
      setContent(text);

      // Detect mentions after a small delay to let cursor position update
      setTimeout(() => {
        // Use the new cursor position (text length if typing at end)
        const newCursor = text.length;
        detectMention(text, newCursor);
      }, 0);

      // Debounce typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        onTyping();
      }, 300);
    },
    [onTyping, detectMention]
  );

  const handleSend = useCallback(async () => {
    if (!canSend) return;

    const messageContent = content.trim();
    const mentions = mentionedUserIds.length > 0 ? mentionedUserIds : undefined;
    const uploadedAttachments = pendingAttachments
      .filter((a) => a.status === "uploaded" && a.attachment)
      .map((a) => a.attachment!);

    setContent("");
    setMentionedUserIds([]);
    setIsSending(true);

    try {
      await onSend(
        messageContent,
        mentions,
        uploadedAttachments.length > 0 ? uploadedAttachments : undefined
      );
    } catch (error) {
      // Restore content on error
      setContent(messageContent);
      setMentionedUserIds(mentions || []);
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  }, [content, canSend, onSend, mentionedUserIds, pendingAttachments]);

  const handleAttachmentPress = useCallback(() => {
    onAttachmentPress?.();
  }, [onAttachmentPress]);

  const handleMicrophonePress = useCallback(() => {
    onMicrophonePress?.();
  }, [onMicrophonePress]);

  const textInput = (
    <TextInput
      ref={inputRef}
      className="max-h-40 text-base text-foreground"
      placeholder={displayPlaceholder}
      placeholderTextColor="#9ca3af"
      value={content}
      onChangeText={handleChangeText}
      onSelectionChange={handleSelectionChange}
      multiline
      editable={!disabled}
      returnKeyType="default"
      blurOnSubmit={false}
      textAlignVertical="center"
    />
  );

  const actionButtons = (
    <View className="flex-row items-center justify-between pt-1">
        {/* Left side action buttons */}
        <View className="flex-row items-center">
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full active:bg-gray-100"
            onPress={handleAttachmentPress}
            disabled={disabled}
          >
            <Ionicons
              name="add"
              size={22}
              color={disabled ? "#d1d5db" : "#64748b"}
            />
          </Pressable>
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full active:bg-gray-100"
            disabled={disabled}
          >
            <Ionicons
              name="text"
              size={18}
              color={disabled ? "#d1d5db" : "#64748b"}
            />
          </Pressable>
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full active:bg-gray-100"
            disabled={disabled}
          >
            <Ionicons
              name="happy-outline"
              size={20}
              color={disabled ? "#d1d5db" : "#64748b"}
            />
          </Pressable>
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full active:bg-gray-100"
            onPress={handleMentionButtonPress}
            disabled={disabled}
          >
            <Ionicons
              name="at"
              size={20}
              color={disabled ? "#d1d5db" : showMentions ? "#0ea5e9" : "#64748b"}
            />
          </Pressable>
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full active:bg-gray-100"
            disabled={disabled}
          >
            <Ionicons
              name="create-outline"
              size={20}
              color={disabled ? "#d1d5db" : "#64748b"}
            />
          </Pressable>
        </View>

        {/* Send button - always visible */}
        <Pressable
          className="h-9 w-9 items-center justify-center rounded-full active:bg-gray-100"
          onPress={handleSend}
          disabled={!canSend}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#0ea5e9" />
          ) : (
            <Ionicons
              name={canSend ? "send" : "send-outline"}
              size={canSend ? 22 : 20}
              color={canSend ? "#0ea5e9" : "#d1d5db"}
            />
          )}
        </Pressable>
    </View>
  );

  const inputContent = (
    <View className="relative">
      {/* Mention autocomplete dropdown - positioned above input */}
      <MentionAutocomplete
        query={mentionQuery}
        members={workspaceMembers}
        isLoading={membersLoading}
        onSelect={handleMentionSelect}
        onClose={handleCloseMentions}
        visible={showMentions}
      />

      {/* Attachment previews */}
      {pendingAttachments.length > 0 && (
        <AttachmentPreview
          attachments={pendingAttachments}
          onRemove={onRemoveAttachment}
        />
      )}

      {/* Text input */}
      <View className="min-h-[44px] justify-center px-2">
        {textInput}
      </View>
      {/* Action buttons */}
      {actionButtons}
    </View>
  );

  return (
    <View
      className="px-4"
      style={{ paddingTop: 8, paddingBottom: 8 + insets.bottom }}
    >
      {Platform.OS === "ios" ? (
        <GlassView
          style={{
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 8,
            overflow: "hidden",
          }}
        >
          {inputContent}
        </GlassView>
      ) : (
        <View className="rounded-2xl bg-gray-100 px-3 py-2">
          {inputContent}
        </View>
      )}
    </View>
  );
}
