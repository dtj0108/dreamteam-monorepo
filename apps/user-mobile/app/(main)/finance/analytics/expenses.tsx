import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CategoryBreakdownChart,
  DateRangePicker,
  MetricCard,
  TrendChart,
} from "@/components/finance";
import { ExportButton } from "@/components/finance/ExportButton";
import { Loading } from "@/components/Loading";
import { Colors } from "@/constants/Colors";
import { useExpenseAnalysis } from "@/lib/hooks/useAnalytics";
import { DateRange, TrendDataPoint } from "@/lib/types/finance";
import {
  categoryBreakdownToCSV,
  exportCSV,
  getExportFilename,
} from "@/lib/utils/export";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function ExpenseAnalysisScreen() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { data, isLoading, refetch } = useExpenseAnalysis(dateRange);

  const handleExport = async () => {
    if (!data) return;
    const csv = categoryBreakdownToCSV(data.byCategory);
    await exportCSV({
      filename: getExportFilename("expense_analysis"),
      data: csv,
    });
  };

  // Convert monthly trend to TrendDataPoint format
  const trendData: TrendDataPoint[] =
    data?.monthlyTrend.map((item) => ({
      month: item.month,
      label: item.label,
      income: 0,
      expenses: item.amount,
      profit: -item.amount,
    })) ?? [];

  if (isLoading && !data) {
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
        <View className="flex-row items-center justify-between py-4">
          <View className="flex-row items-center">
            <FontAwesome
              name="chevron-left"
              size={18}
              color={Colors.primary}
              onPress={() => router.back()}
            />
            <Text className="ml-4 text-2xl font-bold text-foreground">
              Expense Analysis
            </Text>
          </View>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </View>

        {/* Summary Metrics */}
        <View className="mb-6">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <MetricCard
                title="Total Expenses"
                value={formatCurrency(data?.summary.totalExpenses ?? 0)}
                color={Colors.destructive}
              />
            </View>
            <View className="flex-1">
              <MetricCard
                title="Monthly Avg"
                value={formatCurrency(data?.summary.avgMonthly ?? 0)}
                color={Colors.primary}
              />
            </View>
          </View>
          <View className="mt-3 flex-row gap-3">
            <View className="flex-1">
              <MetricCard
                title="Transactions"
                value={String(data?.summary.transactionCount ?? 0)}
                color={Colors.mutedForeground}
              />
            </View>
            <View className="flex-1">
              <MetricCard
                title="Categories"
                value={String(data?.summary.categoryCount ?? 0)}
                color={Colors.mutedForeground}
              />
            </View>
          </View>
        </View>

        {/* Monthly Trend */}
        {trendData.length > 0 && (
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-foreground">
              Monthly Trend
            </Text>
            <View className="rounded-xl bg-muted p-4">
              <TrendChart
                data={trendData}
                showIncome={false}
                showExpenses={true}
                height={180}
              />
            </View>
          </View>
        )}

        {/* By Category */}
        <View className="mb-4">
          <Text className="mb-3 text-lg font-semibold text-foreground">
            By Category
          </Text>
          <View className="rounded-xl bg-muted p-4">
            <CategoryBreakdownChart
              data={data?.byCategory ?? []}
              maxItems={8}
            />
          </View>
        </View>

        {/* Export Button */}
        {data && (
          <View className="mb-4">
            <ExportButton onExport={handleExport} label="Export Expense Report" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
