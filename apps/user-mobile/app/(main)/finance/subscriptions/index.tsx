import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SubscriptionCard } from "@/components/finance/SubscriptionCard";
import { Loading } from "@/components/Loading";
import { Colors } from "@/constants/Colors";
import {
  useDetectSubscriptions,
  useSubscriptions,
  useUpcomingSubscriptions,
} from "@/lib/hooks/useSubscriptions";

type TabType = "active" | "paused";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(amount));
};

export default function SubscriptionsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("active");

  const { data, isLoading, refetch, isRefetching } = useSubscriptions({
    includeInactive: true,
  });
  const { data: upcomingData } = useUpcomingSubscriptions(7);
  const detectMutation = useDetectSubscriptions();

  const subscriptions = data?.subscriptions ?? [];
  const totals = data?.totals ?? {
    monthlyTotal: 0,
    activeCount: 0,
    upcomingThisWeek: 0,
  };

  const activeSubscriptions = subscriptions.filter((s) => s.is_active);
  const pausedSubscriptions = subscriptions.filter((s) => !s.is_active);
  const displayedSubscriptions =
    activeTab === "active" ? activeSubscriptions : pausedSubscriptions;

  const upcomingCount = upcomingData?.subscriptions?.length ?? 0;

  const handleDetect = async () => {
    try {
      const result = await detectMutation.mutateAsync();
      if (result.detected.length > 0) {
        Alert.alert(
          "Subscriptions Detected",
          `Found ${result.detected.length} potential subscription(s). This feature will be available soon.`
        );
      } else {
        Alert.alert(
          "No Subscriptions Found",
          "We couldn't detect any recurring payments from your transactions."
        );
      }
    } catch {
      Alert.alert("Error", "Failed to detect subscriptions. Please try again.");
    }
  };

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
                Subscriptions
              </Text>
              <Text className="text-muted-foreground">
                Manage recurring payments
              </Text>
            </View>
          </View>
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full bg-primary"
            onPress={() => router.push("/(main)/finance/subscriptions/new")}
          >
            <FontAwesome name="plus" size={18} color="white" />
          </Pressable>
        </View>

        {/* Summary Cards */}
        <View className="mb-4 flex-row gap-3">
          <View className="flex-1 rounded-xl bg-muted p-3">
            <Text className="text-sm text-muted-foreground">Monthly Cost</Text>
            <Text className="text-xl font-bold text-foreground">
              {formatCurrency(totals.monthlyTotal)}
            </Text>
          </View>
          <View className="flex-1 rounded-xl bg-muted p-3">
            <Text className="text-sm text-muted-foreground">Active</Text>
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

        {/* Upcoming Renewals Alert */}
        {upcomingCount > 0 && (
          <View className="mb-4 flex-row items-center rounded-xl bg-amber-500/10 p-3">
            <FontAwesome name="clock-o" size={16} color="#f59e0b" />
            <Text className="ml-2 flex-1 text-amber-600">
              {upcomingCount} subscription{upcomingCount > 1 ? "s" : ""} renewing
              this week
            </Text>
            <FontAwesome name="chevron-right" size={12} color="#f59e0b" />
          </View>
        )}

        {/* Detect Button */}
        <Pressable
          className="mb-4 flex-row items-center justify-center rounded-xl bg-primary/10 py-3"
          onPress={handleDetect}
          disabled={detectMutation.isPending}
        >
          {detectMutation.isPending ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              <FontAwesome name="magic" size={16} color={Colors.primary} />
              <Text className="ml-2 font-medium text-primary">
                Detect Subscriptions
              </Text>
            </>
          )}
        </Pressable>

        {/* Tabs */}
        <View className="mb-4 flex-row gap-2">
          <TabButton
            label={`Active (${activeSubscriptions.length})`}
            active={activeTab === "active"}
            onPress={() => setActiveTab("active")}
          />
          <TabButton
            label={`Paused (${pausedSubscriptions.length})`}
            active={activeTab === "paused"}
            onPress={() => setActiveTab("paused")}
          />
        </View>

        {/* Loading State */}
        {isLoading && <Loading />}

        {/* Subscription List */}
        {!isLoading && (
          <>
            {displayedSubscriptions.length > 0 ? (
              <View className="gap-3">
                {displayedSubscriptions.map((subscription) => (
                  <SubscriptionCard
                    key={subscription.id}
                    subscription={subscription}
                    onPress={() =>
                      router.push(
                        `/(main)/finance/subscriptions/${subscription.id}`
                      )
                    }
                  />
                ))}
              </View>
            ) : (
              <View className="items-center py-8">
                <FontAwesome
                  name="repeat"
                  size={48}
                  color={Colors.mutedForeground}
                />
                <Text className="mt-4 text-lg font-medium text-foreground">
                  {activeTab === "active"
                    ? "No active subscriptions"
                    : "No paused subscriptions"}
                </Text>
                <Text className="mt-1 text-center text-muted-foreground">
                  {activeTab === "active"
                    ? "Add a subscription or detect them from your transactions"
                    : "Paused subscriptions will appear here"}
                </Text>
                {activeTab === "active" && (
                  <Pressable
                    className="mt-4 rounded-lg bg-primary px-6 py-3"
                    onPress={() =>
                      router.push("/(main)/finance/subscriptions/new")
                    }
                  >
                    <Text className="font-medium text-white">
                      Add Subscription
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
