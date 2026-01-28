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
} from "@/components/finance";
import { ExportButton } from "@/components/finance/ExportButton";
import { Loading } from "@/components/Loading";
import { Colors } from "@/constants/Colors";
import { useProfitLoss } from "@/lib/hooks/useAnalytics";
import { DateRange } from "@/lib/types/finance";
import {
  exportCSV,
  getExportFilename,
  profitLossToCSV,
} from "@/lib/utils/export";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatPercent = (value: number) => {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
};

export default function ProfitLossScreen() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { data, isLoading, refetch } = useProfitLoss(dateRange);

  const handleExport = async () => {
    if (!data) return;
    const csv = profitLossToCSV(data);
    await exportCSV({
      filename: getExportFilename("profit_loss_report"),
      data: csv,
    });
  };

  if (isLoading && !data) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <Loading />
      </SafeAreaView>
    );
  }

  const profitMargin = data?.summary.profitMargin ?? 0;
  const netProfit = data?.summary.netProfit ?? 0;

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
              Profit & Loss
            </Text>
          </View>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </View>

        {/* Net Profit Hero */}
        <View className="mb-6 items-center rounded-xl bg-muted p-6">
          <Text className="text-muted-foreground">Net Profit</Text>
          <Text
            className="text-4xl font-bold"
            style={{
              color: netProfit >= 0 ? Colors.success : Colors.destructive,
            }}
          >
            {formatCurrency(netProfit)}
          </Text>
          <View className="mt-2 flex-row items-center gap-2">
            <Text className="text-muted-foreground">Profit Margin:</Text>
            <Text
              className="font-semibold"
              style={{
                color: profitMargin >= 0 ? Colors.success : Colors.destructive,
              }}
            >
              {profitMargin.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Income vs Expenses Summary */}
        <View className="mb-6">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <MetricCard
                title="Total Income"
                value={formatCurrency(data?.summary.totalIncome ?? 0)}
                change={data?.comparison.income.percentChange}
                color={Colors.success}
              />
            </View>
            <View className="flex-1">
              <MetricCard
                title="Total Expenses"
                value={formatCurrency(data?.summary.totalExpenses ?? 0)}
                change={data?.comparison.expenses.percentChange}
                color={Colors.destructive}
                inverseChange
              />
            </View>
          </View>
        </View>

        {/* Comparison vs Previous Period */}
        {data?.comparison && (
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-foreground">
              vs Previous Period
            </Text>
            <View className="rounded-xl bg-muted p-4">
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-muted-foreground">Income Change</Text>
                  <Text
                    className="font-semibold"
                    style={{
                      color:
                        data.comparison.income.change >= 0
                          ? Colors.success
                          : Colors.destructive,
                    }}
                  >
                    {formatCurrency(data.comparison.income.change)} (
                    {formatPercent(data.comparison.income.percentChange)})
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-muted-foreground">Expense Change</Text>
                  <Text
                    className="font-semibold"
                    style={{
                      color:
                        data.comparison.expenses.change <= 0
                          ? Colors.success
                          : Colors.destructive,
                    }}
                  >
                    {formatCurrency(data.comparison.expenses.change)} (
                    {formatPercent(data.comparison.expenses.percentChange)})
                  </Text>
                </View>
                <View className="my-2 h-px bg-border" />
                <View className="flex-row items-center justify-between">
                  <Text className="font-medium text-foreground">
                    Profit Change
                  </Text>
                  <Text
                    className="font-bold"
                    style={{
                      color:
                        data.comparison.profit.change >= 0
                          ? Colors.success
                          : Colors.destructive,
                    }}
                  >
                    {formatCurrency(data.comparison.profit.change)} (
                    {formatPercent(data.comparison.profit.percentChange)})
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Income by Category */}
        {data?.incomeByCategory && data.incomeByCategory.length > 0 && (
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-foreground">
              Income by Category
            </Text>
            <View className="rounded-xl bg-muted p-4">
              <CategoryBreakdownChart
                data={data.incomeByCategory}
                maxItems={5}
              />
            </View>
          </View>
        )}

        {/* Expenses by Category */}
        {data?.expensesByCategory && data.expensesByCategory.length > 0 && (
          <View className="mb-4">
            <Text className="mb-3 text-lg font-semibold text-foreground">
              Expenses by Category
            </Text>
            <View className="rounded-xl bg-muted p-4">
              <CategoryBreakdownChart
                data={data.expensesByCategory}
                maxItems={5}
              />
            </View>
          </View>
        )}

        {/* Export Button */}
        {data && (
          <View className="mb-4">
            <ExportButton onExport={handleExport} label="Export P&L Report" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
