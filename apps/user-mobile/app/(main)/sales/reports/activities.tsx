import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useActivityMetrics } from "../../../../lib/hooks/useSalesAnalytics";
import { ACTIVITY_TYPE_COLORS, ACTIVITY_TYPE_EMOJIS } from "../../../../lib/types/sales";

export default function ActivitiesReportScreen() {
  const router = useRouter();
  const { data: activityMetrics, isLoading } = useActivityMetrics();

  const handleBack = () => {
    router.back();
  };

  const summary = activityMetrics?.summary;

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
          Activity Metrics
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
            {/* Total Activities */}
            <View className="items-center border-b border-muted py-6">
              <Text className="text-sm text-muted-foreground">
                TOTAL ACTIVITIES
              </Text>
              <Text className="mt-1 text-4xl font-bold text-foreground">
                {summary?.totalActivities || 0}
              </Text>
            </View>

            {/* Activity Breakdown */}
            <View className="px-4 py-4">
              <Text className="mb-3 text-sm font-medium text-muted-foreground">
                BY TYPE
              </Text>
              <View className="flex-row flex-wrap gap-3">
                <ActivityCard
                  emoji={ACTIVITY_TYPE_EMOJIS.call}
                  label="Calls"
                  count={summary?.callsMade || 0}
                  color={ACTIVITY_TYPE_COLORS.call}
                />
                <ActivityCard
                  emoji={ACTIVITY_TYPE_EMOJIS.email}
                  label="Emails"
                  count={summary?.emailsSent || 0}
                  color={ACTIVITY_TYPE_COLORS.email}
                />
                <ActivityCard
                  emoji={ACTIVITY_TYPE_EMOJIS.meeting}
                  label="Meetings"
                  count={summary?.meetingsHeld || 0}
                  color={ACTIVITY_TYPE_COLORS.meeting}
                />
                <ActivityCard
                  emoji={ACTIVITY_TYPE_EMOJIS.task}
                  label="Tasks Done"
                  count={summary?.tasksCompleted || 0}
                  color={ACTIVITY_TYPE_COLORS.task}
                />
              </View>
            </View>

            {/* Trend Chart Placeholder */}
            <View className="px-4 py-4">
              <Text className="mb-3 text-sm font-medium text-muted-foreground">
                ACTIVITY TREND
              </Text>
              <View className="rounded-xl bg-muted p-4">
                {activityMetrics?.trend && activityMetrics.trend.length > 0 ? (
                  <View className="gap-2">
                    {activityMetrics.trend.slice(-5).map((period) => (
                      <View
                        key={period.period}
                        className="flex-row items-center justify-between"
                      >
                        <Text className="text-foreground">{period.period}</Text>
                        <Text className="text-muted-foreground">
                          {period.calls + period.emails + period.meetings + period.tasks}{" "}
                          activities
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text className="text-center text-muted-foreground">
                    No trend data available
                  </Text>
                )}
              </View>
            </View>

            {/* Most Active Leads */}
            {activityMetrics?.byLead && activityMetrics.byLead.length > 0 && (
              <View className="px-4 py-4">
                <Text className="mb-3 text-sm font-medium text-muted-foreground">
                  MOST ACTIVE LEADS
                </Text>
                <View className="rounded-xl bg-muted">
                  {activityMetrics.byLead.slice(0, 5).map((lead, index) => (
                    <View
                      key={lead.leadId}
                      className={`flex-row items-center justify-between p-4 ${
                        index < activityMetrics.byLead.length - 1
                          ? "border-b border-background"
                          : ""
                      }`}
                    >
                      <Text className="text-foreground">{lead.leadName}</Text>
                      <View className="flex-row items-center">
                        <Text className="font-semibold text-foreground">
                          {lead.activityCount}
                        </Text>
                        <Text className="ml-1 text-xs text-muted-foreground">
                          activities
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

function ActivityCard({
  emoji,
  label,
  count,
  color,
}: {
  emoji: string;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <View
      className="min-w-[45%] flex-1 rounded-xl p-4"
      style={{ backgroundColor: color + "15" }}
    >
      <Text className="text-2xl">{emoji}</Text>
      <Text className="mt-2 text-2xl font-bold" style={{ color }}>
        {count}
      </Text>
      <Text className="text-sm text-muted-foreground">{label}</Text>
    </View>
  );
}
