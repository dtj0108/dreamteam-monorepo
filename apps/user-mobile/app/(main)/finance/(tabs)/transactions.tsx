import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
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

import { Loading } from "@/components/Loading";
import { ProductSwitcher } from "@/components/ProductSwitcher";
import { Colors } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { useAccounts } from "@/lib/hooks/useAccounts";
import { useCategories } from "@/lib/hooks/useCategories";
import {
  useBulkDeleteTransactions,
  useBulkUpdateTransactions,
  useCategorizeTransactions,
  useTransactions,
} from "@/lib/hooks/useTransactions";
import { Category, getTransactionColor, Transaction } from "@/lib/types/finance";

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

// Get date range based on filter
const getDateRange = (filter: "this_month" | "last_month" | "all_time") => {
  const now = new Date();
  if (filter === "all_time") {
    return { startDate: undefined, endDate: undefined };
  }
  if (filter === "last_month") {
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  }
  // this_month
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
};

// Group transactions by date
const groupByDate = (transactions: Transaction[]) => {
  const groups: { [date: string]: Transaction[] } = {};
  transactions.forEach((txn) => {
    const date = txn.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(txn);
  });
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
};

type DateFilter = "this_month" | "last_month" | "all_time";

export default function TransactionsScreen() {
  const router = useRouter();
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();
  const [isCategorizing, setIsCategorizing] = useState(false);

  // Filter state
  const [dateFilter, setDateFilter] = useState<DateFilter>("this_month");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  // Multi-select state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const dateRange = useMemo(() => getDateRange(dateFilter), [dateFilter]);

  const { data: accountsData } = useAccounts();
  const { data: categoriesData } = useCategories();
  const { data, isLoading, refetch, isRefetching } = useTransactions({
    accountId: selectedAccountId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const categorize = useCategorizeTransactions();
  const bulkUpdate = useBulkUpdateTransactions();
  const bulkDelete = useBulkDeleteTransactions();

  const transactions = data?.transactions ?? [];
  const accounts = accountsData?.accounts ?? [];
  const categories = categoriesData?.categories ?? [];
  const expenseCategories = categories.filter((c) => c.type === "expense");

  // Count uncategorized transactions
  const uncategorizedTransactions = useMemo(
    () => transactions.filter((t) => !t.category_id),
    [transactions]
  );
  const uncategorizedCount = uncategorizedTransactions.length;

  // Toggle selection of a transaction
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);

    // Exit selection mode if nothing selected
    if (newSelected.size === 0) {
      setIsSelectionMode(false);
    }
  };

  // Handle long press to enter selection mode
  const handleLongPress = (id: string) => {
    setIsSelectionMode(true);
    setSelectedIds(new Set([id]));
  };

  // Exit selection mode
  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setShowCategoryPicker(false);
  };

  // Select all transactions
  const selectAll = () => {
    setSelectedIds(new Set(transactions.map((t) => t.id)));
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    Alert.alert(
      "Delete Transactions",
      `Are you sure you want to delete ${selectedIds.size} transaction${selectedIds.size > 1 ? "s" : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await bulkDelete.mutateAsync({
                transaction_ids: Array.from(selectedIds),
              });
              Alert.alert("Deleted", `${selectedIds.size} transaction(s) deleted.`);
              exitSelectionMode();
              refetch();
            } catch (error) {
              Alert.alert("Error", "Failed to delete transactions.");
            }
          },
        },
      ]
    );
  };

  // Handle bulk categorize
  const handleBulkCategorize = async (category: Category) => {
    try {
      await bulkUpdate.mutateAsync({
        transaction_ids: Array.from(selectedIds),
        category_id: category.id,
      });
      Alert.alert(
        "Categorized",
        `${selectedIds.size} transaction(s) set to "${category.name}".`
      );
      exitSelectionMode();
      refetch();
    } catch (error) {
      Alert.alert("Error", "Failed to update transactions.");
    }
  };

  // Handle auto-categorization
  const handleAutoCategorize = async () => {
    if (uncategorizedCount === 0) return;

    // Check if user is authenticated before making AI call
    const { data: { session } } = await supabase.auth.getSession();
    console.log("Session check for AI categorization:", session ? "Valid session" : "No session");
    if (!session) {
      Alert.alert(
        "Session Expired",
        "Please log in again to use AI categorization.",
        [{ text: "OK" }]
      );
      return;
    }

    setIsCategorizing(true);
    try {
      // Get unique descriptions
      const descriptions = [...new Set(uncategorizedTransactions.map((t) => t.description))];

      // Get AI suggestions
      const result = await categorize.mutateAsync(descriptions);

      if (!result.success || result.suggestions.length === 0) {
        Alert.alert("No Suggestions", "AI could not categorize these transactions.");
        return;
      }

      // Build a map of description -> categoryId
      const categoryMap = new Map<string, string>();
      result.suggestions.forEach((s) => {
        if (s.confidence === "high" || s.confidence === "medium") {
          categoryMap.set(s.description, s.categoryId);
        }
      });

      // Group transactions by category
      const updatesByCategory = new Map<string, string[]>();
      uncategorizedTransactions.forEach((txn) => {
        const categoryId = categoryMap.get(txn.description);
        if (categoryId) {
          if (!updatesByCategory.has(categoryId)) {
            updatesByCategory.set(categoryId, []);
          }
          updatesByCategory.get(categoryId)!.push(txn.id);
        }
      });

      // Apply bulk updates for each category
      let totalUpdated = 0;
      for (const [categoryId, transactionIds] of updatesByCategory) {
        const updateResult = await bulkUpdate.mutateAsync({
          transaction_ids: transactionIds,
          category_id: categoryId,
        });
        totalUpdated += updateResult.updated;
      }

      if (totalUpdated > 0) {
        Alert.alert(
          "Categorized!",
          `${totalUpdated} transaction${totalUpdated > 1 ? "s" : ""} categorized automatically.`
        );
        refetch();
      } else {
        Alert.alert("No Changes", "No high-confidence matches found.");
      }
    } catch (error) {
      console.error("AI Categorization Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      Alert.alert(
        "Categorization Failed",
        `${errorMessage}\n\nPlease try again or contact support if the issue persists.`
      );
    } finally {
      setIsCategorizing(false);
    }
  };

  // Calculate totals
  const { income, expenses, net } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    transactions.forEach((txn) => {
      if (txn.amount > 0) inc += txn.amount;
      else exp += Math.abs(txn.amount);
    });
    return { income: inc, expenses: exp, net: inc - exp };
  }, [transactions]);

  const groupedTransactions = useMemo(
    () => groupByDate(transactions),
    [transactions]
  );

  const hasTransactions = transactions.length > 0;
  const selectedCount = selectedIds.size;

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={["top"]} className="bg-background">
        <View className="px-4 py-2">
          <ProductSwitcher />
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: isSelectionMode ? 160 : 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          {isSelectionMode ? (
            <>
              <View className="flex-row items-center">
                <Pressable onPress={exitSelectionMode} className="mr-3">
                  <FontAwesome name="times" size={20} color={Colors.foreground} />
                </Pressable>
                <Text className="text-xl font-bold text-foreground">
                  {selectedCount} selected
                </Text>
              </View>
              <Pressable onPress={selectAll}>
                <Text className="text-primary">Select All</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View>
                <Text className="text-2xl font-bold text-foreground">
                  Transactions
                </Text>
                <Text className="text-muted-foreground">Track income & expenses</Text>
              </View>
              <View className="flex-row gap-2">
                <Pressable
                  className="h-10 w-10 items-center justify-center rounded-full bg-muted"
                  onPress={() => router.push("/(main)/finance/transactions/import")}
                >
                  <FontAwesome name="download" size={16} color={Colors.primary} />
                </Pressable>
                <Pressable
                  className="h-10 w-10 items-center justify-center rounded-full bg-primary"
                  onPress={() => router.push("/finance/transactions/new")}
                >
                  <FontAwesome name="plus" size={18} color="white" />
                </Pressable>
              </View>
            </>
          )}
        </View>

        {/* Summary Card - hidden in selection mode */}
        {!isSelectionMode && (
          <View className="mb-4 rounded-xl bg-muted p-4">
            {/* Net - Hero */}
            <View className="mb-3 items-center">
              <Text className="text-sm text-muted-foreground">Net</Text>
              <Text
                className={`text-3xl font-bold ${
                  net >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {net >= 0 ? "+" : "-"}
                {formatCurrency(Math.abs(net))}
              </Text>
            </View>

            {/* Income & Expenses Row */}
            <View className="flex-row justify-between border-t border-border pt-3">
              <View>
                <Text className="text-sm text-muted-foreground">Income</Text>
                <Text className="text-lg font-semibold text-green-500">
                  {formatCurrency(income)}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-sm text-muted-foreground">Expenses</Text>
                <Text className="text-lg font-semibold text-red-500">
                  {formatCurrency(expenses)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Filters - hidden in selection mode */}
        {!isSelectionMode && (
          <>
            <View className="mb-2 flex-row gap-2">
              {/* Date Filter */}
              <Pressable
                className="flex-row items-center rounded-lg bg-muted px-3 py-2"
                onPress={() => {
                  setShowDatePicker(!showDatePicker);
                  setShowAccountPicker(false);
                }}
              >
                <FontAwesome name="calendar" size={14} color={Colors.primary} />
                <Text className="ml-2 text-sm text-foreground">
                  {dateFilter === "this_month"
                    ? "This Month"
                    : dateFilter === "last_month"
                      ? "Last Month"
                      : "All Time"}
                </Text>
                <FontAwesome
                  name="chevron-down"
                  size={10}
                  color={Colors.primary}
                  style={{ marginLeft: 4 }}
                />
              </Pressable>

              {/* Account Filter */}
              <Pressable
                className="flex-row items-center rounded-lg bg-muted px-3 py-2"
                onPress={() => {
                  setShowAccountPicker(!showAccountPicker);
                  setShowDatePicker(false);
                }}
              >
                <FontAwesome name="filter" size={14} color={Colors.primary} />
                <Text className="ml-2 text-sm text-foreground">
                  {selectedAccountId
                    ? accounts.find((a) => a.id === selectedAccountId)?.name
                    : "All Accounts"}
                </Text>
                <FontAwesome
                  name="chevron-down"
                  size={10}
                  color={Colors.primary}
                  style={{ marginLeft: 4 }}
                />
              </Pressable>
            </View>

            {/* Date Dropdown */}
            {showDatePicker && (
              <View className="mb-2 rounded-xl bg-muted">
                {[
                  { value: "this_month" as DateFilter, label: "This Month" },
                  { value: "last_month" as DateFilter, label: "Last Month" },
                  { value: "all_time" as DateFilter, label: "All Time" },
                ].map((option, index, arr) => (
                  <Pressable
                    key={option.value}
                    className={`flex-row items-center justify-between p-4 ${
                      index < arr.length - 1 ? "border-b border-border" : ""
                    }`}
                    onPress={() => {
                      setDateFilter(option.value);
                      setShowDatePicker(false);
                    }}
                  >
                    <Text className="text-foreground">{option.label}</Text>
                    {dateFilter === option.value && (
                      <FontAwesome name="check" size={14} color={Colors.primary} />
                    )}
                  </Pressable>
                ))}
              </View>
            )}

            {/* Account Dropdown */}
            {showAccountPicker && (
              <View className="mb-2 rounded-xl bg-muted">
                <Pressable
                  className="flex-row items-center justify-between border-b border-border p-4"
                  onPress={() => {
                    setSelectedAccountId(undefined);
                    setShowAccountPicker(false);
                  }}
                >
                  <Text className="text-foreground">All Accounts</Text>
                  {!selectedAccountId && (
                    <FontAwesome name="check" size={14} color={Colors.primary} />
                  )}
                </Pressable>
                {accounts.map((account, index) => (
                  <Pressable
                    key={account.id}
                    className={`flex-row items-center justify-between p-4 ${
                      index < accounts.length - 1 ? "border-b border-border" : ""
                    }`}
                    onPress={() => {
                      setSelectedAccountId(account.id);
                      setShowAccountPicker(false);
                    }}
                  >
                    <Text className="text-foreground">{account.name}</Text>
                    {selectedAccountId === account.id && (
                      <FontAwesome name="check" size={14} color={Colors.primary} />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}

        {/* Auto-categorize Banner - hidden in selection mode */}
        {!isSelectionMode && uncategorizedCount > 0 && (
          <Pressable
            className="mb-4 flex-row items-center justify-between rounded-xl bg-amber-500/10 p-4"
            onPress={handleAutoCategorize}
            disabled={isCategorizing}
          >
            <View className="flex-1 flex-row items-center">
              <FontAwesome name="magic" size={18} color="#f59e0b" />
              <View className="ml-3">
                <Text className="font-medium text-amber-600">
                  {uncategorizedCount} uncategorized transaction
                  {uncategorizedCount > 1 ? "s" : ""}
                </Text>
                <Text className="text-sm text-amber-600/70">
                  Tap to auto-categorize with AI
                </Text>
              </View>
            </View>
            {isCategorizing ? (
              <ActivityIndicator size="small" color="#f59e0b" />
            ) : (
              <FontAwesome name="chevron-right" size={14} color="#f59e0b" />
            )}
          </Pressable>
        )}

        {/* Selection mode hint */}
        {!isSelectionMode && hasTransactions && (
          <Text className="mb-2 text-center text-xs text-muted-foreground">
            Long press to select multiple transactions
          </Text>
        )}

        {/* Loading State */}
        {isLoading && <Loading />}

        {/* Transaction List */}
        {!isLoading && (
          <>
            {hasTransactions ? (
              groupedTransactions.map(([date, txns]) => (
                <View key={date} className="mb-4">
                  <Text className="mb-2 text-sm font-medium uppercase text-muted-foreground">
                    {formatDate(date)}
                  </Text>
                  {txns.map((txn) => (
                    <TransactionRow
                      key={txn.id}
                      transaction={txn}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedIds.has(txn.id)}
                      onPress={() => {
                        if (isSelectionMode) {
                          toggleSelection(txn.id);
                        } else {
                          router.push(`/finance/transactions/${txn.id}`);
                        }
                      }}
                      onLongPress={() => handleLongPress(txn.id)}
                    />
                  ))}
                </View>
              ))
            ) : (
              /* Empty State */
              <View className="items-center py-8">
                <FontAwesome
                  name="exchange"
                  size={48}
                  color={Colors.mutedForeground}
                />
                <Text className="mt-4 text-lg font-medium text-foreground">
                  No transactions yet
                </Text>
                <Text className="mt-1 text-center text-muted-foreground">
                  Add your first transaction to start tracking
                </Text>
                <Pressable
                  className="mt-4 rounded-lg bg-primary px-6 py-3"
                  onPress={() => router.push("/finance/transactions/new")}
                >
                  <Text className="font-medium text-white">Add Transaction</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Selection Action Bar */}
      {isSelectionMode && selectedCount > 0 && (
        <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-background">
          {/* Category Picker */}
          {showCategoryPicker && (
            <ScrollView
              horizontal
              className="border-b border-border px-4 py-2"
              showsHorizontalScrollIndicator={false}
            >
              {expenseCategories.map((cat) => (
                <Pressable
                  key={cat.id}
                  className="mr-2 flex-row items-center rounded-full px-3 py-2"
                  style={{ backgroundColor: (cat.color || Colors.primary) + "20" }}
                  onPress={() => handleBulkCategorize(cat)}
                >
                  <View
                    className="mr-2 h-3 w-3 rounded-full"
                    style={{ backgroundColor: cat.color || Colors.primary }}
                  />
                  <Text
                    className="text-sm font-medium"
                    style={{ color: cat.color || Colors.primary }}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Action Buttons */}
          <View className="flex-row gap-3 p-4">
            <Pressable
              className="flex-1 flex-row items-center justify-center rounded-xl bg-primary/10 py-3"
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <FontAwesome name="tag" size={16} color={Colors.primary} />
              <Text className="ml-2 font-medium text-primary">
                Categorize ({selectedCount})
              </Text>
            </Pressable>
            <Pressable
              className="flex-1 flex-row items-center justify-center rounded-xl bg-destructive/10 py-3"
              onPress={handleBulkDelete}
              disabled={bulkDelete.isPending}
            >
              <FontAwesome name="trash" size={16} color={Colors.destructive} />
              <Text className="ml-2 font-medium text-destructive">
                {bulkDelete.isPending ? "Deleting..." : `Delete (${selectedCount})`}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function TransactionRow({
  transaction,
  isSelectionMode,
  isSelected,
  onPress,
  onLongPress,
}: {
  transaction: Transaction;
  isSelectionMode: boolean;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const amountColor = getTransactionColor(transaction.amount);

  return (
    <Pressable
      className={`mb-2 flex-row items-center rounded-xl p-4 active:opacity-70 ${
        isSelected ? "bg-primary/10" : "bg-muted"
      }`}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
    >
      {/* Checkbox in selection mode */}
      {isSelectionMode && (
        <View
          className={`mr-3 h-6 w-6 items-center justify-center rounded-full border-2 ${
            isSelected
              ? "border-primary bg-primary"
              : "border-muted-foreground bg-transparent"
          }`}
        >
          {isSelected && (
            <FontAwesome name="check" size={12} color="white" />
          )}
        </View>
      )}

      <View
        className="h-10 w-10 items-center justify-center rounded-lg"
        style={{
          backgroundColor:
            (transaction.category?.color || Colors.mutedForeground) + "20",
        }}
      >
        <FontAwesome
          name={
            transaction.amount > 0
              ? "arrow-down"
              : transaction.amount < 0
              ? "arrow-up"
              : "exchange"
          }
          size={16}
          color={transaction.category?.color || Colors.mutedForeground}
        />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-medium text-foreground">
          {transaction.description}
        </Text>
        <Text className="text-sm text-muted-foreground">
          {transaction.category?.name || "Uncategorized"}
          {transaction.account && ` • ${transaction.account.name}`}
        </Text>
      </View>
      <Text className="text-lg font-semibold" style={{ color: amountColor }}>
        {transaction.amount > 0 ? "+" : ""}
        {formatCurrency(transaction.amount)}
      </Text>
    </Pressable>
  );
}
