import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Loading } from "@/components/Loading";
import { ProductSwitcher } from "@/components/ProductSwitcher";
import { Colors } from "@/constants/Colors";
import { useAccounts } from "@/lib/hooks/useAccounts";
import { useTransactions } from "@/lib/hooks/useTransactions";
import { getTransactionColor, Transaction } from "@/lib/types/finance";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

export default function DashboardScreen() {
  const router = useRouter();

  // Fetch accounts for net worth
  const {
    data: accountsData,
    isLoading: accountsLoading,
    refetch: refetchAccounts,
    isRefetching: accountsRefetching,
  } = useAccounts();

  // Fetch ALL transactions (no date filter) for metrics calculation
  const {
    data: allTransactionsData,
    isLoading: allTransactionsLoading,
    refetch: refetchAllTransactions,
    isRefetching: allTransactionsRefetching,
  } = useTransactions({});

  // Fetch recent transactions (limit 5) for display
  const {
    data: recentTransactionsData,
    isLoading: recentTransactionsLoading,
    refetch: refetchRecentTransactions,
    isRefetching: recentTransactionsRefetching,
  } = useTransactions({ limit: 5 });

  // Derived state with defaults
  const totals = accountsData?.totals ?? {
    netWorth: 0,
    assets: 0,
    liabilities: 0,
  };
  const recentTransactions = recentTransactionsData?.transactions ?? [];

  // Calculate income/expenses/profit using category.type
  const { income, expenses, profit } = useMemo(() => {
    const transactions = allTransactionsData?.transactions ?? [];
    let inc = 0;
    let exp = 0;
    transactions.forEach((txn) => {
      const amount = Math.abs(txn.amount);
      if (txn.category?.type === "income") {
        inc += amount;
      } else {
        // Default to expense if no category or category.type is "expense"
        exp += amount;
      }
    });
    return { income: inc, expenses: exp, profit: inc - exp };
  }, [allTransactionsData]);

  // Calculate savings rate
  const savingsRate = income > 0 ? Math.round((profit / income) * 100) : 0;

  const isLoading =
    accountsLoading || allTransactionsLoading || recentTransactionsLoading;
  const isRefetching =
    accountsRefetching ||
    allTransactionsRefetching ||
    recentTransactionsRefetching;

  const handleRefresh = () => {
    refetchAccounts();
    refetchAllTransactions();
    refetchRecentTransactions();
  };

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
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View className="py-4">
          <Text className="text-2xl font-bold text-foreground">Dashboard</Text>
          <Text className="text-muted-foreground">
            Your financial overview
          </Text>
        </View>

        {isLoading ? (
          <Loading />
        ) : (
          <>
            {/* Net Worth Card */}
            <View className="mb-4 rounded-xl bg-gray-900 p-4">
              <Text className="text-sm text-gray-400">Net Worth</Text>
              <Text className="text-3xl font-bold text-white">
                {formatCurrency(totals.netWorth)}
              </Text>
              <View className="mt-2 flex-row">
                <Text className="text-sm text-gray-400">
                  Assets:{" "}
                  <Text className="text-green-400">
                    {formatCurrency(totals.assets)}
                  </Text>
                </Text>
                <Text className="ml-4 text-sm text-gray-400">
                  Liabilities:{" "}
                  <Text className="text-red-400">
                    {formatCurrency(totals.liabilities)}
                  </Text>
                </Text>
              </View>
            </View>

            {/* Metric Cards */}
            <View className="mb-4 flex-row gap-3">
              <MetricCard
                title="Income"
                value={formatCurrency(income)}
                icon="arrow-down"
                iconColor={Colors.success}
              />
              <MetricCard
                title="Expenses"
                value={formatCurrency(expenses)}
                icon="arrow-up"
                iconColor={Colors.destructive}
              />
            </View>

            <View className="mb-4 flex-row gap-3">
              <MetricCard
                title="Profit"
                value={formatCurrency(profit)}
                icon="line-chart"
                iconColor={profit >= 0 ? Colors.success : Colors.destructive}
              />
              <MetricCard
                title="Savings Rate"
                value={`${savingsRate}%`}
                icon="dollar"
                iconColor={Colors.warning}
              />
            </View>

            {/* Recent Transactions */}
            <View className="mb-4">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-foreground">
                  Recent Transactions
                </Text>
                <Pressable
                  onPress={() => router.push("/(main)/finance/transactions")}
                >
                  <Text className="text-sm text-primary">View All</Text>
                </Pressable>
              </View>

              {recentTransactions.length > 0 ? (
                <View className="rounded-xl bg-muted">
                  {recentTransactions.map((txn, index) => (
                    <RecentTransactionRow
                      key={txn.id}
                      transaction={txn}
                      isLast={index === recentTransactions.length - 1}
                      onPress={() =>
                        router.push(`/(main)/finance/transactions/${txn.id}`)
                      }
                    />
                  ))}
                </View>
              ) : (
                <View className="rounded-xl bg-muted p-4">
                  <Text className="text-center text-muted-foreground">
                    No transactions yet
                  </Text>
                  <Text className="mt-1 text-center text-sm text-muted-foreground">
                    Add your first transaction to get started
                  </Text>
                </View>
              )}
            </View>

            {/* Quick Actions */}
            <View className="mb-8">
              <Text className="mb-3 text-lg font-semibold text-foreground">
                Quick Actions
              </Text>
              <View className="flex-row gap-3">
                <QuickActionButton
                  icon="plus"
                  label="Add Transaction"
                  onPress={() =>
                    router.push("/(main)/finance/transactions/new")
                  }
                />
                <QuickActionButton
                  icon="university"
                  label="Add Account"
                  onPress={() => router.push("/(main)/finance/accounts/new")}
                />
                <QuickActionButton
                  icon="tags"
                  label="Categories"
                  onPress={() => router.push("/(main)/finance/categories")}
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function MetricCard({
  title,
  value,
  icon,
  iconColor,
}: {
  title: string;
  value: string;
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  iconColor: string;
}) {
  return (
    <View className="flex-1 rounded-xl bg-muted p-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm text-muted-foreground">{title}</Text>
        <FontAwesome name={icon} size={16} color={iconColor} />
      </View>
      <Text className="text-xl font-bold text-foreground">{value}</Text>
      <Text className="text-xs text-muted-foreground">All time</Text>
    </View>
  );
}

function RecentTransactionRow({
  transaction,
  isLast,
  onPress,
}: {
  transaction: Transaction;
  isLast: boolean;
  onPress: () => void;
}) {
  const amountColor = getTransactionColor(transaction.amount);

  return (
    <Pressable
      className={`flex-row items-center p-4 active:opacity-70 ${
        !isLast ? "border-b border-border" : ""
      }`}
      onPress={onPress}
    >
      <View
        className="h-8 w-8 items-center justify-center rounded-lg"
        style={{
          backgroundColor:
            (transaction.category?.color || Colors.mutedForeground) + "20",
        }}
      >
        <FontAwesome
          name={transaction.amount > 0 ? "arrow-down" : "arrow-up"}
          size={12}
          color={transaction.category?.color || Colors.mutedForeground}
        />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-medium text-foreground" numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {formatDate(transaction.date)}
          {transaction.category && ` \u2022 ${transaction.category.name}`}
        </Text>
      </View>
      <Text className="text-base font-semibold" style={{ color: amountColor }}>
        {transaction.amount > 0 ? "+" : ""}
        {formatCurrency(transaction.amount)}
      </Text>
    </Pressable>
  );
}

function QuickActionButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="flex-1 items-center rounded-xl bg-primary/10 p-4 active:opacity-70"
      onPress={onPress}
    >
      <FontAwesome name={icon} size={24} color={Colors.primary} />
      <Text className="mt-2 text-sm font-medium text-primary">{label}</Text>
    </Pressable>
  );
}
