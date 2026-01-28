import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import {
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MetricCard, ReportCard, TrendChart } from "@/components/finance";
import { Loading } from "@/components/Loading";
import { Colors } from "@/constants/Colors";
import { useAnalyticsOverview } from "@/lib/hooks/useAnalytics";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function AnalyticsOverviewScreen() {
  const router = useRouter();
  const { data: overview, isLoading, refetch } = useAnalyticsOverview();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <Loading />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {/* Header */}
        <View className="flex-row items-center py-4">
          <FontAwesome
            name="chevron-left"
            size={18}
            color={Colors.primary}
            onPress={() => router.back()}
          />
          <Text className="ml-4 text-2xl font-bold text-foreground">
            Analytics
          </Text>
        </View>
        <Text className="mb-6 text-muted-foreground">
          Financial reports & insights
        </Text>

        {/* Current Month Summary */}
        <View className="mb-6">
          <Text className="mb-3 text-lg font-semibold text-foreground">
            This Month
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <MetricCard
                title="Income"
                value={formatCurrency(overview?.currentMonth.income ?? 0)}
                change={overview?.changes.income ?? 0}
                color={Colors.success}
              />
            </View>
            <View className="flex-1">
              <MetricCard
                title="Expenses"
                value={formatCurrency(overview?.currentMonth.expenses ?? 0)}
                change={overview?.changes.expenses ?? 0}
                color={Colors.destructive}
                inverseChange
              />
            </View>
          </View>
          <View className="mt-3">
            <MetricCard
              title="Net Profit"
              value={formatCurrency(overview?.currentMonth.profit ?? 0)}
              change={overview?.changes.profit ?? 0}
              color={
                (overview?.currentMonth.profit ?? 0) >= 0
                  ? Colors.success
                  : Colors.destructive
              }
            />
          </View>
        </View>

        {/* Trend Chart */}
        {overview?.trend && overview.trend.length > 0 && (
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-foreground">
              6-Month Trend
            </Text>
            <View className="rounded-xl bg-muted p-4">
              <TrendChart data={overview.trend} height={180} />
            </View>
          </View>
        )}

        {/* Reports */}
        <View className="mb-4">
          <Text className="mb-3 text-lg font-semibold text-foreground">
            Reports
          </Text>
          <View className="gap-2">
            <ReportCard
              icon="arrow-circle-down"
              iconColor={Colors.success}
              title="Income Analysis"
              subtitle="Revenue sources & trends"
              onPress={() => router.push("/(main)/finance/analytics/income")}
            />
            <ReportCard
              icon="arrow-circle-up"
              iconColor={Colors.destructive}
              title="Expense Analysis"
              subtitle="Spending patterns by category"
              onPress={() => router.push("/(main)/finance/analytics/expenses")}
            />
            <ReportCard
              icon="balance-scale"
              iconColor={Colors.primary}
              title="Profit & Loss"
              subtitle="Income vs expenses comparison"
              onPress={() =>
                router.push("/(main)/finance/analytics/profit-loss")
              }
            />
            <ReportCard
              icon="exchange"
              iconColor="#8b5cf6"
              title="Cash Flow"
              subtitle="Money in vs money out over time"
              onPress={() => router.push("/(main)/finance/analytics/cash-flow")}
            />
            <ReportCard
              icon="pie-chart"
              iconColor="#f59e0b"
              title="Budget vs Actual"
              subtitle="Compare spending against budgets"
              onPress={() => router.push("/(main)/finance/analytics/budget-vs-actual")}
            />
            <ReportCard
              icon="calendar"
              iconColor="#0ea5e9"
              title="Financial Calendar"
              subtitle="View transactions by date"
              onPress={() => router.push("/(main)/finance/analytics/calendar")}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
