import FontAwesome from "@expo/vector-icons/FontAwesome";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Loading } from "@/components/Loading";
import { Colors } from "@/constants/Colors";
import {
  useBudget,
  useDeleteBudget,
  useUpdateBudget,
} from "@/lib/hooks/useBudgets";
import { useCategoriesByType } from "@/lib/hooks/useCategories";
import {
  BudgetPeriod,
  Category,
  getBudgetProgressColor,
  getTransactionColor,
} from "@/lib/types/finance";

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

const formatFullDate = (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const PERIOD_OPTIONS: { value: BudgetPeriod; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const PERIOD_LABELS: Record<BudgetPeriod, string> = {
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export default function BudgetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: budget, isLoading } = useBudget(id);
  const { data: expenseCategories } = useCategoriesByType("expense");
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();

  const [isEditing, setIsEditing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");
  const [startDate, setStartDate] = useState(new Date());
  const [rollover, setRollover] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const startEditing = () => {
    if (budget) {
      setSelectedCategory(budget.category || null);
      setAmount(budget.amount.toString());
      setPeriod(budget.period);
      setStartDate(new Date(budget.start_date));
      setRollover(budget.rollover);
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!selectedCategory) {
      Alert.alert("Error", "Please select a category");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid budget amount");
      return;
    }

    try {
      await updateBudget.mutateAsync({
        id,
        data: {
          category_id: selectedCategory.id,
          amount: parseFloat(amount),
          period,
          start_date: startDate.toISOString().split("T")[0],
          rollover,
        },
      });
      setIsEditing(false);
    } catch (error) {
      Alert.alert("Error", "Failed to update budget. Please try again.");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Budget",
      "Are you sure you want to delete this budget?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBudget.mutateAsync(id);
              router.back();
            } catch (error) {
              Alert.alert("Error", "Failed to delete budget.");
            }
          },
        },
      ]
    );
  };

  if (isLoading || !budget) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Loading />
      </SafeAreaView>
    );
  }

  const spent = budget.spent ?? 0;
  const percentUsed = budget.percentUsed ?? (spent / budget.amount) * 100;
  const remaining = budget.remaining ?? budget.amount - spent;
  const progressColor = getBudgetProgressColor(percentUsed);
  const progressWidth = Math.min(percentUsed, 100);
  const transactions = budget.transactions ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Pressable onPress={() => router.back()}>
            <FontAwesome name="chevron-left" size={18} color={Colors.primary} />
          </Pressable>
          <Text className="text-lg font-semibold text-foreground">
            {isEditing ? "Edit Budget" : "Budget Details"}
          </Text>
          {isEditing ? (
            <Pressable onPress={handleSave} disabled={updateBudget.isPending}>
              {updateBudget.isPending ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text className="font-semibold text-primary">Save</Text>
              )}
            </Pressable>
          ) : (
            <Pressable onPress={startEditing}>
              <Text className="text-primary">Edit</Text>
            </Pressable>
          )}
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
          {isEditing ? (
            /* Edit Mode */
            <View className="px-4">
              {/* Category Selection */}
              <View className="mt-6">
                <Text className="mb-2 text-sm font-medium text-muted-foreground">
                  Category
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {expenseCategories.map((category) => {
                    const isSelected = selectedCategory?.id === category.id;
                    const color = category.color || Colors.mutedForeground;
                    return (
                      <Pressable
                        key={category.id}
                        onPress={() => setSelectedCategory(category)}
                        className={`flex-row items-center rounded-full px-4 py-2 ${
                          isSelected ? "border-2" : "bg-muted"
                        }`}
                        style={
                          isSelected
                            ? { borderColor: color, backgroundColor: color + "20" }
                            : {}
                        }
                      >
                        <FontAwesome
                          name={(category.icon as any) || "tag"}
                          size={14}
                          color={isSelected ? color : Colors.mutedForeground}
                        />
                        <Text
                          className={`ml-2 text-sm font-medium ${
                            isSelected ? "" : "text-muted-foreground"
                          }`}
                          style={isSelected ? { color } : {}}
                        >
                          {category.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Budget Amount */}
              <View className="mt-6">
                <Text className="mb-2 text-sm font-medium text-muted-foreground">
                  Budget Amount
                </Text>
                <View className="flex-row items-center rounded-xl bg-muted px-4">
                  <Text className="text-lg text-muted-foreground">$</Text>
                  <TextInput
                    className="flex-1 py-3 pl-2 text-lg text-foreground"
                    placeholder="0.00"
                    placeholderTextColor={Colors.mutedForeground}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Period Selection */}
              <View className="mt-6">
                <Text className="mb-2 text-sm font-medium text-muted-foreground">
                  Budget Period
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {PERIOD_OPTIONS.map((option) => {
                    const isSelected = period === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setPeriod(option.value)}
                        className={`rounded-full px-4 py-2 ${
                          isSelected ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            isSelected ? "text-white" : "text-muted-foreground"
                          }`}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Start Date */}
              <View className="mt-6">
                <Text className="mb-2 text-sm font-medium text-muted-foreground">
                  Start Date
                </Text>
                <Pressable
                  className="flex-row items-center justify-between rounded-xl bg-muted px-4 py-3"
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text className="text-foreground">{formatFullDate(startDate)}</Text>
                  <FontAwesome name="calendar" size={16} color={Colors.mutedForeground} />
                </Pressable>
                {showDatePicker && (
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(event, date) => {
                      setShowDatePicker(Platform.OS === "ios");
                      if (date) setStartDate(date);
                    }}
                  />
                )}
              </View>

              {/* Rollover Toggle */}
              <View className="mt-6">
                <View className="flex-row items-center justify-between rounded-xl bg-muted p-4">
                  <View className="flex-1">
                    <Text className="font-medium text-foreground">
                      Rollover Unused Budget
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      Carry over remaining budget to the next period
                    </Text>
                  </View>
                  <Switch
                    value={rollover}
                    onValueChange={setRollover}
                    trackColor={{ false: Colors.muted, true: Colors.primary }}
                    thumbColor="white"
                  />
                </View>
              </View>

              {/* Delete Button */}
              <Pressable
                className="mt-8 items-center rounded-xl bg-red-500/10 py-4"
                onPress={handleDelete}
              >
                <Text className="font-medium text-red-500">Delete Budget</Text>
              </Pressable>
            </View>
          ) : (
            /* View Mode */
            <>
              {/* Budget Header */}
              <View className="items-center px-4 py-8">
                <View
                  className="h-16 w-16 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor:
                      (budget.category?.color || Colors.mutedForeground) + "20",
                  }}
                >
                  <FontAwesome
                    name={(budget.category?.icon as any) || "tag"}
                    size={28}
                    color={budget.category?.color || Colors.mutedForeground}
                  />
                </View>
                <Text className="mt-4 text-xl font-bold text-foreground">
                  {budget.category?.name || "Uncategorized"}
                </Text>
                <Text className="mt-1 text-muted-foreground">
                  {PERIOD_LABELS[budget.period]} Budget
                </Text>
              </View>

              {/* Progress Section */}
              <View className="mx-4 rounded-xl bg-muted p-4">
                {/* Progress Bar */}
                <View className="mb-4 h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${progressWidth}%`,
                      backgroundColor: progressColor,
                    }}
                  />
                </View>

                {/* Stats */}
                <View className="flex-row justify-between">
                  <View>
                    <Text className="text-sm text-muted-foreground">Spent</Text>
                    <Text className="text-xl font-bold text-foreground">
                      {formatCurrency(spent)}
                    </Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-sm text-muted-foreground">Budget</Text>
                    <Text className="text-xl font-bold text-foreground">
                      {formatCurrency(budget.amount)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm text-muted-foreground">Remaining</Text>
                    <Text
                      className="text-xl font-bold"
                      style={{ color: progressColor }}
                    >
                      {remaining >= 0 ? formatCurrency(remaining) : `-${formatCurrency(Math.abs(remaining))}`}
                    </Text>
                  </View>
                </View>

                {/* Percentage */}
                <View className="mt-4 items-center">
                  <Text
                    className="text-3xl font-bold"
                    style={{ color: progressColor }}
                  >
                    {Math.round(percentUsed)}%
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {percentUsed > 100 ? "Over budget" : "Used"}
                  </Text>
                </View>
              </View>

              {/* Period Info */}
              {budget.periodStart && budget.periodEnd && (
                <View className="mx-4 mt-4 flex-row items-center justify-center rounded-xl bg-muted p-3">
                  <FontAwesome
                    name="calendar"
                    size={14}
                    color={Colors.mutedForeground}
                  />
                  <Text className="ml-2 text-sm text-muted-foreground">
                    {formatFullDate(budget.periodStart)} - {formatFullDate(budget.periodEnd)}
                  </Text>
                </View>
              )}

              {/* Rollover Badge */}
              {budget.rollover && (
                <View className="mx-4 mt-2 flex-row items-center justify-center rounded-xl bg-primary/10 p-3">
                  <FontAwesome name="refresh" size={14} color={Colors.primary} />
                  <Text className="ml-2 text-sm text-primary">
                    Rollover enabled
                  </Text>
                </View>
              )}

              {/* Transactions */}
              <View className="mt-6 px-4">
                <Text className="mb-3 text-sm font-medium uppercase text-muted-foreground">
                  Transactions This Period
                </Text>
                {transactions.length > 0 ? (
                  transactions.map((txn) => (
                    <Pressable
                      key={txn.id}
                      className="mb-2 flex-row items-center rounded-xl bg-muted p-4"
                      onPress={() => router.push(`/finance/transactions/${txn.id}`)}
                    >
                      <View className="flex-1">
                        <Text className="font-medium text-foreground">
                          {txn.description}
                        </Text>
                        <Text className="text-sm text-muted-foreground">
                          {formatDate(txn.date)}
                        </Text>
                      </View>
                      <Text
                        className="text-lg font-semibold"
                        style={{ color: getTransactionColor(txn.amount) }}
                      >
                        {txn.amount > 0 ? "+" : ""}
                        {formatCurrency(txn.amount)}
                      </Text>
                    </Pressable>
                  ))
                ) : (
                  <View className="items-center py-8">
                    <FontAwesome
                      name="exchange"
                      size={32}
                      color={Colors.mutedForeground}
                    />
                    <Text className="mt-2 text-muted-foreground">
                      No transactions this period
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
