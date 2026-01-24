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
import { useCategoriesByType } from "@/lib/hooks/useCategories";
import { useCreateSubscription } from "@/lib/hooks/useSubscriptions";
import { Category, SubscriptionFrequency } from "@/lib/types/finance";

const FREQUENCY_OPTIONS: {
  value: SubscriptionFrequency;
  label: string;
  description: string;
}[] = [
  { value: "daily", label: "Daily", description: "Charges every day" },
  { value: "weekly", label: "Weekly", description: "Charges every week" },
  {
    value: "biweekly",
    label: "Bi-weekly",
    description: "Charges every 2 weeks",
  },
  { value: "monthly", label: "Monthly", description: "Charges every month" },
  {
    value: "quarterly",
    label: "Quarterly",
    description: "Charges every 3 months",
  },
  { value: "yearly", label: "Yearly", description: "Charges every year" },
];

export default function NewSubscriptionScreen() {
  const router = useRouter();
  const createSubscription = useCreateSubscription();
  const { data: expenseCategories, isLoading: categoriesLoading } =
    useCategoriesByType("expense");

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<SubscriptionFrequency>("monthly");
  const [nextRenewalDate, setNextRenewalDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [notes, setNotes] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a subscription name");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    try {
      await createSubscription.mutateAsync({
        name: name.trim(),
        amount: -Math.abs(parseFloat(amount)), // Subscriptions are expenses
        frequency,
        next_renewal_date: nextRenewalDate.toISOString().split("T")[0],
        category_id: selectedCategory?.id,
        notes: notes.trim() || undefined,
      });
      router.back();
    } catch {
      Alert.alert("Error", "Failed to create subscription. Please try again.");
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
            Add Subscription
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={createSubscription.isPending}
          >
            {createSubscription.isPending ? (
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
          {/* Name Input */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Subscription Name
            </Text>
            <TextInput
              className="rounded-xl bg-muted px-4 py-3 text-foreground"
              placeholder="e.g., Netflix, Spotify"
              placeholderTextColor={Colors.mutedForeground}
              value={name}
              onChangeText={setName}
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

          {/* Frequency Selection */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Billing Frequency
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

          {/* Next Renewal Date */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Next Renewal Date
            </Text>
            <Pressable
              className="flex-row items-center justify-between rounded-xl bg-muted px-4 py-3"
              onPress={() => setShowDatePicker(true)}
            >
              <Text className="text-foreground">
                {formatDate(nextRenewalDate)}
              </Text>
              <FontAwesome
                name="calendar"
                size={16}
                color={Colors.mutedForeground}
              />
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={nextRenewalDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, date) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (date) setNextRenewalDate(date);
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
                {expenseCategories.map((category) => {
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

          {/* Notes */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Notes (Optional)
            </Text>
            <TextInput
              className="rounded-xl bg-muted px-4 py-3 text-foreground"
              placeholder="Add any notes..."
              placeholderTextColor={Colors.mutedForeground}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
