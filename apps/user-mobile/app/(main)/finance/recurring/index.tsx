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

import { RecurringRuleCard } from "@/components/finance/RecurringRuleCard";
import { Loading } from "@/components/Loading";
import { Colors } from "@/constants/Colors";
import {
  useRecurringRules,
  useUpcomingRecurring,
} from "@/lib/hooks/useRecurringRules";

type TabType = "active" | "paused";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(amount));
};

export default function RecurringRulesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("active");

  const { data, isLoading, refetch, isRefetching } = useRecurringRules({
    includeInactive: true,
  });
  const { data: upcomingData } = useUpcomingRecurring(7);

  const rules = data?.rules ?? [];
  const totals = data?.totals ?? {
    activeCount: 0,
    pausedCount: 0,
    upcomingThisWeek: 0,
  };

  const activeRules = rules.filter((r) => r.is_active);
  const pausedRules = rules.filter((r) => !r.is_active);
  const displayedRules = activeTab === "active" ? activeRules : pausedRules;

  const upcomingCount = upcomingData?.rules?.length ?? 0;

  // Calculate monthly estimated amount from active rules
  const monthlyEstimate = activeRules.reduce((total, rule) => {
    const amount = Math.abs(rule.amount);
    switch (rule.frequency) {
      case "daily":
        return total + amount * 30;
      case "weekly":
        return total + amount * 4;
      case "biweekly":
        return total + amount * 2;
      case "monthly":
        return total + amount;
      case "quarterly":
        return total + amount / 3;
      case "yearly":
        return total + amount / 12;
      default:
        return total + amount;
    }
  }, 0);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <View className="flex-row items-center">
            <Pressable onPress={() => router.back()} className="mr-3">
              <FontAwesome
                name="chevron-left"
                size={18}
                color={Colors.primary}
              />
            </Pressable>
            <View>
              <Text className="text-2xl font-bold text-foreground">
                Recurring Rules
              </Text>
              <Text className="text-muted-foreground">
                Automate transaction creation
              </Text>
            </View>
          </View>
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full bg-primary"
            onPress={() => router.push("/(main)/finance/recurring/new")}
          >
            <FontAwesome name="plus" size={18} color="white" />
          </Pressable>
        </View>

        {/* Summary Cards */}
        <View className="mb-4 flex-row gap-3">
          <View className="flex-1 rounded-xl bg-muted p-3">
            <Text className="text-sm text-muted-foreground">Est. Monthly</Text>
            <Text className="text-xl font-bold text-foreground">
              {formatCurrency(monthlyEstimate)}
            </Text>
          </View>
          <View className="flex-1 rounded-xl bg-muted p-3">
            <Text className="text-sm text-muted-foreground">Active Rules</Text>
            <Text className="text-xl font-bold text-foreground">
              {totals.activeCount}
            </Text>
          </View>
          <View className="flex-1 rounded-xl bg-muted p-3">
            <Text className="text-sm text-muted-foreground">This Week</Text>
            <Text className="text-xl font-bold text-foreground">
              {totals.upcomingThisWeek}
            </Text>
          </View>
        </View>

        {/* Upcoming Alert */}
        {upcomingCount > 0 && (
          <View className="mb-4 flex-row items-center rounded-xl bg-emerald-500/10 p-3">
            <FontAwesome name="calendar-check-o" size={16} color="#22c55e" />
            <Text className="ml-2 flex-1 text-emerald-600">
              {upcomingCount} transaction{upcomingCount > 1 ? "s" : ""} scheduled this week
            </Text>
            <FontAwesome name="chevron-right" size={12} color="#22c55e" />
          </View>
        )}

        {/* Tabs */}
        <View className="mb-4 flex-row gap-2">
          <TabButton
            label={`Active (${activeRules.length})`}
            active={activeTab === "active"}
            onPress={() => setActiveTab("active")}
          />
          <TabButton
            label={`Paused (${pausedRules.length})`}
            active={activeTab === "paused"}
            onPress={() => setActiveTab("paused")}
          />
        </View>

        {/* Loading State */}
        {isLoading && <Loading />}

        {/* Rules List */}
        {!isLoading && (
          <>
            {displayedRules.length > 0 ? (
              <View className="gap-3">
                {displayedRules.map((rule) => (
                  <RecurringRuleCard
                    key={rule.id}
                    rule={rule}
                    onPress={() =>
                      router.push(`/(main)/finance/recurring/${rule.id}`)
                    }
                  />
                ))}
              </View>
            ) : (
              <View className="items-center py-8">
                <FontAwesome
                  name="refresh"
                  size={48}
                  color={Colors.mutedForeground}
                />
                <Text className="mt-4 text-lg font-medium text-foreground">
                  {activeTab === "active"
                    ? "No active recurring rules"
                    : "No paused recurring rules"}
                </Text>
                <Text className="mt-1 text-center text-muted-foreground">
                  {activeTab === "active"
                    ? "Set up rules to auto-create transactions on a schedule"
                    : "Paused rules will appear here"}
                </Text>
                {activeTab === "active" && (
                  <Pressable
                    className="mt-4 rounded-lg bg-primary px-6 py-3"
                    onPress={() =>
                      router.push("/(main)/finance/recurring/new")
                    }
                  >
                    <Text className="font-medium text-white">
                      Add Recurring Rule
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`rounded-full px-4 py-2 ${active ? "bg-primary" : "bg-muted"}`}
      onPress={onPress}
    >
      <Text
        className={`text-sm font-medium ${
          active ? "text-white" : "text-muted-foreground"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
