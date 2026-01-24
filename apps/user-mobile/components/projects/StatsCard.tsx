import { View, Text } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: string;
  iconColor?: string;
}

export function StatsCard({
  label,
  value,
  icon,
  iconColor = "#6b7280",
}: StatsCardProps) {
  return (
    <View className="flex-1 rounded-xl bg-muted p-3">
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-xs text-muted-foreground">{label}</Text>
        {icon && (
          <FontAwesome name={icon as any} size={12} color={iconColor} />
        )}
      </View>
      <Text className="text-xl font-bold text-foreground">{value}</Text>
    </View>
  );
}
