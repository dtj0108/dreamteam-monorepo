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
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { useCreateBudget } from "@/lib/hooks/useBudgets";
import { useCategoriesByType } from "@/lib/hooks/useCategories";
import { BudgetPeriod, Category } from "@/lib/types/finance";

const PERIOD_OPTIONS: { value: BudgetPeriod; label: string; description: string }[] = [
  { value: "weekly", label: "Weekly", description: "Resets every week" },
  { value: "biweekly", label: "Bi-weekly", description: "Resets every 2 weeks" },
  { value: "monthly", label: "Monthly", description: "Resets every month" },
  { value: "yearly", label: "Yearly", description: "Resets every year" },
];

export default function NewBudgetScreen() {
  const router = useRouter();
  const createBudget = useCreateBudget();
  const { data: expenseCategories, isLoading: categoriesLoading } =
    useCategoriesByType("expense");

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");
  const [startDate, setStartDate] = useState(new Date());
  const [rollover, setRollover] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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
      await createBudget.mutateAsync({
        category_id: selectedCategory.id,
        amount: parseFloat(amount),
        period,
        start_date: startDate.toISOString().split("T")[0],
        rollover,
      });
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to create budget. Please try again.");
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
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
            Create Budget
          </Text>
          <Pressable onPress={handleSave} disabled={createBudget.isPending}>
            {createBudget.isPending ? (
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
          {/* Category Selection */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Category
            </Text>
            {categoriesLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : expenseCategories.length > 0 ? (
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
            ) : (
              <View className="rounded-xl bg-muted p-4">
                <Text className="text-center text-muted-foreground">
                  No expense categories found. Create categories first.
                </Text>
              </View>
            )}
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
            <View className="gap-2">
              {PERIOD_OPTIONS.map((option) => {
                const isSelected = period === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setPeriod(option.value)}
                    className={`flex-row items-center justify-between rounded-xl p-4 ${
                      isSelected ? "bg-primary/10 border-2 border-primary" : "bg-muted"
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
                      <FontAwesome name="check" size={16} color={Colors.primary} />
                    )}
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
              <Text className="text-foreground">{formatDate(startDate)}</Text>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
