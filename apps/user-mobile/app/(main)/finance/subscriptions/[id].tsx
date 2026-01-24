import FontAwesome from "@expo/vector-icons/FontAwesome";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import { useCategoriesByType } from "@/lib/hooks/useCategories";
import {
  useDeleteSubscription,
  useSubscription,
  useUpdateSubscription,
} from "@/lib/hooks/useSubscriptions";
import { Category, SubscriptionFrequency } from "@/lib/types/finance";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(amount));
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
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

const FREQUENCY_OPTIONS: SubscriptionFrequency[] = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
];

export default function SubscriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: subscription, isLoading } = useSubscription(id);
  const updateSubscription = useUpdateSubscription();
  const deleteSubscription = useDeleteSubscription();
  const { data: expenseCategories } = useCategoriesByType("expense");

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<SubscriptionFrequency>("monthly");
  const [nextRenewalDate, setNextRenewalDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Initialize form when subscription loads
  useEffect(() => {
    if (subscription) {
      setName(subscription.name);
      setAmount(Math.abs(subscription.amount).toString());
      setFrequency(subscription.frequency);
      setNextRenewalDate(new Date(subscription.next_renewal_date));
      setSelectedCategory(subscription.category || null);
      setIsActive(subscription.is_active);
      setNotes(subscription.notes || "");
    }
  }, [subscription]);

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
      await updateSubscription.mutateAsync({
        id,
        data: {
          name: name.trim(),
          amount: -Math.abs(parseFloat(amount)),
          frequency,
          next_renewal_date: nextRenewalDate.toISOString().split("T")[0],
          category_id: selectedCategory?.id,
          is_active: isActive,
          notes: notes.trim() || undefined,
        },
      });
      setIsEditing(false);
    } catch {
      Alert.alert(
        "Error",
        "Failed to update subscription. Please try again."
      );
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Subscription",
      "Are you sure you want to delete this subscription?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSubscription.mutateAsync(id);
              router.back();
            } catch {
              Alert.alert(
                "Error",
                "Failed to delete subscription. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async () => {
    try {
      await updateSubscription.mutateAsync({
        id,
        data: { is_active: !subscription?.is_active },
      });
    } catch {
      Alert.alert(
        "Error",
        "Failed to update subscription. Please try again."
      );
    }
  };

  if (isLoading || !subscription) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <Loading />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Pressable onPress={() => router.back()}>
            <FontAwesome
              name="chevron-left"
              size={18}
              color={Colors.primary}
            />
          </Pressable>
          <Text className="text-lg font-semibold text-foreground">
            {isEditing ? "Edit Subscription" : "Subscription Details"}
          </Text>
          {isEditing ? (
            <Pressable
              onPress={handleSave}
              disabled={updateSubscription.isPending}
            >
              {updateSubscription.isPending ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text className="font-semibold text-primary">Save</Text>
              )}
            </Pressable>
          ) : (
            <Pressable onPress={() => setIsEditing(true)}>
              <Text className="font-semibold text-primary">Edit</Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {isEditing ? (
            // Edit Mode
            <>
              {/* Name */}
              <View className="mt-6">
                <Text className="mb-2 text-sm font-medium text-muted-foreground">
                  Subscription Name
                </Text>
                <TextInput
                  className="rounded-xl bg-muted px-4 py-3 text-foreground"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Amount */}
              <View className="mt-6">
                <Text className="mb-2 text-sm font-medium text-muted-foreground">
                  Amount
                </Text>
                <View className="flex-row items-center rounded-xl bg-muted px-4">
                  <Text className="text-lg text-muted-foreground">$</Text>
                  <TextInput
                    className="flex-1 py-3 pl-2 text-lg text-foreground"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Frequency */}
              <View className="mt-6">
                <Text className="mb-2 text-sm font-medium text-muted-foreground">
                  Billing Frequency
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {FREQUENCY_OPTIONS.map((freq) => {
                    const isSelected = frequency === freq;
                    return (
                      <Pressable
                        key={freq}
                        onPress={() => setFrequency(freq)}
                        className={`rounded-full px-4 py-2 ${
                          isSelected
                            ? "border-2 border-primary bg-primary/10"
                            : "bg-muted"
                        }`}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            isSelected ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          {FREQUENCY_LABELS[freq]}
                        </Text>
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
                    {formatDate(nextRenewalDate.toISOString())}
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

              {/* Category */}
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
                        onPress={() =>
                          setSelectedCategory(isSelected ? null : category)
                        }
                        className={`flex-row items-center rounded-full px-4 py-2 ${
                          isSelected ? "border-2" : "bg-muted"
                        }`}
                        style={
                          isSelected
                            ? {
                                borderColor: color,
                                backgroundColor: color + "20",
                              }
                            : {}
                        }
                      >
                        <Text
                          className={`text-sm font-medium ${
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

              {/* Active Toggle */}
              <View className="mt-6 flex-row items-center justify-between rounded-xl bg-muted p-4">
                <View>
                  <Text className="font-medium text-foreground">Active</Text>
                  <Text className="text-sm text-muted-foreground">
                    Paused subscriptions won't show renewal alerts
                  </Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{
                    false: Colors.mutedForeground,
                    true: Colors.primary,
                  }}
                />
              </View>

              {/* Notes */}
              <View className="mt-6">
                <Text className="mb-2 text-sm font-medium text-muted-foreground">
                  Notes
                </Text>
                <TextInput
                  className="rounded-xl bg-muted px-4 py-3 text-foreground"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={{ minHeight: 80 }}
                />
              </View>

              {/* Delete Button */}
              <Pressable
                className="mt-8 rounded-xl bg-destructive/10 py-4"
                onPress={handleDelete}
              >
                <Text className="text-center font-semibold text-destructive">
                  Delete Subscription
                </Text>
              </Pressable>

              {/* Cancel Button */}
              <Pressable
                className="mt-3 py-4"
                onPress={() => setIsEditing(false)}
              >
                <Text className="text-center text-muted-foreground">
                  Cancel
                </Text>
              </Pressable>
            </>
          ) : (
            // View Mode
            <>
              {/* Subscription Header */}
              <View className="mt-6 items-center">
                <View
                  className="h-16 w-16 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor:
                      (subscription.category?.color || Colors.primary) + "20",
                  }}
                >
                  <FontAwesome
                    name="credit-card"
                    size={28}
                    color={subscription.category?.color || Colors.primary}
                  />
                </View>
                <Text className="mt-3 text-2xl font-bold text-foreground">
                  {subscription.name}
                </Text>
                <Text className="text-muted-foreground">
                  {subscription.category?.name || "Uncategorized"}
                </Text>

                {/* Status Badge */}
                <View className="mt-3">
                  {subscription.is_active ? (
                    <View className="rounded-full bg-green-500/10 px-4 py-2">
                      <Text className="text-sm font-medium text-green-500">
                        Active
                      </Text>
                    </View>
                  ) : (
                    <View className="rounded-full bg-amber-500/10 px-4 py-2">
                      <Text className="text-sm font-medium text-amber-500">
                        Paused
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Amount and Frequency */}
              <View className="mt-6 rounded-xl bg-muted p-4">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-sm text-muted-foreground">Amount</Text>
                    <Text className="text-2xl font-bold text-foreground">
                      {formatCurrency(subscription.amount)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm text-muted-foreground">
                      Frequency
                    </Text>
                    <Text className="font-semibold text-foreground">
                      {FREQUENCY_LABELS[subscription.frequency]}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Next Renewal */}
              <View className="mt-4 rounded-xl bg-muted p-4">
                <View className="flex-row items-center">
                  <FontAwesome
                    name="calendar"
                    size={16}
                    color={Colors.mutedForeground}
                  />
                  <Text className="ml-2 text-muted-foreground">
                    Next Renewal
                  </Text>
                </View>
                <Text className="mt-2 font-medium text-foreground">
                  {formatDate(subscription.next_renewal_date)}
                </Text>
              </View>

              {/* Notes */}
              {subscription.notes && (
                <View className="mt-4 rounded-xl bg-muted p-4">
                  <Text className="text-sm text-muted-foreground">Notes</Text>
                  <Text className="mt-1 text-foreground">
                    {subscription.notes}
                  </Text>
                </View>
              )}

              {/* Pause/Resume Button */}
              <Pressable
                className="mt-6 rounded-xl py-4"
                style={{
                  backgroundColor: subscription.is_active
                    ? Colors.warning + "20"
                    : Colors.success + "20",
                }}
                onPress={handleToggleActive}
                disabled={updateSubscription.isPending}
              >
                {updateSubscription.isPending ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      subscription.is_active ? Colors.warning : Colors.success
                    }
                  />
                ) : (
                  <Text
                    className="text-center font-semibold"
                    style={{
                      color: subscription.is_active
                        ? Colors.warning
                        : Colors.success,
                    }}
                  >
                    {subscription.is_active
                      ? "Pause Subscription"
                      : "Resume Subscription"}
                  </Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
