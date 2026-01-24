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
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Loading } from "@/components/Loading";
import { Colors } from "@/constants/Colors";
import {
  useDeleteGoal,
  useGoal,
  useUpdateGoal,
} from "@/lib/hooks/useGoals";
import {
  GOAL_TYPE_COLORS,
  GOAL_TYPE_LABELS,
  getGoalProgress,
  isGoalOnTrack,
} from "@/lib/types/finance";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: goal, isLoading } = useGoal(id);
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Initialize form when goal loads
  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setTargetAmount(goal.target_amount.toString());
      setCurrentAmount(goal.current_amount.toString());
      setStartDate(new Date(goal.start_date));
      setEndDate(goal.end_date ? new Date(goal.end_date) : null);
      setNotes(goal.notes || "");
    }
  }, [goal]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a goal name");
      return;
    }
    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid target amount");
      return;
    }

    try {
      await updateGoal.mutateAsync({
        id,
        data: {
          name: name.trim(),
          target_amount: parseFloat(targetAmount),
          current_amount: parseFloat(currentAmount) || 0,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate ? endDate.toISOString().split("T")[0] : undefined,
          notes: notes.trim() || undefined,
        },
      });
      setIsEditing(false);
    } catch {
      Alert.alert("Error", "Failed to update goal. Please try again.");
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Goal", "Are you sure you want to delete this goal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGoal.mutateAsync(id);
            router.back();
          } catch {
            Alert.alert("Error", "Failed to delete goal. Please try again.");
          }
        },
      },
    ]);
  };

  const handleMarkAchieved = async () => {
    try {
      await updateGoal.mutateAsync({
        id,
        data: { is_achieved: !goal?.is_achieved },
      });
    } catch {
      Alert.alert("Error", "Failed to update goal. Please try again.");
    }
  };

  if (isLoading || !goal) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <Loading />
      </SafeAreaView>
    );
  }

  const progress = getGoalProgress(goal);
  const onTrack = isGoalOnTrack(goal);
  const color = GOAL_TYPE_COLORS[goal.type];

  // Get appropriate unit display based on goal type
  const getValueDisplay = (amount: number) => {
    if (goal.type === "runway") return `${amount} months`;
    if (goal.type === "revenue_multiple") return `${amount}x`;
    return formatCurrency(amount);
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
            <FontAwesome
              name="chevron-left"
              size={18}
              color={Colors.primary}
            />
          </Pressable>
          <Text className="text-lg font-semibold text-foreground">
            {isEditing ? "Edit Goal" : "Goal Details"}
          </Text>
          {isEditing ? (
            <Pressable onPress={handleSave} disabled={updateGoal.isPending}>
              {updateGoal.isPending ? (
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
              {/* Goal Name */}
              <View className="mt-6">
                <Text className="mb-2 text-sm font-medium text-muted-foreground">
                  Goal Name
                </Text>
                <TextInput
                  className="rounded-xl bg-muted px-4 py-3 text-foreground"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Target Amount */}
              <View className="mt-6">
                <Text className="mb-2 text-sm font-medium text-muted-foreground">
                  Target Amount
                </Text>
                <TextInput
                  className="rounded-xl bg-muted px-4 py-3 text-foreground"
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Current Amount */}
              <View className="mt-6">
                <Text className="mb-2 text-sm font-medium text-muted-foreground">
                  Current Amount
                </Text>
                <TextInput
                  className="rounded-xl bg-muted px-4 py-3 text-foreground"
                  value={currentAmount}
                  onChangeText={setCurrentAmount}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Start Date */}
              <View className="mt-6">
                <Text className="mb-2 text-sm font-medium text-muted-foreground">
                  Start Date
                </Text>
                <Pressable
                  className="flex-row items-center justify-between rounded-xl bg-muted px-4 py-3"
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text className="text-foreground">
                    {formatDate(startDate.toISOString())}
                  </Text>
                  <FontAwesome
                    name="calendar"
                    size={16}
                    color={Colors.mutedForeground}
                  />
                </Pressable>
                {showStartPicker && (
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(event, date) => {
                      setShowStartPicker(Platform.OS === "ios");
                      if (date) setStartDate(date);
                    }}
                  />
                )}
              </View>

              {/* End Date */}
              <View className="mt-6">
                <Text className="mb-2 text-sm font-medium text-muted-foreground">
                  Target Date
                </Text>
                <Pressable
                  className="flex-row items-center justify-between rounded-xl bg-muted px-4 py-3"
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text
                    className={
                      endDate ? "text-foreground" : "text-muted-foreground"
                    }
                  >
                    {endDate
                      ? formatDate(endDate.toISOString())
                      : "Select target date"}
                  </Text>
                  <FontAwesome
                    name="calendar"
                    size={16}
                    color={Colors.mutedForeground}
                  />
                </Pressable>
                {showEndPicker && (
                  <DateTimePicker
                    value={endDate || new Date()}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    minimumDate={startDate}
                    onChange={(event, date) => {
                      setShowEndPicker(Platform.OS === "ios");
                      if (date) setEndDate(date);
                    }}
                  />
                )}
                {endDate && (
                  <Pressable className="mt-2" onPress={() => setEndDate(null)}>
                    <Text className="text-sm text-primary">
                      Clear target date
                    </Text>
                  </Pressable>
                )}
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
                  Delete Goal
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
              {/* Goal Header */}
              <View className="mt-6 items-center">
                <View
                  className="h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: color + "20" }}
                >
                  <FontAwesome name="bullseye" size={28} color={color} />
                </View>
                <Text className="mt-3 text-2xl font-bold text-foreground">
                  {goal.name}
                </Text>
                <Text className="text-muted-foreground">
                  {GOAL_TYPE_LABELS[goal.type]}
                </Text>

                {/* Status Badge */}
                <View className="mt-3">
                  {goal.is_achieved ? (
                    <View className="rounded-full bg-green-500/10 px-4 py-2">
                      <Text className="text-sm font-medium text-green-500">
                        Achieved
                      </Text>
                    </View>
                  ) : onTrack ? (
                    <View className="rounded-full bg-primary/10 px-4 py-2">
                      <Text className="text-sm font-medium text-primary">
                        On Track
                      </Text>
                    </View>
                  ) : (
                    <View className="rounded-full bg-amber-500/10 px-4 py-2">
                      <Text className="text-sm font-medium text-amber-500">
                        Behind Schedule
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Progress Section */}
              <View className="mt-6 rounded-xl bg-muted p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-muted-foreground">
                    Progress
                  </Text>
                  <Text
                    className="text-lg font-bold"
                    style={{ color: goal.is_achieved ? Colors.success : color }}
                  >
                    {Math.round(progress)}%
                  </Text>
                </View>
                <View className="mt-2 h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: goal.is_achieved ? Colors.success : color,
                    }}
                  />
                </View>
                <View className="mt-3 flex-row justify-between">
                  <View>
                    <Text className="text-xs text-muted-foreground">
                      Current
                    </Text>
                    <Text className="font-semibold text-foreground">
                      {getValueDisplay(goal.current_amount)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs text-muted-foreground">
                      Target
                    </Text>
                    <Text className="font-semibold text-foreground">
                      {getValueDisplay(goal.target_amount)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Date Range */}
              <View className="mt-4 rounded-xl bg-muted p-4">
                <View className="flex-row items-center">
                  <FontAwesome
                    name="calendar"
                    size={16}
                    color={Colors.mutedForeground}
                  />
                  <Text className="ml-2 text-muted-foreground">Timeline</Text>
                </View>
                <Text className="mt-2 font-medium text-foreground">
                  {formatDate(goal.start_date)}
                  {goal.end_date && ` - ${formatDate(goal.end_date)}`}
                </Text>
              </View>

              {/* Notes */}
              {goal.notes && (
                <View className="mt-4 rounded-xl bg-muted p-4">
                  <Text className="text-sm text-muted-foreground">Notes</Text>
                  <Text className="mt-1 text-foreground">{goal.notes}</Text>
                </View>
              )}

              {/* Mark as Achieved Button */}
              <Pressable
                className="mt-6 rounded-xl py-4"
                style={{
                  backgroundColor: goal.is_achieved
                    ? Colors.mutedForeground + "20"
                    : Colors.success + "20",
                }}
                onPress={handleMarkAchieved}
                disabled={updateGoal.isPending}
              >
                {updateGoal.isPending ? (
                  <ActivityIndicator size="small" color={Colors.success} />
                ) : (
                  <Text
                    className="text-center font-semibold"
                    style={{
                      color: goal.is_achieved
                        ? Colors.mutedForeground
                        : Colors.success,
                    }}
                  >
                    {goal.is_achieved
                      ? "Mark as Not Achieved"
                      : "Mark as Achieved"}
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
