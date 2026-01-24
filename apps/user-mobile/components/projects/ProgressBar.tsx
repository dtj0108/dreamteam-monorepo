import { View, Text } from "react-native";

interface ProgressBarProps {
  progress: number; // 0-100
  showLabel?: boolean;
  size?: "sm" | "md";
  color?: string;
}

export function ProgressBar({
  progress,
  showLabel = false,
  size = "md",
  color = "#10b981", // emerald
}: ProgressBarProps) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const heightClass = size === "sm" ? "h-1.5" : "h-2";

  return (
    <View className="flex-row items-center">
      <View className={`flex-1 rounded-full bg-gray-200 ${heightClass}`}>
        <View
          className={`rounded-full ${heightClass}`}
          style={{
            width: `${clampedProgress}%`,
            backgroundColor: color,
          }}
        />
      </View>
      {showLabel && (
        <Text className="ml-2 text-xs text-muted-foreground">
          {Math.round(clampedProgress)}%
        </Text>
      )}
    </View>
  );
}
