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

import { BudgetAlertBadge } from "@/components/finance/BudgetAlertBadge";
import { BudgetAlertsCompact } from "@/components/finance/BudgetAlertsList";
import { Loading } from "@/components/Loading";
import { ProductSwitcher } from "@/components/ProductSwitcher";
import { Colors } from "@/constants/Colors";
import { useBudgets } from "@/lib/hooks/useBudgets";
import { Budget, BudgetPeriod, getBudgetProgressColor } from "@/lib/types/finance";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const PERIOD_OPTIONS: { value: BudgetPeriod | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const PERIOD_LABELS: Record<BudgetPeriod, string> = {
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export default function BudgetsScreen() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<BudgetPeriod | "all">("all");

  const { data, isLoading, refetch, isRefetching } = useBudgets(
    selectedPeriod === "all" ? undefined : { period: selectedPeriod }
  );

  const budgets = data?.budgets ?? [];
  const totals = data?.totals ?? {
    totalBudgeted: 0,
    totalSpent: 0,
    totalRemaining: 0,
    overBudgetCount: 0,
  };

  const hasBudgets = budgets.length > 0;

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={["top"]} className="bg-background">
        <View className="px-4 py-2">
          <ProductSwitcher />
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <View>
            <Text className="text-2xl font-bold text-foreground">Budgets</Text>
            <Text className="text-muted-foreground">Track spending limits</Text>
          </View>
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full bg-primary"
            onPress={() => router.push("/finance/budgets/new")}
          >
            <FontAwesome name="plus" size={18} color="white" />
          </Pressable>
        </View>

        {/* Summary Cards */}
        <View className="mb-4 flex-row gap-3">
          <View className="flex-1 rounded-xl bg-muted p-3">
            <Text className="text-sm text-muted-foreground">Budgeted</Text>
            <Text className="text-xl font-bold text-foreground">
              {formatCurrency(totals.totalBudgeted)}
            </Text>
          </View>
          <View className="flex-1 rounded-xl bg-muted p-3">
            <Text className="text-sm text-muted-foreground">Spent</Text>
            <Text className="text-xl font-bold text-foreground">
              {formatCurrency(totals.totalSpent)}
            </Text>
          </View>
          <View className="flex-1 rounded-xl bg-muted p-3">
            <Text className="text-sm text-muted-foreground">Remaining</Text>
            <Text
              className={`text-xl font-bold ${
                totals.totalRemaining >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatCurrency(totals.totalRemaining)}
            </Text>
          </View>
        </View>

        {/* Budget Alerts Banner */}
        <View className="mb-4">
          <BudgetAlertsCompact />
        </View>

        {/* Period Filter */}
        <View className="mb-4 flex-row gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              active={selectedPeriod === option.value}
              onPress={() => setSelectedPeriod(option.value)}
            />
          ))}
        </View>

        {/* Loading State */}
        {isLoading && <Loading />}

        {/* Budget List */}
        {!isLoading && (
          <>
            {hasBudgets ? (
              <View className="gap-3">
                {budgets.map((budget) => (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    onPress={() => router.push(`/finance/budgets/${budget.id}`)}
                  />
                ))}
              </View>
            ) : (
              /* Empty State */
              <View className="items-center py-8">
                <FontAwesome
                  name="pie-chart"
                  size={48}
                  color={Colors.mutedForeground}
                />
                <Text className="mt-4 text-lg font-medium text-foreground">
                  No budgets yet
                </Text>
                <Text className="mt-1 text-center text-muted-foreground">
                  Create a budget to track your spending by category
                </Text>
                <Pressable
                  className="mt-4 rounded-lg bg-primary px-6 py-3"
                  onPress={() => router.push("/finance/budgets/new")}
                >
                  <Text className="font-medium text-white">Create Budget</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function FilterChip({
  label,
  active = false,
  onPress,
}: {
  label: string;
  active?: boolean;
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

function BudgetCard({ budget, onPress }: { budget: Budget; onPress: () => void }) {
  const spent = budget.spent ?? 0;
  const percentUsed = budget.percentUsed ?? (spent / budget.amount) * 100;
  const remaining = budget.remaining ?? budget.amount - spent;
  const progressColor = getBudgetProgressColor(percentUsed);
  const progressWidth = Math.min(percentUsed, 100);

  return (
    <Pressable
      className="rounded-xl bg-muted p-4 active:opacity-70"
      onPress={onPress}
    >
      {/* Header */}
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View
            className="h-8 w-8 items-center justify-center rounded-lg"
            style={{
              backgroundColor: (budget.category?.color || Colors.mutedForeground) + "20",
            }}
          >
            <FontAwesome
              name={(budget.category?.icon as any) || "tag"}
              size={14}
              color={budget.category?.color || Colors.mutedForeground}
            />
          </View>
          <Text className="ml-3 font-semibold text-foreground" numberOfLines={1}>
            {budget.category?.name || "Uncategorized"}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <BudgetAlertBadge percentUsed={percentUsed} compact />
        </View>
      </View>

      {/* Progress Bar */}
      <View className="mb-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <View
          className="h-full rounded-full"
          style={{
            width: `${progressWidth}%`,
            backgroundColor: progressColor,
          }}
        />
      </View>

      {/* Stats */}
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-muted-foreground">
          {formatCurrency(spent)} / {formatCurrency(budget.amount)}
        </Text>
        <Text
          className="text-sm font-medium"
          style={{ color: progressColor }}
        >
          {remaining >= 0
            ? `${formatCurrency(remaining)} left`
            : `${formatCurrency(Math.abs(remaining))} over`}
        </Text>
      </View>

      {/* Percentage */}
      <View className="mt-1 flex-row justify-end">
        <Text
          className="text-xs font-medium"
          style={{ color: progressColor }}
        >
          {Math.round(percentUsed)}%
        </Text>
      </View>
    </Pressable>
  );
}
