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

import {
  CashFlowChart,
  DateRangePicker,
  MetricCard,
} from "@/components/finance";
import { ExportButton } from "@/components/finance/ExportButton";
import { Loading } from "@/components/Loading";
import { Colors } from "@/constants/Colors";
import { useCashFlow } from "@/lib/hooks/useAnalytics";
import { CashFlowGroupBy, DateRange } from "@/lib/types/finance";
import {
  cashFlowToCSV,
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

const GROUP_BY_OPTIONS: { key: CashFlowGroupBy; label: string }[] = [
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
];

export default function CashFlowScreen() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [groupBy, setGroupBy] = useState<CashFlowGroupBy>("month");
  const { data, isLoading, refetch } = useCashFlow(groupBy, dateRange);

  const handleExport = async () => {
    if (!data) return;
    const csv = cashFlowToCSV(data);
    await exportCSV({
      filename: getExportFilename("cash_flow_report"),
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

  const netCashFlow = data?.summary.netCashFlow ?? 0;

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
              Cash Flow
            </Text>
          </View>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </View>

        {/* Net Cash Flow Hero */}
        <View className="mb-6 items-center rounded-xl bg-muted p-6">
          <Text className="text-muted-foreground">Net Cash Flow</Text>
          <Text
            className="text-4xl font-bold"
            style={{
              color: netCashFlow >= 0 ? Colors.success : Colors.destructive,
            }}
          >
            {formatCurrency(netCashFlow)}
          </Text>
          <View className="mt-2 flex-row items-center gap-2">
            <Text className="text-muted-foreground">Avg per Period:</Text>
            <Text
              className="font-semibold"
              style={{
                color:
                  (data?.summary.averageNetFlow ?? 0) >= 0
                    ? Colors.success
                    : Colors.destructive,
              }}
            >
              {formatCurrency(data?.summary.averageNetFlow ?? 0)}
            </Text>
          </View>
        </View>

        {/* Group By Toggle */}
        <View className="mb-4">
          <View className="flex-row gap-2">
            {GROUP_BY_OPTIONS.map((option) => {
              const isSelected = groupBy === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setGroupBy(option.key)}
                  className={`flex-1 rounded-lg py-2 ${
                    isSelected ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <Text
                    className={`text-center font-medium ${
                      isSelected ? "text-white" : "text-muted-foreground"
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Summary Metrics */}
        <View className="mb-6">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <MetricCard
                title="Total Inflow"
                value={formatCurrency(data?.summary.totalInflow ?? 0)}
                color={Colors.success}
              />
            </View>
            <View className="flex-1">
              <MetricCard
                title="Total Outflow"
                value={formatCurrency(data?.summary.totalOutflow ?? 0)}
                color={Colors.destructive}
              />
            </View>
          </View>
        </View>

        {/* Cash Flow Chart */}
        {data?.trend && data.trend.length > 0 && (
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-foreground">
              Flow Over Time
            </Text>
            <View className="rounded-xl bg-muted p-4">
              <CashFlowChart data={data.trend} height={220} />
            </View>
          </View>
        )}

        {/* Period Details */}
        {data?.trend && data.trend.length > 0 && (
          <View className="mb-4">
            <Text className="mb-3 text-lg font-semibold text-foreground">
              Period Details
            </Text>
            <View className="gap-2">
              {data.trend.slice(0, 6).map((period, index) => (
                <View key={index} className="rounded-xl bg-muted p-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-medium text-foreground">
                      {period.period}
                    </Text>
                    <Text
                      className="font-semibold"
                      style={{
                        color:
                          period.netFlow >= 0
                            ? Colors.success
                            : Colors.destructive,
                      }}
                    >
                      {formatCurrency(period.netFlow)}
                    </Text>
                  </View>
                  <View className="mt-2 flex-row justify-between">
                    <Text className="text-sm text-muted-foreground">
                      In: {formatCurrency(period.inflow)}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      Out: {formatCurrency(period.outflow)}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      Balance: {formatCurrency(period.runningBalance)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Export Button */}
        {data && (
          <View className="mb-4">
            <ExportButton onExport={handleExport} label="Export Cash Flow Report" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
