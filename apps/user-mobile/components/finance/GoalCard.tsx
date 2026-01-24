import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Pressable, Text, View } from "react-native";

import { Colors } from "@/constants/Colors";
import {
  Goal,
  GOAL_TYPE_COLORS,
  GOAL_TYPE_LABELS,
  getGoalProgress,
  isGoalOnTrack,
} from "@/lib/types/finance";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

interface GoalCardProps {
  goal: Goal;
  onPress?: () => void;
}

export function GoalCard({ goal, onPress }: GoalCardProps) {
  const progress = getGoalProgress(goal);
  const onTrack = isGoalOnTrack(goal);
  const color = GOAL_TYPE_COLORS[goal.type];

  return (
    <Pressable
      className="rounded-xl bg-muted p-4 active:opacity-70"
      onPress={onPress}
    >
      {/* Header */}
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center">
          <View
            className="h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: color + "20" }}
          >
            <FontAwesome name="bullseye" size={14} color={color} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-semibold text-foreground" numberOfLines={1}>
              {goal.name}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {GOAL_TYPE_LABELS[goal.type]}
            </Text>
          </View>
        </View>
        {goal.is_achieved ? (
          <View className="rounded-full bg-green-500/10 px-2 py-1">
            <Text className="text-xs font-medium text-green-500">Achieved</Text>
          </View>
        ) : onTrack ? (
          <View className="rounded-full bg-primary/10 px-2 py-1">
            <Text className="text-xs font-medium text-primary">On Track</Text>
          </View>
        ) : (
          <View className="rounded-full bg-amber-500/10 px-2 py-1">
            <Text className="text-xs font-medium text-amber-500">Behind</Text>
          </View>
        )}
      </View>

      {/* Progress Bar */}
      <View className="mb-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <View
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            backgroundColor: goal.is_achieved ? Colors.success : color,
          }}
        />
      </View>

      {/* Stats */}
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-muted-foreground">
          {formatCurrency(goal.current_amount)} /{" "}
          {formatCurrency(goal.target_amount)}
        </Text>
        <Text
          className="text-sm font-medium"
          style={{ color: goal.is_achieved ? Colors.success : color }}
        >
          {Math.round(progress)}%
        </Text>
      </View>

      {/* Date Range */}
      {goal.end_date && (
        <View className="mt-2 flex-row items-center">
          <FontAwesome
            name="calendar"
            size={12}
            color={Colors.mutedForeground}
          />
          <Text className="ml-1 text-xs text-muted-foreground">
            {formatDate(goal.start_date)} - {formatDate(goal.end_date)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
