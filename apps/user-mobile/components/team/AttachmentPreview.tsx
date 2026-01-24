import { View, Text, Image, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";
import { Attachment } from "@/lib/types/team";

export interface PendingAttachment {
  id: string;
  uri: string;
  name: string;
  size: number;
  mimeType: string;
  status: "uploading" | "uploaded" | "error";
  progress?: number;
  error?: string;
  attachment?: Attachment; // The uploaded attachment data from server
}

interface AttachmentPreviewProps {
  attachments: PendingAttachment[];
  onRemove?: (id: string) => void;
}

export function AttachmentPreview({ attachments, onRemove }: AttachmentPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="px-2 py-2"
      contentContainerStyle={{ gap: 8 }}
    >
      {attachments.map((attachment) => (
        <AttachmentItem
          key={attachment.id}
          attachment={attachment}
          onRemove={onRemove}
        />
      ))}
    </ScrollView>
  );
}

interface AttachmentItemProps {
  attachment: PendingAttachment;
  onRemove?: (id: string) => void;
}

function AttachmentItem({ attachment, onRemove }: AttachmentItemProps) {
  const isImage = attachment.mimeType.startsWith("image/");
  const isPDF = attachment.mimeType === "application/pdf";
  const isUploading = attachment.status === "uploading";
  const hasError = attachment.status === "error";

  return (
    <View className="relative">
      {/* Preview container */}
      <View
        className={`h-20 w-20 rounded-lg overflow-hidden border ${
          hasError ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-100"
        }`}
      >
        {isImage ? (
          <Image
            source={{ uri: attachment.uri }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : isPDF ? (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name="document-text" size={32} color={Colors.primary} />
            <Text className="text-xs text-muted-foreground mt-1" numberOfLines={1}>
              PDF
            </Text>
          </View>
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name="document-outline" size={32} color="#64748b" />
            <Text className="text-xs text-muted-foreground mt-1 px-1" numberOfLines={1}>
              {getFileExtension(attachment.name)}
            </Text>
          </View>
        )}

        {/* Uploading overlay */}
        {isUploading && (
          <View className="absolute inset-0 bg-black/40 items-center justify-center">
            <ActivityIndicator size="small" color="white" />
            {attachment.progress !== undefined && (
              <Text className="text-white text-xs mt-1">
                {Math.round(attachment.progress * 100)}%
              </Text>
            )}
          </View>
        )}

        {/* Error overlay */}
        {hasError && (
          <View className="absolute inset-0 bg-red-500/40 items-center justify-center">
            <Ionicons name="alert-circle" size={24} color="white" />
          </View>
        )}
      </View>

      {/* Remove button */}
      {onRemove && (
        <Pressable
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gray-800 items-center justify-center"
          onPress={() => onRemove(attachment.id)}
          hitSlop={8}
        >
          <Ionicons name="close" size={14} color="white" />
        </Pressable>
      )}

      {/* File name */}
      <Text
        className="text-xs text-muted-foreground mt-1 w-20"
        numberOfLines={1}
        ellipsizeMode="middle"
      >
        {attachment.name}
      </Text>
    </View>
  );
}

function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  if (parts.length > 1) {
    return parts[parts.length - 1].toUpperCase();
  }
  return "FILE";
}

// Helper to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
