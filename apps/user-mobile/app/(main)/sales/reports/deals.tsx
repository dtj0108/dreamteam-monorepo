import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useDealMetrics } from "../../../../lib/hooks/useSalesAnalytics";
import {
  formatCurrency,
  getOpportunityStageLabel,
  OPPORTUNITY_STAGE_COLORS,
} from "../../../../lib/types/sales";

export default function DealsReportScreen() {
  const router = useRouter();
  const { data: dealMetrics, isLoading } = useDealMetrics();

  const handleBack = () => {
    router.back();
  };

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
        <Text className="text-lg font-semibold text-foreground">
          Deal Analysis
        </Text>
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
            {/* Pipeline Value Summary */}
            <View className="px-4 py-4">
              <Text className="mb-2 text-sm font-medium text-muted-foreground">
                PIPELINE VALUE
              </Text>
              <View className="rounded-xl bg-muted p-4">
                <View className="flex-row items-center justify-between border-b border-background pb-3">
                  <Text className="text-foreground">Total Pipeline</Text>
                  <Text className="text-xl font-bold text-foreground">
                    {formatCurrency(dealMetrics?.summary.totalPipelineValue || 0)}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between pt-3">
                  <Text className="text-foreground">Expected (Weighted)</Text>
                  <Text className="text-lg font-semibold text-primary">
                    {formatCurrency(dealMetrics?.summary.expectedRevenue || 0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Won vs Lost */}
            <View className="px-4 py-2">
              <View className="flex-row gap-3">
                <View className="flex-1 rounded-xl bg-green-50 p-4">
                  <Text className="text-xs text-green-600">WON</Text>
                  <Text className="mt-1 text-2xl font-bold text-green-700">
                    {formatCurrency(dealMetrics?.summary.wonValue || 0)}
                  </Text>
                </View>
                <View className="flex-1 rounded-xl bg-red-50 p-4">
                  <Text className="text-xs text-red-600">LOST</Text>
                  <Text className="mt-1 text-2xl font-bold text-red-700">
                    {formatCurrency(dealMetrics?.summary.lostValue || 0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Key Metrics */}
            <View className="px-4 py-4">
              <Text className="mb-2 text-sm font-medium text-muted-foreground">
                KEY METRICS
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1 rounded-xl bg-muted p-4">
                  <Text className="text-xs text-muted-foreground">
                    Avg Deal Size
                  </Text>
                  <Text className="mt-1 text-xl font-bold text-foreground">
                    {formatCurrency(dealMetrics?.summary.avgDealSize || 0)}
                  </Text>
                </View>
                <View className="flex-1 rounded-xl bg-muted p-4">
                  <Text className="text-xs text-muted-foreground">
                    Avg Time to Close
                  </Text>
                  <Text className="mt-1 text-xl font-bold text-foreground">
                    {dealMetrics?.summary.avgTimeToClose || 0} days
                  </Text>
                </View>
              </View>
            </View>

            {/* By Stage */}
            <View className="px-4 py-4">
              <Text className="mb-2 text-sm font-medium text-muted-foreground">
                BY STAGE
              </Text>
              <View className="rounded-xl bg-muted">
                {dealMetrics?.byStage.map((stage, index) => (
                  <View
                    key={stage.stage}
                    className={`flex-row items-center justify-between p-4 ${
                      index < (dealMetrics?.byStage.length || 0) - 1
                        ? "border-b border-background"
                        : ""
                    }`}
                  >
                    <View className="flex-row items-center">
                      <View
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: OPPORTUNITY_STAGE_COLORS[stage.stage],
                        }}
                      />
                      <Text className="ml-2 text-foreground">
                        {getOpportunityStageLabel(stage.stage)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-semibold text-foreground">
                        {formatCurrency(stage.value)}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {stage.count} deals
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Deals Nearing Close */}
            {dealMetrics?.nearingClose && dealMetrics.nearingClose.length > 0 && (
              <View className="px-4 py-4">
                <Text className="mb-2 text-sm font-medium text-muted-foreground">
                  NEARING CLOSE
                </Text>
                <View className="rounded-xl bg-muted">
                  {dealMetrics.nearingClose.slice(0, 5).map((deal, index) => (
                    <View
                      key={deal.id}
                      className={`p-4 ${
                        index < dealMetrics.nearingClose.length - 1
                          ? "border-b border-background"
                          : ""
                      }`}
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="font-medium text-foreground">
                          {deal.name}
                        </Text>
                        <Text className="font-semibold text-foreground">
                          {formatCurrency(deal.value)}
                        </Text>
                      </View>
                      <View className="mt-1 flex-row items-center">
                        <FontAwesome name="calendar" size={10} color="#9ca3af" />
                        <Text className="ml-1 text-xs text-muted-foreground">
                          {new Date(deal.expectedCloseDate).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" }
                          )}
                        </Text>
                        <Text className="ml-2 text-xs text-muted-foreground">
                          • {deal.probability}% probability
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
