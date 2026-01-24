import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GoalCard } from "@/components/finance/GoalCard";
import { Loading } from "@/components/Loading";
import { Colors } from "@/constants/Colors";
import { useGoals } from "@/lib/hooks/useGoals";
import { GOAL_TYPE_COLORS, getGoalProgress } from "@/lib/types/finance";

const formatCurrency = (amount: number) => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount}`;
};

export default function ExitPlanningScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useGoals();
  const [showAchieved, setShowAchieved] = useState(false);

  // Filter exit-related goals
  const allGoals = data?.goals ?? [];
  const exitTypes = ["valuation", "runway", "revenue_multiple"];
  const exitGoals = allGoals.filter((g) => exitTypes.includes(g.type));
  const activeGoals = exitGoals.filter((g) => !g.is_achieved);
  const achievedGoals = exitGoals.filter((g) => g.is_achieved);

  // Get specific goal types for metrics
  const valuationGoal = activeGoals.find((g) => g.type === "valuation");
  const runwayGoal = activeGoals.find((g) => g.type === "runway");
  const multipleGoal = activeGoals.find((g) => g.type === "revenue_multiple");

  // Calculate readiness score (average of all exit goal progress)
  const readinessScore =
    activeGoals.length > 0
      ? Math.round(
          activeGoals.reduce((sum, g) => {
            return sum + Math.min(getGoalProgress(g), 100);
          }, 0) / activeGoals.length
        )
      : 0;

  // Days to exit (from valuation goal end date)
  const daysToExit =
    valuationGoal?.end_date
      ? Math.max(
          0,
          Math.ceil(
            (new Date(valuationGoal.end_date).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : null;

  const color = GOAL_TYPE_COLORS.valuation;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Pressable onPress={() => router.back()}>
          <FontAwesome name="chevron-left" size={18} color={Colors.primary} />
        </Pressable>
        <Text className="text-lg font-semibold text-foreground">
          Exit Planning
        </Text>
        <Pressable
          className="h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: color }}
          onPress={() =>
            router.push("/(main)/finance/goals/new?type=valuation")
          }
        >
          <FontAwesome name="plus" size={14} color="white" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {isLoading ? (
          <Loading />
        ) : (
          <>
            {/* Readiness Score */}
            <View className="mt-4 items-center rounded-xl bg-muted p-6">
              <Text className="text-sm text-muted-foreground">
                Exit Readiness
              </Text>
              <Text
                className="text-5xl font-bold"
                style={{
                  color: readinessScore >= 70 ? Colors.success : color,
                }}
              >
                {readinessScore}%
              </Text>
              <View className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${readinessScore}%`,
                    backgroundColor:
                      readinessScore >= 70 ? Colors.success : color,
                  }}
                />
              </View>
            </View>

            {/* Metric Grid */}
            <View className="mt-4 flex-row flex-wrap gap-3">
              <MetricBox
                title="Target Valuation"
                value={
                  valuationGoal
                    ? formatCurrency(valuationGoal.target_amount)
                    : "--"
                }
                color={GOAL_TYPE_COLORS.valuation}
              />
              <MetricBox
                title="Current Value"
                value={
                  valuationGoal
                    ? formatCurrency(valuationGoal.current_amount)
                    : "--"
                }
                color={GOAL_TYPE_COLORS.valuation}
              />
              <MetricBox
                title="Cash Runway"
                value={
                  runwayGoal ? `${runwayGoal.current_amount} mo` : "--"
                }
                color={GOAL_TYPE_COLORS.runway}
              />
              <MetricBox
                title="Revenue Multiple"
                value={
                  multipleGoal ? `${multipleGoal.current_amount}x` : "--"
                }
                color={GOAL_TYPE_COLORS.revenue_multiple}
              />
            </View>

            {/* Days to Exit */}
            {daysToExit !== null && (
              <View className="mt-4 items-center rounded-xl bg-primary/10 p-4">
                <Text className="text-sm text-primary">
                  Days to Target Exit
                </Text>
                <Text className="text-3xl font-bold text-primary">
                  {daysToExit}
                </Text>
              </View>
            )}

            {/* Exit Goals List */}
            <Text className="mb-3 mt-6 text-sm font-medium uppercase text-muted-foreground">
              Exit Goals ({activeGoals.length})
            </Text>
            {activeGoals.length > 0 ? (
              <View className="gap-3">
                {activeGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onPress={() =>
                      router.push(`/(main)/finance/goals/${goal.id}`)
                    }
                  />
                ))}
              </View>
            ) : (
              <View className="items-center rounded-xl bg-muted py-8">
                <FontAwesome
                  name="rocket"
                  size={32}
                  color={Colors.mutedForeground}
                />
                <Text className="mt-2 text-muted-foreground">
                  No exit goals yet
                </Text>
                <Pressable
                  className="mt-4 rounded-lg px-4 py-2"
                  style={{ backgroundColor: color }}
                  onPress={() =>
                    router.push("/(main)/finance/goals/new?type=valuation")
                  }
                >
                  <Text className="font-medium text-white">Add Exit Goal</Text>
                </Pressable>
              </View>
            )}

            {/* Achieved */}
            {achievedGoals.length > 0 && (
              <View className="mt-6">
                <Pressable
                  className="flex-row items-center justify-between py-2"
                  onPress={() => setShowAchieved(!showAchieved)}
                >
                  <Text className="text-sm font-medium uppercase text-muted-foreground">
                    Achieved ({achievedGoals.length})
                  </Text>
                  <FontAwesome
                    name={showAchieved ? "chevron-up" : "chevron-down"}
                    size={14}
                    color={Colors.mutedForeground}
                  />
                </Pressable>
                {showAchieved && (
                  <View className="mt-2 gap-3">
                    {achievedGoals.map((goal) => (
                      <GoalCard key={goal.id} goal={goal} />
                    ))}
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricBox({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  return (
    <View
      className="min-w-[45%] flex-1 rounded-xl p-4"
      style={{ backgroundColor: color + "10" }}
    >
      <Text className="text-xs text-muted-foreground">{title}</Text>
      <Text className="mt-1 text-xl font-bold" style={{ color }}>
        {value}
      </Text>
    </View>
  );
}
