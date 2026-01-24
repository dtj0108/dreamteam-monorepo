import FontAwesome from "@expo/vector-icons/FontAwesome";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";

import { CategoryBadge } from "./CategoryBadge";
import { Colors } from "@/constants/Colors";
import { KnowledgePage } from "@/lib/types/knowledge";

interface PageCardProps {
  page: KnowledgePage;
  onPress: () => void;
}

export function PageCard({ page, onPress }: PageCardProps) {
  const MAX_CATEGORIES = 2;
  const visibleCategories = page.categories.slice(0, MAX_CATEGORIES);
  const overflowCount = page.categories.length - MAX_CATEGORIES;

  // Format relative time
  const updatedAt = new Date(page.updated_at);
  const relativeTime = getRelativeTime(updatedAt);

  return (
    <Pressable
      onPress={onPress}
      className="mb-2 flex-row items-center rounded-xl bg-muted p-3 active:opacity-70"
    >
      {/* Icon */}
      <View className="h-10 w-10 items-center justify-center rounded-lg bg-background">
        {page.icon ? (
          <Text className="text-xl">{page.icon}</Text>
        ) : (
          <Ionicons name="document-text-outline" size={20} color={Colors.mutedForeground} />
        )}
      </View>

      {/* Content */}
      <View className="ml-3 flex-1">
        <View className="flex-row items-center">
          <Text
            className="flex-1 text-base font-semibold text-foreground"
            numberOfLines={1}
          >
            {page.title || "Untitled"}
          </Text>
          {page.isFavorite && (
            <FontAwesome
              name="star"
              size={14}
              color="#f59e0b"
              style={{ marginLeft: 4 }}
            />
          )}
        </View>

        {/* Categories and time */}
        <View className="mt-1 flex-row items-center">
          {visibleCategories.length > 0 && (
            <View className="mr-2 flex-row items-center gap-1">
              {visibleCategories.map((cat) => (
                <CategoryBadge key={cat.id} category={cat} size="sm" />
              ))}
              {overflowCount > 0 && (
                <Text className="text-xs text-muted-foreground">
                  +{overflowCount}
                </Text>
              )}
            </View>
          )}
          <Text className="text-sm text-muted-foreground">{relativeTime}</Text>
        </View>
      </View>

      {/* Chevron */}
      <Ionicons
        name="chevron-forward"
        size={20}
        color={Colors.mutedForeground}
      />
    </Pressable>
  );
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "Just now";
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
}
