import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useSalesOverview } from "../../../../lib/hooks/useSalesAnalytics";
import { formatCurrency } from "../../../../lib/types/sales";

export default function ReportsDashboardScreen() {
  const router = useRouter();
  const { data: overview, isLoading } = useSalesOverview();

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
          <Text className="ml-2 text-primary">Back</Text>
        </Pressable>
        <Text className="text-lg font-semibold text-foreground">Reports</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Overview Header */}
        <View className="px-4 py-4">
          <Text className="text-2xl font-bold text-foreground">
            Sales Performance
          </Text>
          <Text className="mt-1 text-muted-foreground">
            Track your pipeline and conversions
          </Text>
        </View>

        {/* Quick Stats */}
        {isLoading ? (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color="#0ea5e9" />
          </View>
        ) : (
          <View className="px-4">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              THIS PERIOD
            </Text>
            <View className="flex-row flex-wrap gap-3">
              <View className="min-w-[45%] flex-1 rounded-xl bg-muted p-4">
                <Text className="text-xs text-muted-foreground">New Leads</Text>
                <View className="mt-1 flex-row items-baseline">
                  <Text className="text-2xl font-bold text-foreground">
                    {overview?.summary.newLeads || 0}
                  </Text>
                  {overview?.changes.leads !== undefined && (
                    <Text
                      className={`ml-2 text-xs ${
                        overview.changes.leads >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {overview.changes.leads >= 0 ? "+" : ""}
                      {overview.changes.leads}%
                    </Text>
                  )}
                </View>
              </View>

              <View className="min-w-[45%] flex-1 rounded-xl bg-muted p-4">
                <Text className="text-xs text-muted-foreground">Won Deals</Text>
                <View className="mt-1 flex-row items-baseline">
                  <Text className="text-2xl font-bold text-foreground">
                    {overview?.summary.wonDeals || 0}
                  </Text>
                  {overview?.changes.deals !== undefined && (
                    <Text
                      className={`ml-2 text-xs ${
                        overview.changes.deals >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {overview.changes.deals >= 0 ? "+" : ""}
                      {overview.changes.deals}%
                    </Text>
                  )}
                </View>
              </View>

              <View className="min-w-[45%] flex-1 rounded-xl bg-muted p-4">
                <Text className="text-xs text-muted-foreground">
                  Pipeline Value
                </Text>
                <Text className="mt-1 text-2xl font-bold text-foreground">
                  {formatCurrency(overview?.pipelineValue.total || 0)}
                </Text>
              </View>

              <View className="min-w-[45%] flex-1 rounded-xl bg-muted p-4">
                <Text className="text-xs text-muted-foreground">
                  Conversion Rate
                </Text>
                <Text className="mt-1 text-2xl font-bold text-foreground">
                  {overview?.summary.conversionRate || 0}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Report Links */}
        <View className="mt-6 px-4">
          <Text className="mb-2 text-sm font-medium text-muted-foreground">
            DETAILED REPORTS
          </Text>
          <View className="gap-2">
            <ReportCard
              icon="filter"
              iconColor="#8b5cf6"
              title="Conversion Funnel"
              subtitle="Leads → Won tracking"
              onPress={() => router.push("/(main)/sales/reports/funnel")}
            />
            <ReportCard
              icon="dollar"
              iconColor="#22c55e"
              title="Deal Analysis"
              subtitle="Pipeline value & forecasts"
              onPress={() => router.push("/(main)/sales/reports/deals")}
            />
            <ReportCard
              icon="history"
              iconColor="#3b82f6"
              title="Activity Metrics"
              subtitle="Calls, emails, meetings"
              onPress={() => router.push("/(main)/sales/reports/activities")}
            />
            <ReportCard
              icon="line-chart"
              iconColor="#f59e0b"
              title="Trends"
              subtitle="Weekly & monthly analysis"
              onPress={() => router.push("/(main)/sales/reports/trends")}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ReportCard({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-xl bg-muted p-4 active:opacity-70"
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: iconColor + "20" }}
      >
        <FontAwesome name={icon} size={18} color={iconColor} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-medium text-foreground">{title}</Text>
        <Text className="text-sm text-muted-foreground">{subtitle}</Text>
      </View>
      <FontAwesome name="chevron-right" size={14} color="#9ca3af" />
    </Pressable>
  );
}
