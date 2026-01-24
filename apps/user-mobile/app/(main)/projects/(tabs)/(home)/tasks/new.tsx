import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

import { useCreateTask, useProjectMembers } from "../../../../../../lib/hooks/useProjects";
import {
  TaskStatus,
  TaskPriority,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
  getTaskStatusLabel,
  getTaskPriorityLabel,
} from "../../../../../../lib/types/projects";

const STATUS_OPTIONS: TaskStatus[] = ["todo", "in_progress", "review", "done"];
const PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high", "urgent"];

export default function NewTaskScreen() {
  const router = useRouter();
  const { projectId, defaultStatus } = useLocalSearchParams<{
    projectId: string;
    defaultStatus?: TaskStatus;
  }>();

  const createTask = useCreateTask(projectId);
  const { data: membersData } = useProjectMembers(projectId);
  const members = membersData?.members || [];

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus || "todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [estimatedHours, setEstimatedHours] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Task title is required");
      return;
    }

    try {
      await createTask.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        due_date: dueDate?.toISOString().split("T")[0],
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        assignees: selectedAssignees.length > 0 ? selectedAssignees : undefined,
      });

      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to create task. Please try again.");
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Select date";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "New Task",
          headerBackTitle: "Cancel",
          headerStyle: { backgroundColor: "#fafafa" },
          headerRight: () => (
            <Pressable
              onPress={handleSave}
              disabled={createTask.isPending || !title.trim()}
              className="mr-2"
            >
              {createTask.isPending ? (
                <ActivityIndicator size="small" color="#0ea5e9" />
              ) : (
                <Text
                  className={`font-semibold ${title.trim() ? "text-primary" : "text-gray-300"}`}
                >
                  Save
                </Text>
              )}
            </Pressable>
          ),
        }}
      />

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Title */}
        <View className="mt-4">
          <Text className="mb-1.5 text-sm font-medium text-foreground">
            Task Title <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            className="rounded-lg bg-muted px-4 py-3 text-foreground"
            placeholder="Enter task title"
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={setTitle}
            autoFocus
          />
        </View>

        {/* Description */}
        <View className="mt-4">
          <Text className="mb-1.5 text-sm font-medium text-foreground">
            Description
          </Text>
          <TextInput
            className="rounded-lg bg-muted px-4 py-3 text-foreground"
            placeholder="Enter task description"
            placeholderTextColor="#9ca3af"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ minHeight: 80 }}
          />
        </View>

        {/* Status */}
        <View className="mt-4">
          <Text className="mb-1.5 text-sm font-medium text-foreground">Status</Text>
          <View className="flex-row flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => {
              const isSelected = status === s;
              const color = TASK_STATUS_COLORS[s];
              return (
                <Pressable
                  key={s}
                  className={`rounded-full px-4 py-2 ${isSelected ? "" : "bg-muted"}`}
                  style={isSelected ? { backgroundColor: color } : undefined}
                  onPress={() => setStatus(s)}
                >
                  <Text
                    className={`text-sm font-medium ${isSelected ? "text-white" : "text-muted-foreground"}`}
                  >
                    {getTaskStatusLabel(s)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Priority */}
        <View className="mt-4">
          <Text className="mb-1.5 text-sm font-medium text-foreground">Priority</Text>
          <View className="flex-row flex-wrap gap-2">
            {PRIORITY_OPTIONS.map((p) => {
              const isSelected = priority === p;
              const color = TASK_PRIORITY_COLORS[p];
              return (
                <Pressable
                  key={p}
                  className={`rounded-full px-4 py-2 ${isSelected ? "" : "bg-muted"}`}
                  style={isSelected ? { backgroundColor: color } : undefined}
                  onPress={() => setPriority(p)}
                >
                  <Text
                    className={`text-sm font-medium ${isSelected ? "text-white" : "text-muted-foreground"}`}
                  >
                    {getTaskPriorityLabel(p)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Due Date and Estimated Hours */}
        <View className="mt-4 flex-row gap-4">
          {/* Due Date */}
          <View className="flex-1">
            <Text className="mb-1.5 text-sm font-medium text-foreground">
              Due Date
            </Text>
            <Pressable
              className="flex-row items-center rounded-lg bg-muted px-4 py-3"
              onPress={() => setShowDatePicker(true)}
            >
              <FontAwesome name="calendar-o" size={14} color="#6b7280" />
              <Text
                className={`ml-2 flex-1 ${dueDate ? "text-foreground" : "text-muted-foreground"}`}
              >
                {formatDate(dueDate)}
              </Text>
              {dueDate && (
                <Pressable onPress={() => setDueDate(null)}>
                  <FontAwesome name="times-circle" size={14} color="#9ca3af" />
                </Pressable>
              )}
            </Pressable>
          </View>

          {/* Estimated Hours */}
          <View className="flex-1">
            <Text className="mb-1.5 text-sm font-medium text-foreground">
              Est. Hours
            </Text>
            <TextInput
              className="rounded-lg bg-muted px-4 py-3 text-foreground"
              placeholder="0"
              placeholderTextColor="#9ca3af"
              value={estimatedHours}
              onChangeText={setEstimatedHours}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={dueDate || new Date()}
            mode="date"
            display="spinner"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) setDueDate(date);
            }}
          />
        )}

        {/* Assignees */}
        {members.length > 0 && (
          <View className="mt-4">
            <Text className="mb-1.5 text-sm font-medium text-foreground">
              Assignees
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {members.map((member) => {
                const isSelected = selectedAssignees.includes(member.user_id);
                return (
                  <Pressable
                    key={member.id}
                    className={`flex-row items-center rounded-full px-3 py-2 ${isSelected ? "bg-primary" : "bg-muted"}`}
                    onPress={() => toggleAssignee(member.user_id)}
                  >
                    {member.user.avatar_url ? (
                      <View className="h-6 w-6 rounded-full bg-gray-200 overflow-hidden mr-2">
                        {/* Avatar image would go here */}
                      </View>
                    ) : (
                      <View className="h-6 w-6 rounded-full bg-gray-300 items-center justify-center mr-2">
                        <Text className="text-xs font-medium text-gray-600">
                          {member.user.name?.charAt(0)?.toUpperCase() || "?"}
                        </Text>
                      </View>
                    )}
                    <Text
                      className={`text-sm font-medium ${isSelected ? "text-white" : "text-muted-foreground"}`}
                    >
                      {member.user.name || "Unknown"}
                    </Text>
                    {isSelected && (
                      <FontAwesome
                        name="check"
                        size={12}
                        color="white"
                        style={{ marginLeft: 6 }}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
