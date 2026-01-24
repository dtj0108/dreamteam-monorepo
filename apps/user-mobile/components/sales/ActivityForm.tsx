import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { FontAwesome } from "@expo/vector-icons";
import {
  ActivityType,
  ACTIVITY_TYPE_COLORS,
  ACTIVITY_TYPE_EMOJIS,
  CreateLeadActivityInput,
  getActivityTypeLabel,
} from "../../lib/types/sales";

const ACTIVITY_TYPES: ActivityType[] = ["call", "email", "meeting", "note", "task"];

interface ActivityFormProps {
  initialType?: ActivityType;
  onSubmit: (data: CreateLeadActivityInput) => void;
  isSubmitting?: boolean;
}

export function ActivityForm({
  initialType = "note",
  onSubmit,
  isSubmitting = false,
}: ActivityFormProps) {
  const [type, setType] = useState<ActivityType>(initialType);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleSubmit = () => {
    const data: CreateLeadActivityInput = {
      type,
      subject: subject.trim() || undefined,
      description: description.trim() || undefined,
      due_date: dueDate?.toISOString(),
      is_completed: type === "task" ? isCompleted : undefined,
    };
    onSubmit(data);
  };

  const showDueDate = type === "task" || type === "meeting";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Activity Type Section */}
        <View className="mt-4">
          <Text className="mb-2 text-sm font-medium text-muted-foreground">
            ACTIVITY TYPE
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {ACTIVITY_TYPES.map((t) => {
              const isSelected = type === t;
              const color = ACTIVITY_TYPE_COLORS[t];
              return (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  className={`flex-row items-center rounded-full px-4 py-2 ${
                    isSelected ? "" : "bg-muted"
                  }`}
                  style={isSelected ? { backgroundColor: color } : undefined}
                >
                  <Text className={isSelected ? "text-white" : ""}>
                    {ACTIVITY_TYPE_EMOJIS[t]}
                  </Text>
                  <Text
                    className={`ml-1.5 font-medium ${
                      isSelected ? "text-white" : "text-foreground"
                    }`}
                  >
                    {getActivityTypeLabel(t)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Details Section */}
        <View className="mt-6">
          <Text className="mb-2 text-sm font-medium text-muted-foreground">
            DETAILS
          </Text>
          <View className="rounded-xl bg-muted">
            {/* Subject */}
            <View className="border-b border-background p-4">
              <Text className="mb-1 text-xs text-muted-foreground">Subject</Text>
              <TextInput
                className="text-foreground"
                placeholder={`What's this ${getActivityTypeLabel(type).toLowerCase()} about?`}
                placeholderTextColor="#9ca3af"
                value={subject}
                onChangeText={setSubject}
                autoCapitalize="sentences"
              />
            </View>

            {/* Description */}
            <View className="p-4">
              <Text className="mb-1 text-xs text-muted-foreground">
                Description
              </Text>
              <TextInput
                className="min-h-[80px] text-foreground"
                placeholder="Add more details..."
                placeholderTextColor="#9ca3af"
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Date & Status Section (for tasks and meetings) */}
        {showDueDate && (
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              {type === "task" ? "TASK SETTINGS" : "MEETING SETTINGS"}
            </Text>
            <View className="rounded-xl bg-muted">
              {/* Due Date */}
              <Pressable
                className="flex-row items-center justify-between border-b border-background p-4"
                onPress={() => setShowDatePicker(!showDatePicker)}
              >
                <Text className="text-foreground">
                  {type === "task" ? "Due Date" : "Date & Time"}
                </Text>
                <View className="flex-row items-center">
                  <Text className="text-muted-foreground">
                    {dueDate
                      ? dueDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Not set"}
                  </Text>
                  <FontAwesome
                    name="calendar"
                    size={14}
                    color="#9ca3af"
                    style={{ marginLeft: 8 }}
                  />
                </View>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={dueDate || new Date()}
                  mode={type === "meeting" ? "datetime" : "date"}
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === "android") {
                      setShowDatePicker(false);
                    }
                    if (selectedDate) {
                      setDueDate(selectedDate);
                    }
                  }}
                />
              )}

              {/* Completed toggle for tasks */}
              {type === "task" && (
                <Pressable
                  className="flex-row items-center justify-between p-4"
                  onPress={() => setIsCompleted(!isCompleted)}
                >
                  <Text className="text-foreground">Mark as Completed</Text>
                  <View
                    className={`h-6 w-6 items-center justify-center rounded-md ${
                      isCompleted ? "bg-green-500" : "border border-gray-300"
                    }`}
                  >
                    {isCompleted && (
                      <FontAwesome name="check" size={14} color="white" />
                    )}
                  </View>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Submit Button */}
        <View className="mt-8">
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            className="items-center rounded-xl bg-primary py-4 active:opacity-70"
            style={{ opacity: isSubmitting ? 0.5 : 1 }}
          >
            <Text className="font-semibold text-white">
              {isSubmitting ? "Saving..." : "Log Activity"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
