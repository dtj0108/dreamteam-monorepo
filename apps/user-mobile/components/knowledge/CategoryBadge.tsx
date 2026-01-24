import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Pressable, Text, View } from "react-native";

import { KnowledgeCategory } from "@/lib/types/knowledge";

interface CategoryBadgeProps {
  category: KnowledgeCategory;
  size?: "sm" | "default";
  onRemove?: () => void;
  onPress?: () => void;
}

export function CategoryBadge({
  category,
  size = "default",
  onRemove,
  onPress,
}: CategoryBadgeProps) {
  const color = category.color || "#6b7280"; // Default to gray
  const isSmall = size === "sm";

  const content = (
    <View
      className={`flex-row items-center rounded-full ${
        isSmall ? "px-2 py-0.5" : "px-2.5 py-1"
      }`}
      style={{ backgroundColor: `${color}20` }} // 20% opacity background
    >
      <Text
        className={`font-medium ${isSmall ? "text-xs" : "text-sm"}`}
        style={{ color }}
        numberOfLines={1}
      >
        {category.name}
      </Text>
      {onRemove && (
        <Pressable
          onPress={onRemove}
          className="ml-1 h-6 w-6 items-center justify-center active:opacity-50"
          hitSlop={4}
        >
          <FontAwesome name="times" size={isSmall ? 10 : 12} color={color} />
        </Pressable>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} className="active:opacity-70">
        {content}
      </Pressable>
    );
  }

  return content;
}
