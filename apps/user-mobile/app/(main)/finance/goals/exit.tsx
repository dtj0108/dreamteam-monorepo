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
import { Goal, GOAL_TYPE_COLORS, getGoalProgress } from "@/lib/types/finance";

const formatCurrency = (amount: number) => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount}`;
};

type MetricStatus = "on-track" | "behind" | "achieved" | "not-set";

const getMetricStatus = (goal: Goal | undefined): MetricStatus => {
  if (!goal) return "not-set";
  if (goal.is_achieved) return "achieved";
  const progress = getGoalProgress(goal);
  if (progress >= 100) return "achieved";
  if (progress >= 70) return "on-track";
  return "behind";
};

const STATUS_CONFIG: Record<MetricStatus, { label: string; color: string; bgColor: string }> = {
  "on-track": { label: "On Track", color: "#0ea5e9", bgColor: "#0ea5e920" },
  "behind": { label: "Behind", color: "#f59e0b", bgColor: "#f59e0b20" },
  "achieved": { label: "Achieved", color: "#22c55e", bgColor: "#22c55e20" },
  "not-set": { label: "Not Set", color: "#6b7280", bgColor: "#6b728020" },
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

  // Calculate readiness score with weighted progress
  const calculateReadiness = () => {
    let totalWeight = 0;
    let weightedProgress = 0;

    if (valuationGoal) {
      totalWeight += 40;
      weightedProgress += Math.min(getGoalProgress(valuationGoal), 100) * 0.4;
    }
    if (runwayGoal) {
      totalWeight += 30;
      weightedProgress += Math.min(getGoalProgress(runwayGoal), 100) * 0.3;
    }
    if (multipleGoal) {
      totalWeight += 30;
      weightedProgress += Math.min(getGoalProgress(multipleGoal), 100) * 0.3;
    }

    return totalWeight > 0 ? Math.round((weightedProgress / totalWeight) * 100) : 0;
  };

  const readinessScore = calculateReadiness();

  // Get readiness status
  const getReadinessStatus = () => {
    if (readinessScore >= 80) return { label: "Ready to Exit", icon: "check-circle" as const, color: Colors.success };
    if (readinessScore >= 50) return { label: "Making Progress", icon: "line-chart" as const, color: "#0ea5e9" };
    return { label: "Building Momentum", icon: "clock-o" as const, color: "#f59e0b" };
  };

  const readinessStatus = getReadinessStatus();

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

  // Calculate implied valuation
  const currentARR = data?.goals
    ?.filter((g) => g.type === "revenue" && !g.is_achieved)
    .reduce((sum, g) => sum + g.current_amount, 0) ?? 0;
  const targetMultiple = multipleGoal?.target_amount ?? 5;
  const impliedValuation = currentARR * targetMultiple;

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
            {/* Exit Readiness Card */}
            <View
              className="mt-4 rounded-xl border-2 p-6"
              style={{ borderColor: color + "40", backgroundColor: color + "08" }}
            >
              <View className="flex-row items-start justify-between">
                <View>
                  <View className="flex-row items-center gap-2">
                    <FontAwesome name="rocket" size={20} color={color} />
                    <Text className="text-lg font-semibold text-foreground">
                      Exit Readiness
                    </Text>
                  </View>
                  <Text className="mt-1 text-sm text-muted-foreground">
                    {activeGoals.length > 0
                      ? "Track your progress toward a successful exit"
                      : "Set your exit targets to start tracking"}
                  </Text>
                </View>
              </View>

              {activeGoals.length > 0 ? (
                <View className="mt-4">
                  <View className="flex-row items-baseline justify-between">
                    <Text
                      className="text-5xl font-bold"
                      style={{ color }}
                    >
                      {readinessScore}%
                    </Text>
                    <View
                      className="flex-row items-center gap-1 rounded-full px-3 py-1"
                      style={{ backgroundColor: readinessStatus.color + "20" }}
                    >
                      <FontAwesome
                        name={readinessStatus.icon}
                        size={12}
                        color={readinessStatus.color}
                      />
                      <Text
                        className="text-xs font-medium"
                        style={{ color: readinessStatus.color }}
                      >
                        {readinessStatus.label}
                      </Text>
                    </View>
                  </View>
                  <View className="mt-3 h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${readinessScore}%`,
                        backgroundColor: color,
                      }}
                    />
                  </View>

                  {/* Days to Exit */}
                  {daysToExit !== null && valuationGoal?.end_date && (
                    <View className="mt-4 flex-row items-center gap-2">
                      <FontAwesome name="calendar" size={14} color={Colors.mutedForeground} />
                      <Text className="text-sm text-muted-foreground">
                        Target exit:
                      </Text>
                      <Text className="text-sm font-medium text-foreground">
                        {new Date(valuationGoal.end_date).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Text>
                      <View
                        className="ml-auto rounded-full px-2 py-0.5"
                        style={{
                          backgroundColor: daysToExit > 365
                            ? "#6b728020"
                            : daysToExit > 180
                            ? "#f59e0b20"
                            : "#ef444420"
                        }}
                      >
                        <Text
                          className="text-xs font-medium"
                          style={{
                            color: daysToExit > 365
                              ? "#6b7280"
                              : daysToExit > 180
                              ? "#f59e0b"
                              : "#ef4444"
                          }}
                        >
                          {daysToExit > 0 ? `${daysToExit} days` : "Past due"}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <View className="mt-6 items-center">
                  <FontAwesome name="rocket" size={40} color={color + "60"} />
                  <Text className="mt-3 text-center text-muted-foreground">
                    Define your exit strategy to track your progress
                  </Text>
                  <Pressable
                    className="mt-4 rounded-lg px-6 py-3"
                    style={{ backgroundColor: color }}
                    onPress={() => router.push("/(main)/finance/goals/new?type=valuation")}
                  >
                    <Text className="font-medium text-white">Set Exit Targets</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Metrics Grid */}
            {activeGoals.length > 0 && (
              <View className="mt-4">
                <View className="flex-row gap-3">
                  <MetricCard
                    title="Valuation"
                    icon="bullseye"
                    current={valuationGoal?.current_amount ?? null}
                    target={valuationGoal?.target_amount ?? null}
                    format={formatCurrency}
                    status={getMetricStatus(valuationGoal)}
                    onPress={() => valuationGoal && router.push(`/(main)/finance/goals/${valuationGoal.id}`)}
                  />
                  <MetricCard
                    title="Implied Value"
                    icon="calculator"
                    current={impliedValuation}
                    target={valuationGoal?.target_amount ?? null}
                    format={formatCurrency}
                    status={impliedValuation >= (valuationGoal?.target_amount ?? 0) ? "achieved" : impliedValuation > 0 ? "on-track" : "not-set"}
                    subtitle={`ARR × ${targetMultiple}x`}
                  />
                </View>
                <View className="mt-3 flex-row gap-3">
                  <MetricCard
                    title="Cash Runway"
                    icon="money"
                    current={runwayGoal?.current_amount ?? null}
                    target={runwayGoal?.target_amount ?? null}
                    format={(v) => `$${(v / 1000).toFixed(0)}K`}
                    status={getMetricStatus(runwayGoal)}
                    onPress={() => runwayGoal && router.push(`/(main)/finance/goals/${runwayGoal.id}`)}
                  />
                  <MetricCard
                    title="Revenue Multiple"
                    icon="line-chart"
                    current={multipleGoal?.current_amount ?? null}
                    target={multipleGoal?.target_amount ?? null}
                    format={(v) => `${v.toFixed(1)}x`}
                    status={getMetricStatus(multipleGoal)}
                    onPress={() => multipleGoal && router.push(`/(main)/finance/goals/${multipleGoal.id}`)}
                  />
                </View>
              </View>
            )}

            {/* Quick Add Buttons */}
            {activeGoals.length > 0 && activeGoals.length < 3 && (
              <View className="mt-4">
                <Text className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  Add Missing Goals
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {!valuationGoal && (
                    <QuickAddButton
                      label="Valuation Goal"
                      color={GOAL_TYPE_COLORS.valuation}
                      onPress={() => router.push("/(main)/finance/goals/new?type=valuation")}
                    />
                  )}
                  {!runwayGoal && (
                    <QuickAddButton
                      label="Runway Goal"
                      color={GOAL_TYPE_COLORS.runway}
                      onPress={() => router.push("/(main)/finance/goals/new?type=runway")}
                    />
                  )}
                  {!multipleGoal && (
                    <QuickAddButton
                      label="Multiple Goal"
                      color={GOAL_TYPE_COLORS.revenue_multiple}
                      onPress={() => router.push("/(main)/finance/goals/new?type=revenue_multiple")}
                    />
                  )}
                </View>
              </View>
            )}

            {/* Exit Goals List */}
            {activeGoals.length > 0 && (
              <>
                <Text className="mb-3 mt-6 text-sm font-medium uppercase text-muted-foreground">
                  Exit Goals ({activeGoals.length})
                </Text>
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
              </>
            )}

            {/* Achieved Goals */}
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

            {/* Strategy Notes Placeholder */}
            {activeGoals.length > 0 && valuationGoal?.notes && (
              <View className="mt-6">
                <Text className="mb-2 text-sm font-medium uppercase text-muted-foreground">
                  Strategy Notes
                </Text>
                <View className="rounded-xl bg-muted p-4">
                  <Text className="text-sm text-muted-foreground">
                    {valuationGoal.notes}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({
  title,
  icon,
  current,
  target,
  format,
  status,
  subtitle,
  onPress,
}: {
  title: string;
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  current: number | null;
  target: number | null;
  format: (value: number) => string;
  status: MetricStatus;
  subtitle?: string;
  onPress?: () => void;
}) {
  const config = STATUS_CONFIG[status];
  const progress = target && current ? Math.min((current / target) * 100, 100) : 0;

  return (
    <Pressable
      className="flex-1 rounded-xl bg-muted p-4 active:opacity-70"
      onPress={onPress}
      disabled={!onPress}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <FontAwesome name={icon} size={14} color="#0ea5e9" />
          <Text className="text-sm font-medium text-foreground">{title}</Text>
        </View>
        <View
          className="rounded-full px-2 py-0.5"
          style={{ backgroundColor: config.bgColor }}
        >
          <Text className="text-[10px] font-medium" style={{ color: config.color }}>
            {config.label}
          </Text>
        </View>
      </View>
      <View className="mt-2 flex-row items-baseline justify-between">
        <Text className="text-xl font-bold text-foreground">
          {current !== null ? format(current) : "—"}
        </Text>
        <Text className="text-xs text-muted-foreground">
          / {target !== null ? format(target) : "Set"}
        </Text>
      </View>
      <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
        <View
          className="h-full rounded-full"
          style={{ width: `${progress}%`, backgroundColor: config.color }}
        />
      </View>
      {subtitle && (
        <Text className="mt-1 text-[10px] text-muted-foreground">{subtitle}</Text>
      )}
    </Pressable>
  );
}

function QuickAddButton({
  label,
  color,
  onPress,
}: {
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="flex-row items-center gap-1 rounded-full px-3 py-2"
      style={{ backgroundColor: color + "20" }}
      onPress={onPress}
    >
      <FontAwesome name="plus" size={10} color={color} />
      <Text className="text-xs font-medium" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}
