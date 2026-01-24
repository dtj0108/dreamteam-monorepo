import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GoalTypeCard } from "@/components/finance/GoalTypeCard";
import { MetricCard } from "@/components/finance/MetricCard";
import { Loading } from "@/components/Loading";
import { Colors } from "@/constants/Colors";
import { useGoals } from "@/lib/hooks/useGoals";
import { GOAL_TYPE_COLORS } from "@/lib/types/finance";

export default function GoalsOverviewScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useGoals();

  const goals = data?.goals ?? [];
  const summary = data?.summary ?? {
    activeCount: 0,
    onTrackCount: 0,
    revenueProgress: 0,
    profitProgress: 0,
  };

  // Count goals by type
  const revenueGoals = goals.filter(
    (g) => g.type === "revenue" && !g.is_achieved
  );
  const profitGoals = goals.filter(
    (g) => g.type === "profit" && !g.is_achieved
  );
  const exitGoals = goals.filter(
    (g) =>
      ["valuation", "runway", "revenue_multiple"].includes(g.type) &&
      !g.is_achieved
  );

  const hasGoals = goals.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <View className="flex-row items-center">
            <Pressable onPress={() => router.back()} className="mr-3">
              <FontAwesome
                name="chevron-left"
                size={18}
                color={Colors.primary}
              />
            </Pressable>
            <View>
              <Text className="text-2xl font-bold text-foreground">Goals</Text>
              <Text className="text-muted-foreground">
                Track revenue, profit & exit planning
              </Text>
            </View>
          </View>
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full bg-primary"
            onPress={() => router.push("/(main)/finance/goals/new")}
          >
            <FontAwesome name="plus" size={18} color="white" />
          </Pressable>
        </View>

        {isLoading ? (
          <Loading />
        ) : (
          <>
            {/* Summary Metrics */}
            <View className="mb-4 flex-row gap-3">
              <MetricCard
                title="Active Goals"
                value={summary.activeCount}
                icon="bullseye"
                color={Colors.primary}
              />
              <MetricCard
                title="On Track"
                value={summary.onTrackCount}
                icon="check-circle"
                color={Colors.success}
              />
            </View>
            <View className="mb-6 flex-row gap-3">
              <MetricCard
                title="Revenue"
                value={`${Math.round(summary.revenueProgress)}%`}
                icon="line-chart"
                color={GOAL_TYPE_COLORS.revenue}
              />
              <MetricCard
                title="Profit"
                value={`${Math.round(summary.profitProgress)}%`}
                icon="money"
                color={GOAL_TYPE_COLORS.profit}
              />
            </View>

            {/* Goal Type Cards */}
            <Text className="mb-3 text-sm font-medium uppercase text-muted-foreground">
              Goal Categories
            </Text>
            <View className="gap-3">
              <GoalTypeCard
                title="Revenue Goals"
                subtitle="Track income targets"
                icon="line-chart"
                color={GOAL_TYPE_COLORS.revenue}
                count={revenueGoals.length}
                onPress={() => router.push("/(main)/finance/goals/revenue")}
              />
              <GoalTypeCard
                title="Profit Goals"
                subtitle="Monitor profitability"
                icon="money"
                color={GOAL_TYPE_COLORS.profit}
                count={profitGoals.length}
                onPress={() => router.push("/(main)/finance/goals/profit")}
              />
              <GoalTypeCard
                title="Exit Planning"
                subtitle="Valuation & runway targets"
                icon="rocket"
                color={GOAL_TYPE_COLORS.valuation}
                count={exitGoals.length}
                onPress={() => router.push("/(main)/finance/goals/exit")}
              />
            </View>

            {/* Getting Started (show only if no goals) */}
            {!hasGoals && (
              <View className="mt-6">
                <Text className="mb-3 text-sm font-medium uppercase text-muted-foreground">
                  Getting Started
                </Text>
                <View className="rounded-xl bg-muted p-4">
                  <ChecklistItem
                    text="Set your first revenue goal"
                    completed={false}
                  />
                  <ChecklistItem
                    text="Define profit targets"
                    completed={false}
                  />
                  <ChecklistItem
                    text="Plan your exit strategy"
                    completed={false}
                  />
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ChecklistItem({
  text,
  completed,
}: {
  text: string;
  completed: boolean;
}) {
  return (
    <View className="flex-row items-center py-2">
      <FontAwesome
        name={completed ? "check-circle" : "circle-o"}
        size={18}
        color={completed ? Colors.success : Colors.mutedForeground}
      />
      <Text
        className={`ml-3 ${completed ? "text-muted-foreground line-through" : "text-foreground"}`}
      >
        {text}
      </Text>
    </View>
  );
}
