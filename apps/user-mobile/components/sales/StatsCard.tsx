import { View, Text } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: string;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({
  label,
  value,
  icon,
  iconColor = "#6b7280",
  trend,
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
      {trend && (
        <View className="mt-1 flex-row items-center">
          <FontAwesome
            name={trend.isPositive ? "arrow-up" : "arrow-down"}
            size={10}
            color={trend.isPositive ? "#22c55e" : "#ef4444"}
          />
          <Text
            className="ml-1 text-xs"
            style={{ color: trend.isPositive ? "#22c55e" : "#ef4444" }}
          >
            {Math.abs(trend.value)}%
          </Text>
        </View>
      )}
    </View>
  );
}
