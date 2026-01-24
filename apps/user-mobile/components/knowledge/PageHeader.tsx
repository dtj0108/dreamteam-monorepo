import FontAwesome from "@expo/vector-icons/FontAwesome";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { Colors } from "@/constants/Colors";
import { KnowledgePage } from "@/lib/types/knowledge";

interface PageHeaderProps {
  page: KnowledgePage;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  onTitleChange: (title: string) => void;
  isSaving?: boolean;
}

export function PageHeader({
  page,
  onToggleFavorite,
  onDelete,
  onArchive,
  onTitleChange,
  isSaving,
}: PageHeaderProps) {
  const router = useRouter();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(page.title);

  const handleBack = () => {
    router.back();
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleValue.trim() !== page.title) {
      onTitleChange(titleValue.trim() || "Untitled");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Page",
      "Are you sure you want to delete this page? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: onDelete,
        },
      ]
    );
  };

  const handleMore = () => {
    Alert.alert(
      page.title || "Untitled",
      undefined,
      [
        {
          text: page.is_archived ? "Restore" : "Archive",
          onPress: onArchive,
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: handleDelete,
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  return (
    <View className="border-b border-border bg-background">
      <View className="flex-row items-center px-4 py-3">
        {/* Back Button */}
        <Pressable
          onPress={handleBack}
          className="mr-3 h-11 w-11 items-center justify-center rounded-full active:bg-muted"
        >
          <Ionicons name="chevron-back" size={24} color={Colors.foreground} />
        </Pressable>

        {/* Icon */}
        <View className="mr-2">
          {page.icon ? (
            <Text className="text-2xl">{page.icon}</Text>
          ) : (
            <Ionicons
              name="document-text-outline"
              size={24}
              color={Colors.mutedForeground}
            />
          )}
        </View>

        {/* Title */}
        <View className="flex-1">
          {isEditingTitle ? (
            <View className="rounded-lg bg-muted px-2 py-1">
              <TextInput
                value={titleValue}
                onChangeText={setTitleValue}
                onBlur={handleTitleSubmit}
                onSubmitEditing={handleTitleSubmit}
                autoFocus
                className="text-lg font-semibold text-foreground"
                placeholder="Untitled"
                placeholderTextColor={Colors.mutedForeground}
                returnKeyType="done"
              />
            </View>
          ) : (
            <Pressable onPress={() => setIsEditingTitle(true)}>
              <Text
                className="text-lg font-semibold text-foreground"
                numberOfLines={1}
              >
                {page.title || "Untitled"}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Save indicator */}
        {isSaving && (
          <Text className="mr-2 text-xs text-muted-foreground">Saving...</Text>
        )}

        {/* Action Icons */}
        <View className="flex-row items-center gap-1">
          {/* Favorite */}
          <Pressable
            onPress={onToggleFavorite}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
          >
            <FontAwesome
              name={page.isFavorite ? "star" : "star-o"}
              size={20}
              color={page.isFavorite ? Colors.warning : Colors.mutedForeground}
            />
          </Pressable>

          {/* More */}
          <Pressable
            onPress={handleMore}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={Colors.mutedForeground}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
