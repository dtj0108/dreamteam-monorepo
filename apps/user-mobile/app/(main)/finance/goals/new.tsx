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
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { useCreateGoal } from "@/lib/hooks/useGoals";
import { GoalType, GOAL_TYPE_COLORS } from "@/lib/types/finance";

const GOAL_TYPE_OPTIONS: {
  value: GoalType;
  label: string;
  icon: React.ComponentProps<typeof FontAwesome>["name"];
}[] = [
  { value: "revenue", label: "Revenue", icon: "line-chart" },
  { value: "profit", label: "Profit", icon: "money" },
  { value: "valuation", label: "Valuation", icon: "building" },
  { value: "runway", label: "Runway (months)", icon: "road" },
  { value: "revenue_multiple", label: "Revenue Multiple", icon: "times" },
];

export default function NewGoalScreen() {
  const router = useRouter();
  const { type: initialType } = useLocalSearchParams<{ type?: GoalType }>();
  const createGoal = useCreateGoal();

  const [goalType, setGoalType] = useState<GoalType>(initialType || "revenue");
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

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
      await createGoal.mutateAsync({
        type: goalType,
        name: name.trim(),
        target_amount: parseFloat(targetAmount),
        current_amount: currentAmount ? parseFloat(currentAmount) : 0,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate ? endDate.toISOString().split("T")[0] : undefined,
        notes: notes.trim() || undefined,
      });
      router.back();
    } catch {
      Alert.alert("Error", "Failed to create goal. Please try again.");
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const selectedColor = GOAL_TYPE_COLORS[goalType];

  // Get appropriate unit label based on goal type
  const getUnitPrefix = () => {
    if (goalType === "runway" || goalType === "revenue_multiple") return "";
    return "$";
  };

  const getUnitSuffix = () => {
    if (goalType === "runway") return " months";
    if (goalType === "revenue_multiple") return "x";
    return "";
  };

  const getPlaceholder = () => {
    if (goalType === "runway") return "12";
    if (goalType === "revenue_multiple") return "5";
    return "100000";
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
            Create Goal
          </Text>
          <Pressable onPress={handleSave} disabled={createGoal.isPending}>
            {createGoal.isPending ? (
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
          {/* Goal Type Selection */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Goal Type
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {GOAL_TYPE_OPTIONS.map((option) => {
                const isSelected = goalType === option.value;
                const color = GOAL_TYPE_COLORS[option.value];
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setGoalType(option.value)}
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
                      name={option.icon}
                      size={14}
                      color={isSelected ? color : Colors.mutedForeground}
                    />
                    <Text
                      className={`ml-2 text-sm font-medium ${
                        isSelected ? "" : "text-muted-foreground"
                      }`}
                      style={isSelected ? { color } : {}}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Goal Name */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Goal Name
            </Text>
            <TextInput
              className="rounded-xl bg-muted px-4 py-3 text-foreground"
              placeholder="e.g., Q1 Revenue Target"
              placeholderTextColor={Colors.mutedForeground}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Target Amount */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Target Amount
            </Text>
            <View className="flex-row items-center rounded-xl bg-muted px-4">
              {getUnitPrefix() && (
                <Text className="text-lg text-muted-foreground">
                  {getUnitPrefix()}
                </Text>
              )}
              <TextInput
                className="flex-1 py-3 pl-2 text-lg text-foreground"
                placeholder={getPlaceholder()}
                placeholderTextColor={Colors.mutedForeground}
                value={targetAmount}
                onChangeText={setTargetAmount}
                keyboardType="decimal-pad"
              />
              {getUnitSuffix() && (
                <Text className="text-lg text-muted-foreground">
                  {getUnitSuffix()}
                </Text>
              )}
            </View>
          </View>

          {/* Current Amount */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Current Amount (Optional)
            </Text>
            <View className="flex-row items-center rounded-xl bg-muted px-4">
              {getUnitPrefix() && (
                <Text className="text-lg text-muted-foreground">
                  {getUnitPrefix()}
                </Text>
              )}
              <TextInput
                className="flex-1 py-3 pl-2 text-lg text-foreground"
                placeholder="0"
                placeholderTextColor={Colors.mutedForeground}
                value={currentAmount}
                onChangeText={setCurrentAmount}
                keyboardType="decimal-pad"
              />
              {getUnitSuffix() && (
                <Text className="text-lg text-muted-foreground">
                  {getUnitSuffix()}
                </Text>
              )}
            </View>
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
              <Text className="text-foreground">{formatDate(startDate)}</Text>
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
              Target Date (Optional)
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
                {endDate ? formatDate(endDate) : "Select target date"}
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
                <Text className="text-sm text-primary">Clear target date</Text>
              </Pressable>
            )}
          </View>

          {/* Notes */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Notes (Optional)
            </Text>
            <TextInput
              className="rounded-xl bg-muted px-4 py-3 text-foreground"
              placeholder="Add any notes about this goal..."
              placeholderTextColor={Colors.mutedForeground}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ minHeight: 80 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
