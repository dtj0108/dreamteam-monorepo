import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

import {
  useMilestones,
  useCreateMilestone,
  useDeleteMilestone,
  useTasks,
} from "../../../../lib/hooks/useProjects";
import {
  Milestone,
  MilestoneStatus,
  MILESTONE_STATUS_COLORS,
  getMilestoneStatusLabel,
  getMilestoneStatusIcon,
  TASK_STATUS_COLORS,
} from "../../../../lib/types/projects";
import { ProgressBar } from "../../../../components/projects/ProgressBar";

export default function ProjectMilestonesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTargetDate, setNewTargetDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Fetch data
  const { data: milestonesData, isLoading, refetch } = useMilestones(id);
  const { data: tasksData } = useTasks(id);
  const milestones = milestonesData?.milestones || [];
  const tasks = tasksData?.tasks || [];

  // Mutations
  const createMilestone = useCreateMilestone(id);
  const deleteMilestone = useDeleteMilestone(id);

  // Calculate stats
  const stats = {
    total: milestones.length,
    upcoming: milestones.filter((m) => m.status === "upcoming").length,
    at_risk: milestones.filter((m) => m.status === "at_risk").length,
    completed: milestones.filter((m) => m.status === "completed").length,
    missed: milestones.filter((m) => m.status === "missed").length,
  };

  const handleCreateMilestone = async () => {
    if (!newName.trim()) {
      Alert.alert("Error", "Milestone name is required");
      return;
    }

    try {
      await createMilestone.mutateAsync({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        target_date: newTargetDate.toISOString().split("T")[0],
      });

      setShowCreateModal(false);
      setNewName("");
      setNewDescription("");
      setNewTargetDate(new Date());
    } catch (error) {
      Alert.alert("Error", "Failed to create milestone. Please try again.");
    }
  };

  const handleDeleteMilestone = (milestone: Milestone) => {
    Alert.alert(
      "Delete Milestone",
      `Are you sure you want to delete "${milestone.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMilestone.mutateAsync(milestone.id);
            } catch (error) {
              Alert.alert("Error", "Failed to delete milestone.");
            }
          },
        },
      ]
    );
  };

  const getDaysUntil = (targetDate: string) => {
    const target = new Date(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDaysUntil = (days: number) => {
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    if (days === -1) return "Yesterday";
    if (days < 0) return `${Math.abs(days)} days overdue`;
    return `${days} days left`;
  };

  const renderMilestoneCard = ({ item }: { item: Milestone }) => {
    const daysUntil = getDaysUntil(item.target_date);
    const statusColor = MILESTONE_STATUS_COLORS[item.status];
    const statusIcon = getMilestoneStatusIcon(item.status);

    return (
      <Pressable
        className="mb-3 rounded-xl bg-muted p-4"
        onLongPress={() => handleDeleteMilestone(item)}
      >
        {/* Header */}
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <View className="flex-row items-center">
              <View
                className="mr-2 h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: statusColor + "20" }}
              >
                <FontAwesome name={statusIcon as any} size={14} color={statusColor} />
              </View>
              <Text className="flex-1 text-base font-semibold text-foreground" numberOfLines={1}>
                {item.name}
              </Text>
            </View>
            {item.description && (
              <Text className="mt-1 text-sm text-muted-foreground" numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
          <View
            className="rounded-full px-2 py-1"
            style={{ backgroundColor: statusColor + "20" }}
          >
            <Text className="text-xs font-medium" style={{ color: statusColor }}>
              {getMilestoneStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        {/* Progress */}
        {item.totalTasks !== undefined && item.totalTasks > 0 && (
          <View className="mt-3">
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="text-xs text-muted-foreground">Progress</Text>
              <Text className="text-xs font-medium text-foreground">
                {item.completedTasks}/{item.totalTasks} tasks
              </Text>
            </View>
            <ProgressBar progress={item.progress || 0} size="sm" color={statusColor} />
          </View>
        )}

        {/* Footer */}
        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <FontAwesome name="calendar" size={12} color="#9ca3af" />
            <Text className="ml-1.5 text-xs text-muted-foreground">
              {new Date(item.target_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </View>
          <Text
            className={`text-xs font-medium ${daysUntil < 0 ? "text-red-500" : daysUntil <= 3 ? "text-amber-500" : "text-muted-foreground"}`}
          >
            {formatDaysUntil(daysUntil)}
          </Text>
        </View>

        {/* Linked Tasks Preview */}
        {item.milestone_tasks && item.milestone_tasks.length > 0 && (
          <View className="mt-3 border-t border-gray-200 pt-3">
            <Text className="mb-2 text-xs font-medium text-muted-foreground">
              Linked Tasks
            </Text>
            {item.milestone_tasks.slice(0, 3).map((mt) => (
              <View key={mt.task.id} className="mb-1 flex-row items-center">
                <View
                  className="mr-2 h-2 w-2 rounded-full"
                  style={{ backgroundColor: TASK_STATUS_COLORS[mt.task.status] }}
                />
                <Text className="flex-1 text-xs text-foreground" numberOfLines={1}>
                  {mt.task.title}
                </Text>
              </View>
            ))}
            {item.milestone_tasks.length > 3 && (
              <Text className="text-xs text-muted-foreground">
                +{item.milestone_tasks.length - 3} more
              </Text>
            )}
          </View>
        )}
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Milestones",
          headerBackTitle: "Board",
          headerStyle: { backgroundColor: "#fafafa" },
          headerRight: () => (
            <Pressable
              className="mr-2 p-2"
              onPress={() => setShowCreateModal(true)}
            >
              <FontAwesome name="plus" size={18} color="#0ea5e9" />
            </Pressable>
          ),
        }}
      />

      {/* Stats */}
      <View className="flex-row border-b border-gray-100 px-4 py-3">
        {[
          { label: "Upcoming", value: stats.upcoming, color: MILESTONE_STATUS_COLORS.upcoming },
          { label: "At Risk", value: stats.at_risk, color: MILESTONE_STATUS_COLORS.at_risk },
          { label: "Completed", value: stats.completed, color: MILESTONE_STATUS_COLORS.completed },
          { label: "Missed", value: stats.missed, color: MILESTONE_STATUS_COLORS.missed },
        ].map(({ label, value, color }) => (
          <View key={label} className="flex-1 items-center">
            <Text className="text-xl font-bold" style={{ color }}>
              {value}
            </Text>
            <Text className="text-xs text-muted-foreground">{label}</Text>
          </View>
        ))}
      </View>

      {/* Milestones List */}
      <FlatList
        data={milestones}
        keyExtractor={(item) => item.id}
        className="flex-1 px-4 pt-3"
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        renderItem={renderMilestoneCard}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-12">
            <FontAwesome name="flag-o" size={48} color="#d1d5db" />
            <Text className="mt-4 text-lg font-medium text-foreground">
              No milestones yet
            </Text>
            <Text className="mt-1 text-center text-muted-foreground">
              Create a milestone to track project goals
            </Text>
            <Pressable
              className="mt-4 rounded-full bg-primary px-4 py-2 active:opacity-70"
              onPress={() => setShowCreateModal(true)}
            >
              <Text className="font-medium text-white">Create Milestone</Text>
            </Pressable>
          </View>
        }
      />

      {/* Create Milestone Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View className="flex-1 bg-background">
          <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3">
            <Pressable onPress={() => setShowCreateModal(false)}>
              <Text className="text-primary">Cancel</Text>
            </Pressable>
            <Text className="text-lg font-semibold text-foreground">New Milestone</Text>
            <Pressable
              onPress={handleCreateMilestone}
              disabled={createMilestone.isPending || !newName.trim()}
            >
              {createMilestone.isPending ? (
                <ActivityIndicator size="small" color="#0ea5e9" />
              ) : (
                <Text
                  className={`font-semibold ${newName.trim() ? "text-primary" : "text-gray-300"}`}
                >
                  Save
                </Text>
              )}
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Name */}
            <View className="mt-4">
              <Text className="mb-1.5 text-sm font-medium text-foreground">
                Name <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className="rounded-lg bg-muted px-4 py-3 text-foreground"
                placeholder="Enter milestone name"
                placeholderTextColor="#9ca3af"
                value={newName}
                onChangeText={setNewName}
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
                placeholder="Enter milestone description"
                placeholderTextColor="#9ca3af"
                value={newDescription}
                onChangeText={setNewDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{ minHeight: 80 }}
              />
            </View>

            {/* Target Date */}
            <View className="mt-4">
              <Text className="mb-1.5 text-sm font-medium text-foreground">
                Target Date <Text className="text-red-500">*</Text>
              </Text>
              <Pressable
                className="flex-row items-center rounded-lg bg-muted px-4 py-3"
                onPress={() => setShowDatePicker(true)}
              >
                <FontAwesome name="calendar-o" size={14} color="#6b7280" />
                <Text className="ml-2 flex-1 text-foreground">
                  {newTargetDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </Pressable>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={newTargetDate}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) setNewTargetDate(date);
                }}
              />
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
