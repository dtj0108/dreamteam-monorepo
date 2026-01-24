import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useConversionFunnel } from "../../../../lib/hooks/useSalesAnalytics";
import { FunnelChart, FunnelStageBreakdown } from "../../../../components/sales/FunnelChart";

export default function FunnelReportScreen() {
  const router = useRouter();
  const { data: funnelData, isLoading } = useConversionFunnel();

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
          Conversion Funnel
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
            {/* Overall Conversion Rate */}
            <View className="items-center border-b border-muted py-6">
              <Text className="text-sm text-muted-foreground">
                OVERALL CONVERSION
              </Text>
              <Text className="mt-1 text-4xl font-bold text-foreground">
                {funnelData?.overallConversionRate || 0}%
              </Text>
              <Text className="mt-1 text-sm text-muted-foreground">
                Leads → Won Deals
              </Text>
            </View>

            {/* Funnel Visualization */}
            <View className="px-4 py-6">
              <Text className="mb-4 text-lg font-semibold text-foreground">
                Pipeline Stages
              </Text>
              <FunnelChart stages={funnelData?.stages || []} />
            </View>

            {/* Stage Breakdown */}
            <View className="px-4">
              <Text className="mb-2 text-lg font-semibold text-foreground">
                Stage Conversions
              </Text>
              <FunnelStageBreakdown stages={funnelData?.stages || []} />
            </View>

            {/* Insights */}
            <View className="mt-6 px-4">
              <Text className="mb-2 text-lg font-semibold text-foreground">
                Insights
              </Text>
              <View className="rounded-xl bg-muted p-4">
                {funnelData?.stages && funnelData.stages.length > 1 ? (
                  <>
                    <InsightItem
                      icon="check-circle"
                      iconColor="#22c55e"
                      text={`${funnelData.stages[0]?.count || 0} leads entered the pipeline`}
                    />
                    <InsightItem
                      icon="arrow-right"
                      iconColor="#3b82f6"
                      text={`${funnelData.overallConversionRate}% overall conversion rate`}
                    />
                    {funnelData.stages.some((s) => s.conversionRate < 30) && (
                      <InsightItem
                        icon="exclamation-triangle"
                        iconColor="#f59e0b"
                        text="Some stages have low conversion rates"
                      />
                    )}
                  </>
                ) : (
                  <Text className="text-muted-foreground">
                    Not enough data for insights
                  </Text>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InsightItem({
  icon,
  iconColor,
  text,
}: {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  iconColor: string;
  text: string;
}) {
  return (
    <View className="mb-2 flex-row items-center last:mb-0">
      <FontAwesome name={icon} size={14} color={iconColor} />
      <Text className="ml-2 flex-1 text-foreground">{text}</Text>
    </View>
  );
}
