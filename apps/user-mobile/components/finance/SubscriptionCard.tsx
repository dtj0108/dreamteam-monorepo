import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Pressable, Text, View } from "react-native";

import { Colors } from "@/constants/Colors";
import { Subscription, SubscriptionFrequency } from "@/lib/types/finance";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(amount));
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const FREQUENCY_LABELS: Record<SubscriptionFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

const FREQUENCY_COLORS: Record<SubscriptionFrequency, string> = {
  daily: "#ef4444",
  weekly: "#f59e0b",
  biweekly: "#8b5cf6",
  monthly: "#0ea5e9",
  quarterly: "#22c55e",
  yearly: "#10b981",
};

interface SubscriptionCardProps {
  subscription: Subscription;
  onPress?: () => void;
}

export function SubscriptionCard({
  subscription,
  onPress,
}: SubscriptionCardProps) {
  const isUpcomingSoon = () => {
    const renewalDate = new Date(subscription.next_renewal_date);
    const now = new Date();
    const diffDays = Math.ceil(
      (renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays <= 7 && diffDays >= 0;
  };

  const frequencyColor = FREQUENCY_COLORS[subscription.frequency];
  const isPaused = !subscription.is_active;

  return (
    <Pressable
      className={`rounded-xl p-4 active:opacity-70 ${
        isPaused ? "bg-muted/50" : "bg-muted"
      }`}
      onPress={onPress}
    >
      {/* Header Row */}
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center">
          {/* Category Icon */}
          <View
            className="h-10 w-10 items-center justify-center rounded-lg"
            style={{
              backgroundColor:
                (subscription.category?.color || Colors.mutedForeground) + "20",
            }}
          >
            <FontAwesome
              name="credit-card"
              size={18}
              color={subscription.category?.color || Colors.mutedForeground}
            />
          </View>

          <View className="ml-3 flex-1">
            <View className="flex-row items-center">
              <Text
                className={`font-semibold ${
                  isPaused ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                {subscription.name}
              </Text>
              {isPaused && (
                <View className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5">
                  <Text className="text-xs text-amber-600">Paused</Text>
                </View>
              )}
            </View>
            <Text className="text-sm text-muted-foreground">
              {subscription.category?.name || "Uncategorized"}
            </Text>
          </View>
        </View>

        {/* Amount */}
        <View className="items-end">
          <Text
            className={`text-lg font-bold ${
              isPaused ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            {formatCurrency(subscription.amount)}
          </Text>
          <View
            className="mt-1 rounded-full px-2 py-0.5"
            style={{ backgroundColor: frequencyColor + "20" }}
          >
            <Text className="text-xs" style={{ color: frequencyColor }}>
              {FREQUENCY_LABELS[subscription.frequency]}
            </Text>
          </View>
        </View>
      </View>

      {/* Renewal Date Row */}
      <View className="mt-3 flex-row items-center justify-between border-t border-border/50 pt-3">
        <View className="flex-row items-center">
          <FontAwesome
            name="calendar"
            size={12}
            color={isUpcomingSoon() ? Colors.warning : Colors.mutedForeground}
          />
          <Text
            className={`ml-2 text-sm ${
              isUpcomingSoon()
                ? "font-medium text-amber-600"
                : "text-muted-foreground"
            }`}
          >
            {isUpcomingSoon() ? "Renews " : "Next: "}
            {formatDate(subscription.next_renewal_date)}
          </Text>
        </View>

        <FontAwesome
          name="chevron-right"
          size={12}
          color={Colors.mutedForeground}
        />
      </View>
    </Pressable>
  );
}
