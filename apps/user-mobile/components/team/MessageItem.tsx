import { memo, useState } from "react";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";
import { Message, formatMessageTimestamp, Attachment } from "@/lib/types/team";
import { ReactionBar } from "./ReactionBar";
import { PDFViewer } from "./PDFViewer";
import { ImageViewer } from "./ImageViewer";

// Simple markdown parser for message content
function parseMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Pattern order matters - check longer patterns first
  const patterns = [
    { regex: /\*\*(.+?)\*\*/g, style: styles.bold },          // **bold**
    { regex: /\*(.+?)\*/g, style: styles.italic },            // *italic*
    { regex: /_(.+?)_/g, style: styles.italic },              // _italic_
    { regex: /`(.+?)`/g, style: styles.code },                // `code`
    { regex: /~~(.+?)~~/g, style: styles.strikethrough },     // ~~strikethrough~~
  ];

  // Combined regex to find any markdown or @mentions
  const combinedRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`|~~[^~]+~~|@\w+)/g;

  const matches = text.split(combinedRegex);

  for (const part of matches) {
    if (!part) continue;

    // Check for @mention first
    if (part.startsWith("@") && /^@\w+$/.test(part)) {
      parts.push(
        <Text key={key++} style={styles.mention}>
          {part}
        </Text>
      );
      continue;
    }

    let matched = false;
    for (const { regex, style } of patterns) {
      regex.lastIndex = 0;
      const match = regex.exec(part);
      if (match && match[0] === part) {
        parts.push(
          <Text key={key++} style={style}>
            {match[1]}
          </Text>
        );
        matched = true;
        break;
      }
    }

    if (!matched) {
      parts.push(<Text key={key++}>{part}</Text>);
    }
  }

  return parts;
}

const styles = StyleSheet.create({
  bold: { fontWeight: "700" },
  italic: { fontStyle: "italic" },
  code: {
    fontFamily: "monospace",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  strikethrough: { textDecorationLine: "line-through" },
  mention: {
    backgroundColor: "rgba(14, 165, 233, 0.15)",
    color: "#0284c7",
    fontWeight: "500",
    borderRadius: 4,
    paddingHorizontal: 2,
  },
});

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  showTimestamp: boolean;
  isInThread?: boolean;
  isApp?: boolean; // For bot/integration messages - shows APP badge
  onPress: () => void;
  onLongPress: () => void;
  onThreadPress: () => void;
  onReactionPress: (emoji: string) => void;
}

function MessageItemComponent({
  message,
  isOwn,
  showAvatar,
  showTimestamp,
  isInThread = false,
  isApp = false,
  onPress,
  onLongPress,
  onThreadPress,
  onReactionPress,
}: MessageItemProps) {
  // State for PDF and image viewers
  const [selectedPdf, setSelectedPdf] = useState<Attachment | null>(null);
  const [selectedImage, setSelectedImage] = useState<Attachment | null>(null);

  const hasReactions = message.reactions && message.reactions.length > 0;
  const hasThread = message.reply_count > 0 && !isInThread;
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const isEdited = message.is_edited;
  const isPinned = message.is_pinned;
  const isSystem = message.type === "system";

  const handlePdfPress = (attachment: Attachment) => {
    setSelectedPdf(attachment);
  };

  const handleClosePdf = () => {
    setSelectedPdf(null);
  };

  const isPdf = (attachment: Attachment) =>
    attachment.mime_type === "application/pdf" ||
    attachment.name?.toLowerCase().endsWith(".pdf");

  // System messages render differently
  if (isSystem) {
    return (
      <View className="my-2 flex-row items-center justify-center">
        <Text className="text-sm italic text-muted-foreground">
          {message.content}
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      className={`flex-row px-4 py-1 ${showAvatar ? "pt-3" : ""}`}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {/* Avatar - rounded square, 40x40 */}
      <View className="mr-3 w-10">
        {showAvatar && (
          <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {message.sender?.avatar_url ? (
              <Image
                source={{ uri: message.sender.avatar_url }}
                className="h-10 w-10 rounded-lg"
              />
            ) : (
              <Text className="text-lg font-semibold text-muted-foreground">
                {(message.sender?.name || "U").charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Message Content */}
      <View className="flex-1">
        {/* Header row: Name + APP badge + Timestamp */}
        {showAvatar && (
          <View className="mb-0.5 flex-row items-center">
            <Text className="font-semibold text-foreground">
              {message.sender?.name || "Unknown"}
            </Text>
            {isApp && (
              <View className="ml-2 rounded bg-gray-200 px-1.5 py-0.5">
                <Text className="text-xs font-medium text-gray-600">APP</Text>
              </View>
            )}
            <Text className="ml-2 text-sm text-muted-foreground">
              {formatMessageTimestamp(message.created_at)}
            </Text>
            {isPinned && (
              <View className="ml-2 flex-row items-center">
                <Ionicons name="pin" size={12} color={Colors.primary} />
              </View>
            )}
          </View>
        )}

        {/* Message text - no bubble, flat design with markdown */}
        <Text className="text-foreground leading-5">
          {parseMarkdown(message.content)}
          {isEdited && (
            <Text className="text-xs text-muted-foreground"> (edited)</Text>
          )}
        </Text>

        {/* Attachments */}
        {hasAttachments && (
          <View className="mt-2">
            {message.attachments.map((attachment) => (
              <View
                key={attachment.id}
                className="mb-2 overflow-hidden rounded-lg"
              >
                {attachment.type === "image" ? (
                  <Pressable onPress={() => setSelectedImage(attachment)}>
                    <Image
                      source={{ uri: attachment.thumbnail || attachment.url }}
                      style={{ height: 192, width: '100%', borderRadius: 8 }}
                      resizeMode="cover"
                    />
                  </Pressable>
                ) : isPdf(attachment) ? (
                  <Pressable
                    className="flex-row items-center rounded-lg bg-muted p-3"
                    onPress={() => handlePdfPress(attachment)}
                  >
                    <Ionicons
                      name="document-text"
                      size={20}
                      color={Colors.primary}
                    />
                    <View className="ml-3 flex-1">
                      <Text
                        className="font-medium text-foreground"
                        numberOfLines={1}
                      >
                        {attachment.name}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.size)} • PDF
                      </Text>
                    </View>
                    <View className="rounded bg-primary/10 px-2 py-1">
                      <Text className="text-xs font-medium text-primary">View</Text>
                    </View>
                  </Pressable>
                ) : (
                  <View className="flex-row items-center rounded-lg bg-muted p-3">
                    <Ionicons
                      name="document-outline"
                      size={20}
                      color={Colors.primary}
                    />
                    <View className="ml-3 flex-1">
                      <Text
                        className="font-medium text-foreground"
                        numberOfLines={1}
                      >
                        {attachment.name}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.size)}
                      </Text>
                    </View>
                    <Ionicons
                      name="download-outline"
                      size={18}
                      color={Colors.primary}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* PDF Viewer Modal */}
        {selectedPdf && (
          <PDFViewer
            url={selectedPdf.url}
            filename={selectedPdf.name}
            visible={true}
            onClose={handleClosePdf}
          />
        )}

        {/* Image Viewer Modal */}
        {selectedImage && (
          <ImageViewer
            url={selectedImage.url}
            visible={true}
            onClose={() => setSelectedImage(null)}
          />
        )}

        {/* Reactions */}
        {hasReactions && (
          <ReactionBar
            reactions={message.reactions}
            onReactionPress={onReactionPress}
            onAddReaction={() => onReactionPress("")}
          />
        )}

        {/* Thread indicator */}
        {hasThread && (
          <Pressable
            className="mt-2 flex-row items-center"
            onPress={onThreadPress}
          >
            <Ionicons name="chatbubble-outline" size={14} color={Colors.primary} />
            <Text className="ml-2 text-sm font-medium text-primary">
              {message.reply_count} {message.reply_count === 1 ? "reply" : "replies"}
            </Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

// Format file size helper
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Memoize to prevent unnecessary re-renders
export const MessageItem = memo(MessageItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.is_edited === nextProps.message.is_edited &&
    prevProps.message.is_pinned === nextProps.message.is_pinned &&
    prevProps.message.reply_count === nextProps.message.reply_count &&
    prevProps.message.reactions === nextProps.message.reactions &&
    prevProps.isOwn === nextProps.isOwn &&
    prevProps.showAvatar === nextProps.showAvatar &&
    prevProps.showTimestamp === nextProps.showTimestamp &&
    prevProps.isApp === nextProps.isApp
  );
});
