import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Text, View } from "react-native";

import { Colors } from "@/constants/Colors";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ComponentProps<typeof FontAwesome>["name"];
  color?: string;
  inverseChange?: boolean; // For expenses where decrease is good
}

export function MetricCard({
  title,
  value,
  change,
  icon,
  color,
  inverseChange = false,
}: MetricCardProps) {
  const displayColor = color || Colors.primary;

  // For inverseChange (like expenses), a decrease is good
  const isPositive = inverseChange ? (change ?? 0) <= 0 : (change ?? 0) >= 0;

  return (
    <View className="flex-1 rounded-xl bg-muted p-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-muted-foreground">{title}</Text>
        {icon && <FontAwesome name={icon} size={14} color={displayColor} />}
      </View>
      <Text className="mt-1 text-xl font-bold text-foreground">{value}</Text>
      {change !== undefined && change !== 0 && (
        <View className="mt-1 flex-row items-center">
          <FontAwesome
            name={(change ?? 0) >= 0 ? "arrow-up" : "arrow-down"}
            size={10}
            color={isPositive ? Colors.success : Colors.destructive}
          />
          <Text
            className="ml-1 text-xs"
            style={{
              color: isPositive ? Colors.success : Colors.destructive,
            }}
          >
            {Math.abs(change)}%
          </Text>
        </View>
      )}
    </View>
  );
}
