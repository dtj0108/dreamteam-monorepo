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
import { useRouter, Stack } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

import { useCreateProject } from "../../../../../lib/hooks/useProjects";
import {
  ProjectStatus,
  ProjectPriority,
  PROJECT_COLORS,
  getProjectStatusLabel,
  getProjectPriorityLabel,
} from "../../../../../lib/types/projects";

const STATUS_OPTIONS: ProjectStatus[] = ["active", "on_hold", "completed", "archived"];
const PRIORITY_OPTIONS: ProjectPriority[] = ["low", "medium", "high", "critical"];

export default function NewProjectScreen() {
  const router = useRouter();
  const createProject = useCreateProject();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [priority, setPriority] = useState<ProjectPriority>("medium");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [targetEndDate, setTargetEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Project name is required");
      return;
    }

    try {
      await createProject.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        color,
        start_date: startDate?.toISOString().split("T")[0],
        target_end_date: targetEndDate?.toISOString().split("T")[0],
      });

      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to create project. Please try again.");
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

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "New Project",
          headerBackTitle: "Cancel",
          headerStyle: { backgroundColor: "#fafafa" },
          headerRight: () => (
            <Pressable
              onPress={handleSave}
              disabled={createProject.isPending || !name.trim()}
              className="mr-2"
            >
              {createProject.isPending ? (
                <ActivityIndicator size="small" color="#0ea5e9" />
              ) : (
                <Text
                  className={`font-semibold ${name.trim() ? "text-primary" : "text-gray-300"}`}
                >
                  Save
                </Text>
              )}
            </Pressable>
          ),
        }}
      />

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Name */}
        <View className="mt-4">
          <Text className="mb-1.5 text-sm font-medium text-foreground">
            Project Name <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            className="rounded-lg bg-muted px-4 py-3 text-foreground"
            placeholder="Enter project name"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
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
            placeholder="Enter project description"
            placeholderTextColor="#9ca3af"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ minHeight: 80 }}
          />
        </View>

        {/* Color Picker */}
        <View className="mt-4">
          <Text className="mb-1.5 text-sm font-medium text-foreground">Color</Text>
          <View className="flex-row flex-wrap gap-2">
            {PROJECT_COLORS.map((c) => (
              <Pressable
                key={c}
                className={`h-10 w-10 items-center justify-center rounded-full ${color === c ? "border-2" : ""}`}
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? "#0a0a0a" : "transparent",
                }}
                onPress={() => setColor(c)}
              >
                {color === c && (
                  <FontAwesome name="check" size={14} color="white" />
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Status */}
        <View className="mt-4">
          <Text className="mb-1.5 text-sm font-medium text-foreground">Status</Text>
          <View className="flex-row flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <Pressable
                key={s}
                className={`rounded-full px-4 py-2 ${status === s ? "bg-primary" : "bg-muted"}`}
                onPress={() => setStatus(s)}
              >
                <Text
                  className={`text-sm font-medium ${status === s ? "text-white" : "text-muted-foreground"}`}
                >
                  {getProjectStatusLabel(s)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Priority */}
        <View className="mt-4">
          <Text className="mb-1.5 text-sm font-medium text-foreground">Priority</Text>
          <View className="flex-row flex-wrap gap-2">
            {PRIORITY_OPTIONS.map((p) => (
              <Pressable
                key={p}
                className={`rounded-full px-4 py-2 ${priority === p ? "bg-primary" : "bg-muted"}`}
                onPress={() => setPriority(p)}
              >
                <Text
                  className={`text-sm font-medium ${priority === p ? "text-white" : "text-muted-foreground"}`}
                >
                  {getProjectPriorityLabel(p)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Dates */}
        <View className="mt-4 flex-row gap-4">
          {/* Start Date */}
          <View className="flex-1">
            <Text className="mb-1.5 text-sm font-medium text-foreground">
              Start Date
            </Text>
            <Pressable
              className="flex-row items-center rounded-lg bg-muted px-4 py-3"
              onPress={() => setShowStartPicker(true)}
            >
              <FontAwesome name="calendar-o" size={14} color="#6b7280" />
              <Text
                className={`ml-2 flex-1 ${startDate ? "text-foreground" : "text-muted-foreground"}`}
              >
                {formatDate(startDate)}
              </Text>
              {startDate && (
                <Pressable onPress={() => setStartDate(null)}>
                  <FontAwesome name="times-circle" size={14} color="#9ca3af" />
                </Pressable>
              )}
            </Pressable>
          </View>

          {/* Target End Date */}
          <View className="flex-1">
            <Text className="mb-1.5 text-sm font-medium text-foreground">
              Target End Date
            </Text>
            <Pressable
              className="flex-row items-center rounded-lg bg-muted px-4 py-3"
              onPress={() => setShowEndPicker(true)}
            >
              <FontAwesome name="calendar-o" size={14} color="#6b7280" />
              <Text
                className={`ml-2 flex-1 ${targetEndDate ? "text-foreground" : "text-muted-foreground"}`}
              >
                {formatDate(targetEndDate)}
              </Text>
              {targetEndDate && (
                <Pressable onPress={() => setTargetEndDate(null)}>
                  <FontAwesome name="times-circle" size={14} color="#9ca3af" />
                </Pressable>
              )}
            </Pressable>
          </View>
        </View>

        {/* Date Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={startDate || new Date()}
            mode="date"
            display="spinner"
            onChange={(event, date) => {
              setShowStartPicker(false);
              if (date) setStartDate(date);
            }}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={targetEndDate || new Date()}
            mode="date"
            display="spinner"
            onChange={(event, date) => {
              setShowEndPicker(false);
              if (date) setTargetEndDate(date);
            }}
          />
        )}
      </ScrollView>
    </View>
  );
}
