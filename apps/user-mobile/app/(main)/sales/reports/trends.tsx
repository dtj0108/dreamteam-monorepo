import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useSalesTrends } from "../../../../lib/hooks/useSalesAnalytics";
import { formatCurrency } from "../../../../lib/types/sales";

export default function TrendsReportScreen() {
  const router = useRouter();
  const { data: trends, isLoading } = useSalesTrends();

  const handleBack = () => {
    router.back();
  };

  // Calculate totals for the period
  const totals = trends?.reduce(
    (acc, period) => ({
      newLeads: acc.newLeads + period.newLeads,
      qualifiedLeads: acc.qualifiedLeads + period.qualifiedLeads,
      wonDeals: acc.wonDeals + period.wonDeals,
      revenue: acc.revenue + period.revenue,
    }),
    { newLeads: 0, qualifiedLeads: 0, wonDeals: 0, revenue: 0 }
  ) || { newLeads: 0, qualifiedLeads: 0, wonDeals: 0, revenue: 0 };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-muted px-4 py-3">
        <Pressable
          className="flex-row items-center active:opacity-70"
          onPress={handleBack}
        >
          <FontAwesome name="chevron-left" size={16} color="#0ea5e9" />
          <Text className="ml-2 text-primary">Reports</Text>
        </Pressable>
        <Text className="text-lg font-semibold text-foreground">Trends</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center py-12">
            <ActivityIndicator size="large" color="#0ea5e9" />
          </View>
        ) : (
          <>
            {/* Period Totals */}
            <View className="px-4 py-4">
              <Text className="mb-3 text-sm font-medium text-muted-foreground">
                PERIOD TOTALS
              </Text>
              <View className="flex-row flex-wrap gap-3">
                <View className="min-w-[45%] flex-1 rounded-xl bg-muted p-4">
                  <Text className="text-xs text-muted-foreground">New Leads</Text>
                  <Text className="mt-1 text-2xl font-bold text-foreground">
                    {totals.newLeads}
                  </Text>
                </View>
                <View className="min-w-[45%] flex-1 rounded-xl bg-muted p-4">
                  <Text className="text-xs text-muted-foreground">Qualified</Text>
                  <Text className="mt-1 text-2xl font-bold text-foreground">
                    {totals.qualifiedLeads}
                  </Text>
                </View>
                <View className="min-w-[45%] flex-1 rounded-xl bg-muted p-4">
                  <Text className="text-xs text-muted-foreground">Won Deals</Text>
                  <Text className="mt-1 text-2xl font-bold text-green-600">
                    {totals.wonDeals}
                  </Text>
                </View>
                <View className="min-w-[45%] flex-1 rounded-xl bg-muted p-4">
                  <Text className="text-xs text-muted-foreground">Revenue</Text>
                  <Text className="mt-1 text-2xl font-bold text-foreground">
                    {formatCurrency(totals.revenue)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Trend by Period */}
            <View className="px-4 py-4">
              <Text className="mb-3 text-sm font-medium text-muted-foreground">
                BY PERIOD
              </Text>
              {trends && trends.length > 0 ? (
                <View className="rounded-xl bg-muted">
                  {trends.map((period, index) => (
                    <View
                      key={period.period}
                      className={`p-4 ${
                        index < trends.length - 1 ? "border-b border-background" : ""
                      }`}
                    >
                      <Text className="mb-2 font-semibold text-foreground">
                        {period.label}
                      </Text>
                      <View className="flex-row flex-wrap gap-4">
                        <View className="flex-row items-center">
                          <View className="h-2 w-2 rounded-full bg-blue-500" />
                          <Text className="ml-1.5 text-sm text-muted-foreground">
                            {period.newLeads} new
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <View className="h-2 w-2 rounded-full bg-purple-500" />
                          <Text className="ml-1.5 text-sm text-muted-foreground">
                            {period.qualifiedLeads} qualified
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <View className="h-2 w-2 rounded-full bg-green-500" />
                          <Text className="ml-1.5 text-sm text-muted-foreground">
                            {period.wonDeals} won
                          </Text>
                        </View>
                      </View>
                      <Text className="mt-2 text-sm font-medium text-foreground">
                        {formatCurrency(period.revenue)} revenue
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="items-center rounded-xl bg-muted p-8">
                  <FontAwesome name="line-chart" size={32} color="#d1d5db" />
                  <Text className="mt-2 text-muted-foreground">
                    No trend data available
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
