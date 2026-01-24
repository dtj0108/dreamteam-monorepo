import { View, Text, Pressable } from "react-native";

interface EmptyStateProps {
  emoji?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  emoji = "✨",
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <Text className="text-5xl">{emoji}</Text>
      <Text className="mt-4 text-center text-lg font-medium text-foreground">
        {title}
      </Text>
      {subtitle && (
        <Text className="mt-2 text-center text-muted-foreground">
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <Pressable
          className="mt-6 rounded-lg bg-primary px-6 py-3 active:opacity-70"
          onPress={onAction}
        >
          <Text className="font-medium text-white">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
