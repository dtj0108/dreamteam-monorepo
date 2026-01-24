import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Platform, ActionSheetIOS, Alert } from "react-native";

import { uploadAttachment } from "../api/team";
import { Attachment, AttachmentType } from "../types/team";
import { PendingAttachment } from "@/components/team/AttachmentPreview";

// Generate unique ID for pending attachments
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Determine attachment type from MIME type
function getAttachmentType(mimeType: string): AttachmentType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "document";
  return "file";
}

// Format file size for display
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

interface UseFileAttachmentsOptions {
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  allowedTypes?: ("image" | "document" | "video" | "audio" | "any")[];
}

interface UseFileAttachmentsReturn {
  pendingAttachments: PendingAttachment[];
  pickImage: () => Promise<void>;
  pickDocument: () => Promise<void>;
  showPicker: () => void;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
  isUploading: boolean;
}

export function useFileAttachments(
  options: UseFileAttachmentsOptions = {}
): UseFileAttachmentsReturn {
  const {
    maxFiles = 10,
    maxFileSize = 25 * 1024 * 1024, // 25MB default
    allowedTypes = ["image", "document", "any"],
  } = options;

  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);

  const isUploading = pendingAttachments.some((a) => a.status === "uploading");

  // Add a new pending attachment and start upload
  const addAttachment = useCallback(
    async (uri: string, name: string, mimeType: string, size: number) => {
      // Check file count
      if (pendingAttachments.length >= maxFiles) {
        Alert.alert("Too many files", `Maximum ${maxFiles} files allowed`);
        return;
      }

      // Check file size
      if (size > maxFileSize) {
        Alert.alert(
          "File too large",
          `Maximum file size is ${formatFileSize(maxFileSize)}`
        );
        return;
      }

      const id = generateId();
      const newAttachment: PendingAttachment = {
        id,
        uri,
        name,
        size,
        mimeType,
        status: "uploading",
        progress: 0,
      };

      setPendingAttachments((prev) => [...prev, newAttachment]);

      try {
        // Upload directly to Supabase Storage
        const response = await uploadAttachment(uri, name, mimeType);

        // Create the attachment object
        const attachment: Attachment = {
          id: response.id,
          type: getAttachmentType(mimeType),
          url: response.url,
          name: response.name,
          size: response.size,
          mime_type: response.mime_type,
          dimensions: response.dimensions,
        };

        // Update status to uploaded
        setPendingAttachments((prev) =>
          prev.map((a) =>
            a.id === id
              ? { ...a, status: "uploaded" as const, attachment, progress: 1 }
              : a
          )
        );
      } catch (error) {
        console.error("Upload failed:", error);
        setPendingAttachments((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: "error" as const,
                  error: error instanceof Error ? error.message : "Upload failed",
                }
              : a
          )
        );
      }
    },
    [pendingAttachments.length, maxFiles, maxFileSize]
  );

  // Pick image from camera roll
  const pickImage = useCallback(async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please grant access to your photo library to attach images."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: maxFiles - pendingAttachments.length,
        quality: 0.8,
        exif: false, // Strips EXIF and converts HEIC to JPEG on iOS
      });

      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
          const uri = asset.uri;
          const fileName = asset.fileName || uri.split("/").pop() || "image.jpg";
          // Force JPEG mime type - expo-image-picker converts HEIC when quality is set
          const mimeType = asset.mimeType?.startsWith("image/") ? asset.mimeType : "image/jpeg";
          const fileSize = asset.fileSize || 0;

          await addAttachment(uri, fileName, mimeType, fileSize);
        }
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  }, [addAttachment, maxFiles, pendingAttachments.length]);

  // Pick document
  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
          const uri = asset.uri;
          const fileName = asset.name;
          const mimeType = asset.mimeType || "application/octet-stream";
          const fileSize = asset.size || 0;

          await addAttachment(uri, fileName, mimeType, fileSize);
        }
      }
    } catch (error) {
      console.error("Document picker error:", error);
      Alert.alert("Error", "Failed to pick document");
    }
  }, [addAttachment]);

  // Show action sheet to choose picker type
  const showPicker = useCallback(() => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Photo Library", "Document"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            pickImage();
          } else if (buttonIndex === 2) {
            pickDocument();
          }
        }
      );
    } else {
      // For Android, show an Alert with options
      Alert.alert("Add Attachment", "Choose an option", [
        { text: "Cancel", style: "cancel" },
        { text: "Photo Library", onPress: pickImage },
        { text: "Document", onPress: pickDocument },
      ]);
    }
  }, [pickImage, pickDocument]);

  // Remove an attachment
  const removeAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Clear all attachments
  const clearAttachments = useCallback(() => {
    setPendingAttachments([]);
  }, []);

  return {
    pendingAttachments,
    pickImage,
    pickDocument,
    showPicker,
    removeAttachment,
    clearAttachments,
    isUploading,
  };
}
