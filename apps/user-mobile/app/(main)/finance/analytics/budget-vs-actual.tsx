import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DateRangePicker, MetricCard } from "@/components/finance";
import { Loading } from "@/components/Loading";
import { Colors } from "@/constants/Colors";
import { useBudgetVsActual } from "@/lib/hooks/useAnalytics";
import { BudgetComparison, BudgetStatus, DateRange } from "@/lib/types/finance";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const STATUS_CONFIG: Record<BudgetStatus, { color: string; label: string; bgColor: string }> = {
  over: { color: "#ef4444", label: "Over Budget", bgColor: "#ef444420" },
  warning: { color: "#f59e0b", label: "Warning", bgColor: "#f59e0b20" },
  under: { color: "#22c55e", label: "On Track", bgColor: "#22c55e20" },
};

export default function BudgetVsActualScreen() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { data, isLoading, refetch } = useBudgetVsActual(dateRange);

  if (isLoading && !data) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <Loading />
      </SafeAreaView>
    );
  }

  const summary = data?.summary;
  const comparison = data?.comparison ?? [];

  // Count by status
  const overCount = comparison.filter((c) => c.status === "over").length;
  const warningCount = comparison.filter((c) => c.status === "warning").length;
  const underCount = comparison.filter((c) => c.status === "under").length;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <View className="flex-row items-center">
            <Pressable onPress={() => router.back()}>
              <FontAwesome name="chevron-left" size={18} color={Colors.primary} />
            </Pressable>
            <Text className="ml-4 text-2xl font-bold text-foreground">
              Budget vs Actual
            </Text>
          </View>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </View>

        {/* Summary Metrics */}
        <View className="mb-6">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <MetricCard
                title="Total Budgeted"
                value={formatCurrency(summary?.totalBudgeted ?? 0)}
                color={Colors.primary}
              />
            </View>
            <View className="flex-1">
              <MetricCard
                title="Total Actual"
                value={formatCurrency(summary?.totalActual ?? 0)}
                color={Colors.mutedForeground}
              />
            </View>
          </View>
          <View className="mt-3 flex-row gap-3">
            <View className="flex-1">
              <MetricCard
                title="Variance"
                value={formatCurrency(summary?.totalVariance ?? 0)}
                color={(summary?.totalVariance ?? 0) >= 0 ? "#22c55e" : "#ef4444"}
              />
            </View>
            <View className="flex-1">
              <MetricCard
                title="Budgets"
                value={String(summary?.budgetCount ?? 0)}
                color={Colors.mutedForeground}
              />
            </View>
          </View>
        </View>

        {/* Status Summary */}
        <View className="mb-6 flex-row gap-3">
          <View
            className="flex-1 items-center rounded-xl p-3"
            style={{ backgroundColor: STATUS_CONFIG.over.bgColor }}
          >
            <Text className="text-2xl font-bold" style={{ color: STATUS_CONFIG.over.color }}>
              {overCount}
            </Text>
            <Text className="text-xs" style={{ color: STATUS_CONFIG.over.color }}>
              Over Budget
            </Text>
          </View>
          <View
            className="flex-1 items-center rounded-xl p-3"
            style={{ backgroundColor: STATUS_CONFIG.warning.bgColor }}
          >
            <Text className="text-2xl font-bold" style={{ color: STATUS_CONFIG.warning.color }}>
              {warningCount}
            </Text>
            <Text className="text-xs" style={{ color: STATUS_CONFIG.warning.color }}>
              Warning
            </Text>
          </View>
          <View
            className="flex-1 items-center rounded-xl p-3"
            style={{ backgroundColor: STATUS_CONFIG.under.bgColor }}
          >
            <Text className="text-2xl font-bold" style={{ color: STATUS_CONFIG.under.color }}>
              {underCount}
            </Text>
            <Text className="text-xs" style={{ color: STATUS_CONFIG.under.color }}>
              On Track
            </Text>
          </View>
        </View>

        {/* Budget Comparison List */}
        <View className="mb-4">
          <Text className="mb-3 text-lg font-semibold text-foreground">
            Budget Breakdown
          </Text>
          {comparison.length > 0 ? (
            comparison.map((item) => (
              <BudgetComparisonCard key={item.budgetId} item={item} />
            ))
          ) : (
            <View className="items-center rounded-xl bg-muted py-8">
              <FontAwesome name="pie-chart" size={36} color={Colors.mutedForeground} />
              <Text className="mt-2 text-muted-foreground">No budgets to compare</Text>
              <Pressable
                className="mt-4 rounded-lg bg-primary px-4 py-2"
                onPress={() => router.push("/finance/budgets/new")}
              >
                <Text className="font-medium text-white">Create Budget</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BudgetComparisonCard({ item }: { item: BudgetComparison }) {
  const statusConfig = STATUS_CONFIG[item.status];
  const progressPercent = Math.min(item.utilizationPercent, 100);

  return (
    <View className="mb-3 rounded-xl bg-muted p-4">
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: item.categoryColor }}
          />
          <Text className="ml-2 font-medium text-foreground">{item.categoryName}</Text>
        </View>
        <View
          className="rounded-full px-2 py-1"
          style={{ backgroundColor: statusConfig.bgColor }}
        >
          <Text className="text-xs font-medium" style={{ color: statusConfig.color }}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View className="mt-3">
        <View className="h-2 overflow-hidden rounded-full bg-background">
          <View
            className="h-full rounded-full"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: statusConfig.color,
            }}
          />
        </View>
      </View>

      {/* Amounts */}
      <View className="mt-3 flex-row justify-between">
        <View>
          <Text className="text-xs text-muted-foreground">Spent</Text>
          <Text className="font-semibold text-foreground">
            {formatCurrency(item.actualAmount)}
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-xs text-muted-foreground">
            {item.utilizationPercent.toFixed(0)}%
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-xs text-muted-foreground">Budget</Text>
          <Text className="font-semibold text-foreground">
            {formatCurrency(item.budgetAmount)}
          </Text>
        </View>
      </View>

      {/* Variance */}
      <View className="mt-2 items-center">
        <Text
          className="text-sm font-medium"
          style={{ color: item.variance >= 0 ? "#22c55e" : "#ef4444" }}
        >
          {item.variance >= 0 ? "Under by " : "Over by "}
          {formatCurrency(Math.abs(item.variance))}
        </Text>
      </View>
    </View>
  );
}
