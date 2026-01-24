import { useState, useEffect } from "react";
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

import {
  useProject,
  useUpdateProject,
  useDeleteProject,
  useProjectMembers,
  useRemoveProjectMember,
  useProjectLabels,
  useCreateProjectLabel,
  useDeleteProjectLabel,
} from "../../../../lib/hooks/useProjects";
import {
  ProjectStatus,
  ProjectPriority,
  PROJECT_COLORS,
  PROJECT_STATUS_COLORS,
  getProjectStatusLabel,
  getProjectPriorityLabel,
  getMemberRoleLabel,
  LABEL_COLORS,
} from "../../../../lib/types/projects";

const STATUS_OPTIONS: ProjectStatus[] = ["active", "on_hold", "completed", "archived"];
const PRIORITY_OPTIONS: ProjectPriority[] = ["low", "medium", "high", "critical"];

export default function ProjectSettingsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Fetch project, members, and labels
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: membersData, isLoading: membersLoading } = useProjectMembers(id);
  const members = membersData?.members || [];
  const { data: labelsData, isLoading: labelsLoading } = useProjectLabels(id);
  const labels = labelsData?.labels || [];

  // Mutations
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const removeMember = useRemoveProjectMember(id);
  const createLabel = useCreateProjectLabel(id);
  const deleteLabel = useDeleteProjectLabel(id);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [priority, setPriority] = useState<ProjectPriority>("medium");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [targetEndDate, setTargetEndDate] = useState<Date | null>(null);
  const [budget, setBudget] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showAddLabel, setShowAddLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);

  // Populate form when project loads
  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || "");
      setStatus(project.status);
      setPriority(project.priority);
      setColor(project.color);
      setStartDate(project.start_date ? new Date(project.start_date) : null);
      setTargetEndDate(project.target_end_date ? new Date(project.target_end_date) : null);
      setBudget(project.budget?.toString() || "");
    }
  }, [project]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Project name is required");
      return;
    }

    try {
      await updateProject.mutateAsync({
        id,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          color,
          start_date: startDate?.toISOString().split("T")[0],
          target_end_date: targetEndDate?.toISOString().split("T")[0],
          budget: budget ? parseFloat(budget) : undefined,
        },
      });

      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to update project. Please try again.");
    }
  };

  const handleArchive = () => {
    Alert.alert(
      "Archive Project",
      `Are you sure you want to archive "${project?.name}"? You can restore it later.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          onPress: async () => {
            try {
              await updateProject.mutateAsync({
                id,
                data: { status: "archived" },
              });
              router.replace("/(main)/projects/(tabs)/(home)");
            } catch (error) {
              Alert.alert("Error", "Failed to archive project.");
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Project",
      `Are you sure you want to permanently delete "${project?.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProject.mutateAsync(id);
              router.replace("/(main)/projects/(tabs)/(home)");
            } catch (error) {
              Alert.alert("Error", "Failed to delete project.");
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${memberName} from this project?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeMember.mutateAsync(memberId);
            } catch (error) {
              Alert.alert("Error", "Failed to remove member.");
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Select date";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleAddLabel = async () => {
    if (!newLabelName.trim()) {
      Alert.alert("Error", "Label name is required");
      return;
    }

    try {
      await createLabel.mutateAsync({
        name: newLabelName.trim(),
        color: newLabelColor,
      });
      setNewLabelName("");
      setNewLabelColor(LABEL_COLORS[0]);
      setShowAddLabel(false);
    } catch (error) {
      Alert.alert("Error", "Failed to create label. Please try again.");
    }
  };

  const handleDeleteLabel = (labelId: string, labelName: string) => {
    Alert.alert(
      "Delete Label",
      `Are you sure you want to delete "${labelName}"? It will be removed from all tasks.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteLabel.mutateAsync(labelId);
            } catch (error) {
              Alert.alert("Error", "Failed to delete label.");
            }
          },
        },
      ]
    );
  };

  const isLoading = projectLoading || membersLoading || labelsLoading;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (!project) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <FontAwesome name="exclamation-circle" size={48} color="#d1d5db" />
        <Text className="mt-4 text-lg font-medium text-foreground">
          Project not found
        </Text>
        <Pressable
          className="mt-4 rounded-full bg-primary px-4 py-2 active:opacity-70"
          onPress={() => router.back()}
        >
          <Text className="font-medium text-white">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Project Settings",
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: "#fafafa" },
          headerRight: () => (
            <Pressable
              onPress={handleSave}
              disabled={updateProject.isPending || !name.trim()}
              className="mr-2"
            >
              {updateProject.isPending ? (
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
        {/* General Settings Section */}
        <Text className="mb-3 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          General Settings
        </Text>

        {/* Name */}
        <View className="mb-4">
          <Text className="mb-1.5 text-sm font-medium text-foreground">
            Project Name <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            className="rounded-lg bg-muted px-4 py-3 text-foreground"
            placeholder="Enter project name"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Description */}
        <View className="mb-4">
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

        {/* Color */}
        <View className="mb-4">
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
        <View className="mb-4">
          <Text className="mb-1.5 text-sm font-medium text-foreground">Status</Text>
          <View className="flex-row flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => {
              const isSelected = status === s;
              const statusColor = PROJECT_STATUS_COLORS[s];
              return (
                <Pressable
                  key={s}
                  className={`rounded-full px-4 py-2 ${isSelected ? "" : "bg-muted"}`}
                  style={isSelected ? { backgroundColor: statusColor } : undefined}
                  onPress={() => setStatus(s)}
                >
                  <Text
                    className={`text-sm font-medium ${isSelected ? "text-white" : "text-muted-foreground"}`}
                  >
                    {getProjectStatusLabel(s)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Priority */}
        <View className="mb-4">
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

        {/* Timeline Section */}
        <Text className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Timeline & Budget
        </Text>

        {/* Dates */}
        <View className="mb-4 flex-row gap-4">
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

        {/* Budget */}
        <View className="mb-4">
          <Text className="mb-1.5 text-sm font-medium text-foreground">
            Budget
          </Text>
          <View className="flex-row items-center rounded-lg bg-muted px-4 py-3">
            <Text className="text-muted-foreground">$</Text>
            <TextInput
              className="ml-1 flex-1 text-foreground"
              placeholder="0.00"
              placeholderTextColor="#9ca3af"
              value={budget}
              onChangeText={setBudget}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Team Members Section */}
        <Text className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Team Members ({members.length})
        </Text>

        <View className="rounded-lg bg-muted">
          {members.length === 0 ? (
            <View className="items-center py-8">
              <FontAwesome name="users" size={32} color="#d1d5db" />
              <Text className="mt-2 text-muted-foreground">No team members</Text>
            </View>
          ) : (
            members.map((member, index) => (
              <View
                key={member.id}
                className={`flex-row items-center p-4 ${index > 0 ? "border-t border-gray-200" : ""}`}
              >
                <View className="h-10 w-10 rounded-full bg-gray-300 items-center justify-center">
                  <Text className="font-medium text-gray-600">
                    {member.user.name?.charAt(0)?.toUpperCase() || "?"}
                  </Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-medium text-foreground">
                    {member.user.name || "Unknown"}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {getMemberRoleLabel(member.role)}
                  </Text>
                </View>
                {member.role !== "owner" && (
                  <Pressable
                    className="p-2"
                    onPress={() => handleRemoveMember(member.id, member.user.name || "this member")}
                  >
                    <FontAwesome name="times" size={16} color="#9ca3af" />
                  </Pressable>
                )}
              </View>
            ))
          )}
        </View>

        {/* Labels Section */}
        <View className="mt-6 flex-row items-center justify-between">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Labels ({labels.length})
          </Text>
          {!showAddLabel && (
            <Pressable
              className="flex-row items-center"
              onPress={() => setShowAddLabel(true)}
            >
              <FontAwesome name="plus" size={12} color="#0ea5e9" />
              <Text className="ml-1 text-sm font-medium text-primary">Add</Text>
            </Pressable>
          )}
        </View>

        {/* Add Label Form */}
        {showAddLabel && (
          <View className="mt-3 rounded-lg bg-muted p-4">
            <View className="mb-3">
              <Text className="mb-1.5 text-sm font-medium text-foreground">
                Label Name
              </Text>
              <TextInput
                className="rounded-lg bg-white px-4 py-2 text-foreground"
                placeholder="e.g., Bug, Feature, Urgent"
                placeholderTextColor="#9ca3af"
                value={newLabelName}
                onChangeText={setNewLabelName}
                autoFocus
              />
            </View>
            <View className="mb-3">
              <Text className="mb-1.5 text-sm font-medium text-foreground">
                Color
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {LABEL_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    className={`h-8 w-8 items-center justify-center rounded-full ${newLabelColor === c ? "border-2" : ""}`}
                    style={{
                      backgroundColor: c,
                      borderColor: newLabelColor === c ? "#0a0a0a" : "transparent",
                    }}
                    onPress={() => setNewLabelColor(c)}
                  >
                    {newLabelColor === c && (
                      <FontAwesome name="check" size={12} color="white" />
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
            <View className="flex-row gap-2">
              <Pressable
                className="flex-1 rounded-lg bg-primary py-2 active:opacity-70"
                onPress={handleAddLabel}
                disabled={createLabel.isPending || !newLabelName.trim()}
              >
                {createLabel.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-center font-medium text-white">Create Label</Text>
                )}
              </Pressable>
              <Pressable
                className="rounded-lg bg-gray-200 px-4 py-2 active:opacity-70"
                onPress={() => {
                  setShowAddLabel(false);
                  setNewLabelName("");
                  setNewLabelColor(LABEL_COLORS[0]);
                }}
              >
                <Text className="font-medium text-muted-foreground">Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Labels List */}
        <View className="mt-3 rounded-lg bg-muted">
          {labels.length === 0 && !showAddLabel ? (
            <View className="items-center py-8">
              <FontAwesome name="tags" size={32} color="#d1d5db" />
              <Text className="mt-2 text-muted-foreground">No labels yet</Text>
              <Pressable
                className="mt-2 flex-row items-center"
                onPress={() => setShowAddLabel(true)}
              >
                <FontAwesome name="plus" size={12} color="#0ea5e9" />
                <Text className="ml-1 text-sm font-medium text-primary">Create a label</Text>
              </Pressable>
            </View>
          ) : labels.length > 0 ? (
            labels.map((label, index) => (
              <View
                key={label.id}
                className={`flex-row items-center p-3 ${index > 0 ? "border-t border-gray-200" : ""}`}
              >
                <View
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                <Text className="ml-3 flex-1 font-medium text-foreground">
                  {label.name}
                </Text>
                <Pressable
                  className="p-2"
                  onPress={() => handleDeleteLabel(label.id, label.name)}
                >
                  <FontAwesome name="trash-o" size={14} color="#9ca3af" />
                </Pressable>
              </View>
            ))
          ) : null}
        </View>

        {/* Danger Zone */}
        <Text className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-red-500">
          Danger Zone
        </Text>

        <View className="rounded-lg border border-red-200 bg-red-50 p-4">
          {status !== "archived" && (
            <Pressable
              className="mb-3 flex-row items-center justify-between rounded-lg bg-white p-3"
              onPress={handleArchive}
            >
              <View className="flex-row items-center">
                <FontAwesome name="archive" size={16} color="#f59e0b" />
                <Text className="ml-3 font-medium text-foreground">Archive Project</Text>
              </View>
              <FontAwesome name="chevron-right" size={12} color="#9ca3af" />
            </Pressable>
          )}

          <Pressable
            className="flex-row items-center justify-between rounded-lg bg-white p-3"
            onPress={handleDelete}
          >
            <View className="flex-row items-center">
              <FontAwesome name="trash" size={16} color="#ef4444" />
              <Text className="ml-3 font-medium text-red-500">Delete Project</Text>
            </View>
            <FontAwesome name="chevron-right" size={12} color="#9ca3af" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
