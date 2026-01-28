import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Colors } from "@/constants/Colors";
import { useBudgetAlerts } from "@/lib/hooks/useBudgets";
import { BudgetAlert } from "@/lib/types/finance";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(amount));
};

const PERIOD_LABELS: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

interface BudgetAlertsListProps {
  threshold?: number;
  maxItems?: number;
  onViewAll?: () => void;
}

export function BudgetAlertsList({
  threshold = 80,
  maxItems,
  onViewAll,
}: BudgetAlertsListProps) {
  const router = useRouter();
  const { data, isLoading } = useBudgetAlerts(threshold);

  const alerts = data?.alerts ?? [];
  const displayedAlerts = maxItems ? alerts.slice(0, maxItems) : alerts;
  const hasMore = maxItems ? alerts.length > maxItems : false;

  if (isLoading) {
    return (
      <View className="items-center justify-center py-8">
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  if (alerts.length === 0) {
    return (
      <View className="items-center justify-center py-8">
        <FontAwesome name="line-chart" size={32} color={Colors.mutedForeground} />
        <Text className="mt-3 font-medium text-foreground">
          All budgets on track
        </Text>
        <Text className="mt-1 text-center text-sm text-muted-foreground">
          No budgets are approaching or exceeding their limits
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      {displayedAlerts.map((alert) => (
        <BudgetAlertCard
          key={alert.id}
          alert={alert}
          onPress={() => router.push(`/(main)/finance/budgets/${alert.id}`)}
        />
      ))}

      {hasMore && onViewAll && (
        <Pressable
          className="items-center py-3"
          onPress={onViewAll}
        >
          <Text className="font-medium text-primary">
            View All ({alerts.length} alerts)
          </Text>
        </Pressable>
      )}
    </View>
  );
}

interface BudgetAlertCardProps {
  alert: BudgetAlert;
  onPress: () => void;
}

function BudgetAlertCard({ alert, onPress }: BudgetAlertCardProps) {
  const isExceeded = alert.status === "exceeded";
  const progressPercent = Math.min(alert.percentUsed, 100);

  return (
    <Pressable
      className={`rounded-xl p-4 active:opacity-70 ${
        isExceeded
          ? "border border-red-400 bg-red-50"
          : "border border-amber-400 bg-amber-50"
      }`}
      onPress={onPress}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center">
          {/* Icon */}
          <View
            className={`h-10 w-10 items-center justify-center rounded-lg ${
              isExceeded ? "bg-red-100" : "bg-amber-100"
            }`}
          >
            <FontAwesome
              name={isExceeded ? "exclamation-triangle" : "warning"}
              size={18}
              color={isExceeded ? "#ef4444" : "#f59e0b"}
            />
          </View>

          <View className="ml-3 flex-1">
            <Text className="font-semibold text-foreground">
              {alert.category?.name || "Unknown Category"}
            </Text>

            {/* Progress Bar */}
            <View className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
              <View
                className={`h-full rounded-full ${
                  isExceeded ? "bg-red-500" : "bg-amber-500"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </View>

            <Text className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(alert.spent)} of {formatCurrency(alert.amount)} (
              {PERIOD_LABELS[alert.period] || alert.period})
            </Text>
          </View>
        </View>

        <View className="ml-3 items-end">
          <View
            className={`rounded-full px-2 py-1 ${
              isExceeded ? "bg-red-500" : "bg-amber-500"
            }`}
          >
            <Text className="text-xs font-medium text-white">
              {isExceeded ? "Over Budget" : "Warning"}
            </Text>
          </View>
          <Text className="mt-1 text-sm font-bold text-muted-foreground">
            {alert.percentUsed.toFixed(0)}%
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// Compact version for dashboard
export function BudgetAlertsCompact() {
  const router = useRouter();
  const { data, isLoading } = useBudgetAlerts(80);

  const totalAlerts = data?.totalAlerts ?? 0;
  const exceededCount = data?.exceededCount ?? 0;
  const warningCount = data?.warningCount ?? 0;

  if (isLoading || totalAlerts === 0) {
    return null;
  }

  return (
    <Pressable
      className={`flex-row items-center rounded-xl p-3 ${
        exceededCount > 0
          ? "bg-red-500/10"
          : "bg-amber-500/10"
      }`}
      onPress={() => router.push("/(main)/finance/budgets")}
    >
      <FontAwesome
        name={exceededCount > 0 ? "exclamation-circle" : "warning"}
        size={16}
        color={exceededCount > 0 ? "#ef4444" : "#f59e0b"}
      />
      <Text
        className={`ml-2 flex-1 ${
          exceededCount > 0 ? "text-red-600" : "text-amber-600"
        }`}
      >
        {exceededCount > 0
          ? `${exceededCount} budget${exceededCount > 1 ? "s" : ""} exceeded`
          : `${warningCount} budget${warningCount > 1 ? "s" : ""} approaching limit`}
      </Text>
      <FontAwesome
        name="chevron-right"
        size={12}
        color={exceededCount > 0 ? "#ef4444" : "#f59e0b"}
      />
    </Pressable>
  );
}
