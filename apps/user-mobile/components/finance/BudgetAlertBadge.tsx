import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Text, View } from "react-native";

interface BudgetAlertBadgeProps {
  percentUsed: number;
  compact?: boolean;
}

export function BudgetAlertBadge({
  percentUsed,
  compact = false,
}: BudgetAlertBadgeProps) {
  if (percentUsed >= 100) {
    return (
      <View
        className={`flex-row items-center rounded-full bg-red-500/20 ${
          compact ? "px-2 py-0.5" : "px-3 py-1"
        }`}
      >
        <FontAwesome name="exclamation-circle" size={compact ? 10 : 12} color="#ef4444" />
        <Text
          className={`ml-1 font-medium text-red-500 ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          Over Budget
        </Text>
      </View>
    );
  }

  if (percentUsed >= 80) {
    return (
      <View
        className={`flex-row items-center rounded-full bg-amber-500/20 ${
          compact ? "px-2 py-0.5" : "px-3 py-1"
        }`}
      >
        <FontAwesome name="warning" size={compact ? 10 : 12} color="#f59e0b" />
        <Text
          className={`ml-1 font-medium text-amber-600 ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          80% Used
        </Text>
      </View>
    );
  }

  if (percentUsed >= 50) {
    return (
      <View
        className={`flex-row items-center rounded-full bg-sky-500/20 ${
          compact ? "px-2 py-0.5" : "px-3 py-1"
        }`}
      >
        <Text
          className={`font-medium text-sky-600 ${compact ? "text-xs" : "text-sm"}`}
        >
          50% Used
        </Text>
      </View>
    );
  }

  return (
    <View
      className={`flex-row items-center rounded-full bg-emerald-500/20 ${
        compact ? "px-2 py-0.5" : "px-3 py-1"
      }`}
    >
      <FontAwesome name="check-circle" size={compact ? 10 : 12} color="#22c55e" />
      <Text
        className={`ml-1 font-medium text-emerald-600 ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        On Track
      </Text>
    </View>
  );
}
