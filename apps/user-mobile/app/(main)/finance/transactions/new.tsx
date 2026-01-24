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
import { useCategories } from "@/lib/hooks/useCategories";
import { useCreateTransaction } from "@/lib/hooks/useTransactions";
import { Category } from "@/lib/types/finance";

type TransactionType = "expense" | "income";

export default function NewTransactionScreen() {
  const router = useRouter();
  const createTransaction = useCreateTransaction();
  const { data: accountsData } = useAccounts();
  const { data: categoriesData } = useCategories();

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [accountId, setAccountId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const accounts = accountsData?.accounts ?? [];
  const categories = categoriesData?.categories ?? [];
  const filteredCategories = categories.filter((c) => c.type === type);

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const selectedCategory = categories.find((c) => c.id === categoryId);

  const handleSave = async () => {
    if (!amount.trim()) {
      Alert.alert("Error", "Please enter an amount");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Error", "Please enter a description");
      return;
    }
    if (!accountId) {
      Alert.alert("Error", "Please select an account");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    // Income is positive, expense is negative
    const finalAmount = type === "income" ? parsedAmount : -parsedAmount;

    try {
      await createTransaction.mutateAsync({
        account_id: accountId,
        category_id: categoryId || undefined,
        amount: finalAmount,
        date: date.toISOString().split("T")[0],
        description: description.trim(),
        notes: notes.trim() || undefined,
      });
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to create transaction. Please try again.");
    }
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
            Add Transaction
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={createTransaction.isPending}
          >
            {createTransaction.isPending ? (
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
          <View className="mt-6">
            <View className="flex-row rounded-xl bg-muted p-1">
              <Pressable
                className={`flex-1 items-center rounded-lg py-3 ${
                  type === "expense" ? "bg-red-500" : ""
                }`}
                onPress={() => {
                  setType("expense");
                  setCategoryId(""); // Reset category when switching type
                }}
              >
                <Text
                  className={`font-medium ${
                    type === "expense" ? "text-white" : "text-muted-foreground"
                  }`}
                >
                  Expense
                </Text>
              </Pressable>
              <Pressable
                className={`flex-1 items-center rounded-lg py-3 ${
                  type === "income" ? "bg-green-500" : ""
                }`}
                onPress={() => {
                  setType("income");
                  setCategoryId(""); // Reset category when switching type
                }}
              >
                <Text
                  className={`font-medium ${
                    type === "income" ? "text-white" : "text-muted-foreground"
                  }`}
                >
                  Income
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Amount */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Amount
            </Text>
            <View className="flex-row items-center rounded-xl bg-muted px-4">
              <Text
                className={`text-2xl font-bold ${
                  type === "expense" ? "text-red-500" : "text-green-500"
                }`}
              >
                {type === "expense" ? "-$" : "+$"}
              </Text>
              <TextInput
                className="flex-1 py-4 pl-2 text-2xl font-bold text-foreground"
                placeholder="0.00"
                placeholderTextColor={Colors.mutedForeground}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Description */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Description
            </Text>
            <TextInput
              className="rounded-xl bg-muted px-4 py-3 text-foreground"
              placeholder="e.g., Coffee at Starbucks"
              placeholderTextColor={Colors.mutedForeground}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Date */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Date
            </Text>
            <Pressable
              className="flex-row items-center justify-between rounded-xl bg-muted px-4 py-3"
              onPress={() => setShowDatePicker(true)}
            >
              <Text className="text-foreground">{formatDate(date)}</Text>
              <FontAwesome
                name="calendar"
                size={16}
                color={Colors.mutedForeground}
              />
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            )}
          </View>

          {/* Account */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Account
            </Text>
            <Pressable
              className="flex-row items-center justify-between rounded-xl bg-muted px-4 py-3"
              onPress={() => setShowAccountPicker(!showAccountPicker)}
            >
              <Text
                className={
                  selectedAccount ? "text-foreground" : "text-muted-foreground"
                }
              >
                {selectedAccount?.name || "Select an account"}
              </Text>
              <FontAwesome
                name={showAccountPicker ? "chevron-up" : "chevron-down"}
                size={12}
                color={Colors.mutedForeground}
              />
            </Pressable>
            {showAccountPicker && (
              <View className="mt-2 rounded-xl bg-muted">
                {accounts.map((account) => (
                  <Pressable
                    key={account.id}
                    className={`flex-row items-center border-b border-border px-4 py-3 ${
                      accountId === account.id ? "bg-primary/10" : ""
                    }`}
                    onPress={() => {
                      setAccountId(account.id);
                      setShowAccountPicker(false);
                    }}
                  >
                    <FontAwesome
                      name="university"
                      size={16}
                      color={
                        accountId === account.id
                          ? Colors.primary
                          : Colors.mutedForeground
                      }
                    />
                    <Text
                      className={`ml-3 ${
                        accountId === account.id
                          ? "font-medium text-primary"
                          : "text-foreground"
                      }`}
                    >
                      {account.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Category */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Category
            </Text>
            <Pressable
              className="flex-row items-center justify-between rounded-xl bg-muted px-4 py-3"
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <View className="flex-row items-center">
                {selectedCategory && (
                  <View
                    className="mr-2 h-4 w-4 rounded-full"
                    style={{
                      backgroundColor:
                        selectedCategory.color || Colors.mutedForeground,
                    }}
                  />
                )}
                <Text
                  className={
                    selectedCategory
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {selectedCategory?.name || "Select a category (optional)"}
                </Text>
              </View>
              <FontAwesome
                name={showCategoryPicker ? "chevron-up" : "chevron-down"}
                size={12}
                color={Colors.mutedForeground}
              />
            </Pressable>
            {showCategoryPicker && (
              <View className="mt-2 rounded-xl bg-muted">
                <Pressable
                  className={`flex-row items-center border-b border-border px-4 py-3 ${
                    !categoryId ? "bg-primary/10" : ""
                  }`}
                  onPress={() => {
                    setCategoryId("");
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text
                    className={!categoryId ? "text-primary" : "text-foreground"}
                  >
                    No category
                  </Text>
                </Pressable>
                {filteredCategories.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    isSelected={categoryId === category.id}
                    onPress={() => {
                      setCategoryId(category.id);
                      setShowCategoryPicker(false);
                    }}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Notes */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Notes (Optional)
            </Text>
            <TextInput
              className="h-24 rounded-xl bg-muted px-4 py-3 text-foreground"
              placeholder="Add any additional notes..."
              placeholderTextColor={Colors.mutedForeground}
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CategoryRow({
  category,
  isSelected,
  onPress,
}: {
  category: Category;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`flex-row items-center border-b border-border px-4 py-3 ${
        isSelected ? "bg-primary/10" : ""
      }`}
      onPress={onPress}
    >
      <View
        className="h-4 w-4 rounded-full"
        style={{ backgroundColor: category.color || Colors.mutedForeground }}
      />
      <Text
        className={`ml-3 ${
          isSelected ? "font-medium text-primary" : "text-foreground"
        }`}
      >
        {category.name}
      </Text>
    </Pressable>
  );
}
