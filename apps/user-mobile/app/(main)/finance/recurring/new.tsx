import FontAwesome from "@expo/vector-icons/FontAwesome";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { useAccounts } from "@/lib/hooks/useAccounts";
import { useCategoriesByType } from "@/lib/hooks/useCategories";
import { useCreateRecurringRule } from "@/lib/hooks/useRecurringRules";
import {
  Account,
  Category,
  RecurringFrequency,
  RECURRING_FREQUENCY_LABELS,
} from "@/lib/types/finance";

type TransactionType = "expense" | "income";

const FREQUENCY_OPTIONS: {
  value: RecurringFrequency;
  label: string;
  description: string;
}[] = [
  { value: "daily", label: "Daily", description: "Creates every day" },
  { value: "weekly", label: "Weekly", description: "Creates every week" },
  {
    value: "biweekly",
    label: "Bi-weekly",
    description: "Creates every 2 weeks",
  },
  { value: "monthly", label: "Monthly", description: "Creates every month" },
  {
    value: "quarterly",
    label: "Quarterly",
    description: "Creates every 3 months",
  },
  { value: "yearly", label: "Yearly", description: "Creates every year" },
];

export default function NewRecurringRuleScreen() {
  const router = useRouter();
  const createRecurringRule = useCreateRecurringRule();
  const { data: accountsData, isLoading: accountsLoading } = useAccounts();
  const accounts = accountsData?.accounts ?? [];

  const [transactionType, setTransactionType] =
    useState<TransactionType>("expense");
  const { data: categories, isLoading: categoriesLoading } =
    useCategoriesByType(transactionType);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [nextDate, setNextDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const handleSave = async () => {
    if (!description.trim()) {
      Alert.alert("Error", "Please enter a description");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (!selectedAccount) {
      Alert.alert("Error", "Please select an account");
      return;
    }

    try {
      const actualAmount =
        transactionType === "expense"
          ? -Math.abs(parseFloat(amount))
          : Math.abs(parseFloat(amount));

      await createRecurringRule.mutateAsync({
        account_id: selectedAccount.id,
        category_id: selectedCategory?.id,
        amount: actualAmount,
        description: description.trim(),
        frequency,
        next_date: nextDate.toISOString().split("T")[0],
        end_date: endDate ? endDate.toISOString().split("T")[0] : undefined,
      });
      router.back();
    } catch {
      Alert.alert(
        "Error",
        "Failed to create recurring rule. Please try again."
      );
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Reset category when transaction type changes
  const handleTransactionTypeChange = (type: TransactionType) => {
    setTransactionType(type);
    setSelectedCategory(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Pressable onPress={() => router.back()}>
            <Text className="text-primary">Cancel</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-foreground">
            Add Recurring Rule
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={createRecurringRule.isPending}
          >
            {createRecurringRule.isPending ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text className="font-semibold text-primary">Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Transaction Type Toggle */}
          <View className="mt-6 flex-row gap-2">
            <Pressable
              className={`flex-1 items-center rounded-xl py-3 ${
                transactionType === "expense"
                  ? "bg-red-500"
                  : "bg-muted"
              }`}
              onPress={() => handleTransactionTypeChange("expense")}
            >
              <Text
                className={`font-medium ${
                  transactionType === "expense"
                    ? "text-white"
                    : "text-muted-foreground"
                }`}
              >
                Expense
              </Text>
            </Pressable>
            <Pressable
              className={`flex-1 items-center rounded-xl py-3 ${
                transactionType === "income"
                  ? "bg-emerald-500"
                  : "bg-muted"
              }`}
              onPress={() => handleTransactionTypeChange("income")}
            >
              <Text
                className={`font-medium ${
                  transactionType === "income"
                    ? "text-white"
                    : "text-muted-foreground"
                }`}
              >
                Income
              </Text>
            </Pressable>
          </View>

          {/* Description Input */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Description
            </Text>
            <TextInput
              className="rounded-xl bg-muted px-4 py-3 text-foreground"
              placeholder="e.g., Rent payment, Monthly salary"
              placeholderTextColor={Colors.mutedForeground}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Amount Input */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Amount
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

          {/* Account Selection */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Account
            </Text>
            {accountsLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <View className="gap-2">
                {accounts.map((account) => {
                  const isSelected = selectedAccount?.id === account.id;
                  return (
                    <Pressable
                      key={account.id}
                      onPress={() => setSelectedAccount(account)}
                      className={`flex-row items-center justify-between rounded-xl p-4 ${
                        isSelected
                          ? "border-2 border-primary bg-primary/10"
                          : "bg-muted"
                      }`}
                    >
                      <View className="flex-row items-center">
                        <FontAwesome
                          name="bank"
                          size={16}
                          color={isSelected ? Colors.primary : Colors.mutedForeground}
                        />
                        <Text
                          className={`ml-3 font-medium ${
                            isSelected ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {account.name}
                        </Text>
                      </View>
                      {isSelected && (
                        <FontAwesome
                          name="check"
                          size={16}
                          color={Colors.primary}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Frequency Selection */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Frequency
            </Text>
            <View className="gap-2">
              {FREQUENCY_OPTIONS.map((option) => {
                const isSelected = frequency === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setFrequency(option.value)}
                    className={`flex-row items-center justify-between rounded-xl p-4 ${
                      isSelected
                        ? "border-2 border-primary bg-primary/10"
                        : "bg-muted"
                    }`}
                  >
                    <View>
                      <Text
                        className={`font-medium ${
                          isSelected ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {option.label}
                      </Text>
                      <Text className="text-sm text-muted-foreground">
                        {option.description}
                      </Text>
                    </View>
                    {isSelected && (
                      <FontAwesome
                        name="check"
                        size={16}
                        color={Colors.primary}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Next Date */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Next Date
            </Text>
            <Pressable
              className="flex-row items-center justify-between rounded-xl bg-muted px-4 py-3"
              onPress={() => setShowDatePicker(true)}
            >
              <Text className="text-foreground">{formatDate(nextDate)}</Text>
              <FontAwesome
                name="calendar"
                size={16}
                color={Colors.mutedForeground}
              />
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={nextDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, date) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (date) setNextDate(date);
                }}
              />
            )}
          </View>

          {/* End Date (optional) */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              End Date (Optional)
            </Text>
            <Pressable
              className="flex-row items-center justify-between rounded-xl bg-muted px-4 py-3"
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text
                className={endDate ? "text-foreground" : "text-muted-foreground"}
              >
                {endDate ? formatDate(endDate) : "No end date"}
              </Text>
              <View className="flex-row items-center">
                {endDate && (
                  <Pressable
                    onPress={() => setEndDate(null)}
                    className="mr-3 p-1"
                  >
                    <FontAwesome
                      name="times-circle"
                      size={16}
                      color={Colors.mutedForeground}
                    />
                  </Pressable>
                )}
                <FontAwesome
                  name="calendar"
                  size={16}
                  color={Colors.mutedForeground}
                />
              </View>
            </Pressable>
            {showEndDatePicker && (
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={nextDate}
                onChange={(event, date) => {
                  setShowEndDatePicker(Platform.OS === "ios");
                  if (date) setEndDate(date);
                }}
              />
            )}
          </View>

          {/* Category Selection */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Category (Optional)
            </Text>
            {categoriesLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {categories.map((category) => {
                  const isSelected = selectedCategory?.id === category.id;
                  const color = category.color || Colors.mutedForeground;
                  return (
                    <Pressable
                      key={category.id}
                      onPress={() =>
                        setSelectedCategory(isSelected ? null : category)
                      }
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
                        name="tag"
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
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
