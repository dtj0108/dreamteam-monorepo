import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

import {
  useTask,
  useUpdateTask,
  useDeleteTask,
  useProjectMembers,
  useTaskComments,
  useCreateTaskComment,
  useDeleteTaskComment,
  useCreateTask,
  useProjectLabels,
  useAddTaskLabel,
  useRemoveTaskLabel,
} from "../../../../../../lib/hooks/useProjects";
import { useAuth } from "../../../../../../providers/auth-provider";
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

export default function TaskDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { taskId, projectId } = useLocalSearchParams<{
    taskId: string;
    projectId: string;
  }>();

  // Fetch task data
  const { data: task, isLoading: taskLoading } = useTask(projectId, taskId);
  const { data: membersData } = useProjectMembers(projectId);
  const members = membersData?.members || [];

  // Comments
  const { data: commentsData, isLoading: commentsLoading } = useTaskComments(taskId);
  const comments = commentsData?.comments || [];
  const createComment = useCreateTaskComment(taskId);
  const deleteComment = useDeleteTaskComment(taskId);

  // Labels
  const { data: labelsData } = useProjectLabels(projectId);
  const projectLabels = labelsData?.labels || [];
  const addLabel = useAddTaskLabel(projectId);
  const removeLabel = useRemoveTaskLabel(projectId);

  // Mutations
  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);
  const createSubtask = useCreateTask(projectId);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [estimatedHours, setEstimatedHours] = useState("");
  const [actualHours, setActualHours] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [showAddSubtask, setShowAddSubtask] = useState(false);

  // Populate form when task loads
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.due_date ? new Date(task.due_date) : null);
      setEstimatedHours(task.estimated_hours?.toString() || "");
      setActualHours(task.actual_hours?.toString() || "");
      setSelectedAssignees(task.task_assignees?.map((a) => a.user_id) || []);
    }
  }, [task]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Task title is required");
      return;
    }

    try {
      await updateTask.mutateAsync({
        taskId,
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          due_date: dueDate?.toISOString().split("T")[0] || undefined,
          estimated_hours: estimatedHours ? parseFloat(estimatedHours) : undefined,
          actual_hours: actualHours ? parseFloat(actualHours) : undefined,
          assignees: selectedAssignees,
        },
      });

      setHasChanges(false);
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to update task. Please try again.");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Task",
      `Are you sure you want to delete "${task?.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTask.mutateAsync(taskId);
              router.back();
            } catch (error) {
              Alert.alert("Error", "Failed to delete task. Please try again.");
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

  const toggleAssignee = (userId: string) => {
    setHasChanges(true);
    setSelectedAssignees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const markFieldChanged = () => {
    setHasChanges(true);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await createComment.mutateAsync({ content: newComment.trim() });
      setNewComment("");
    } catch (error) {
      Alert.alert("Error", "Failed to add comment. Please try again.");
    }
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteComment.mutateAsync(commentId);
            } catch (error) {
              Alert.alert("Error", "Failed to delete comment. Please try again.");
            }
          },
        },
      ]
    );
  };

  const formatCommentTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    try {
      await createSubtask.mutateAsync({
        title: newSubtaskTitle.trim(),
        status: "todo",
        parent_id: taskId,
      });
      setNewSubtaskTitle("");
      setShowAddSubtask(false);
    } catch (error) {
      Alert.alert("Error", "Failed to add subtask. Please try again.");
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentStatus: TaskStatus) => {
    try {
      await updateTask.mutateAsync({
        taskId: subtaskId,
        data: {
          status: currentStatus === "done" ? "todo" : "done",
        },
      });
    } catch (error) {
      Alert.alert("Error", "Failed to update subtask. Please try again.");
    }
  };

  const handleDeleteSubtask = (subtaskId: string, subtaskTitle: string) => {
    Alert.alert(
      "Delete Subtask",
      `Are you sure you want to delete "${subtaskTitle}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTask.mutateAsync(subtaskId);
            } catch (error) {
              Alert.alert("Error", "Failed to delete subtask. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleToggleLabel = async (labelId: string) => {
    const isAttached = task?.task_labels?.some(tl => tl.label_id === labelId);
    try {
      if (isAttached) {
        await removeLabel.mutateAsync({ taskId, labelId });
      } else {
        await addLabel.mutateAsync({ taskId, labelId });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update label. Please try again.");
    }
  };

  if (taskLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (!task) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <FontAwesome name="exclamation-circle" size={48} color="#d1d5db" />
        <Text className="mt-4 text-lg font-medium text-foreground">
          Task not found
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
          headerTitle: "Task Details",
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: "#fafafa" },
          headerRight: () => (
            <View className="flex-row items-center">
              <Pressable onPress={handleDelete} className="mr-4">
                <FontAwesome name="trash-o" size={20} color="#ef4444" />
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={updateTask.isPending || !title.trim()}
              >
                {updateTask.isPending ? (
                  <ActivityIndicator size="small" color="#0ea5e9" />
                ) : (
                  <Text
                    className={`font-semibold ${title.trim() ? "text-primary" : "text-gray-300"}`}
                  >
                    Save
                  </Text>
                )}
              </Pressable>
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
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
              onChangeText={(text) => {
                setTitle(text);
                markFieldChanged();
              }}
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
              onChangeText={(text) => {
                setDescription(text);
                markFieldChanged();
              }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 100 }}
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
                    onPress={() => {
                      setStatus(s);
                      markFieldChanged();
                    }}
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
                    onPress={() => {
                      setPriority(p);
                      markFieldChanged();
                    }}
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

          {/* Due Date */}
          <View className="mt-4">
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
                <Pressable
                  onPress={() => {
                    setDueDate(null);
                    markFieldChanged();
                  }}
                >
                  <FontAwesome name="times-circle" size={14} color="#9ca3af" />
                </Pressable>
              )}
            </Pressable>
          </View>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={dueDate || new Date()}
              mode="date"
              display="spinner"
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) {
                  setDueDate(date);
                  markFieldChanged();
                }
              }}
            />
          )}

          {/* Hours Row */}
          <View className="mt-4 flex-row gap-4">
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
                onChangeText={(text) => {
                  setEstimatedHours(text);
                  markFieldChanged();
                }}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Actual Hours */}
            <View className="flex-1">
              <Text className="mb-1.5 text-sm font-medium text-foreground">
                Actual Hours
              </Text>
              <TextInput
                className="rounded-lg bg-muted px-4 py-3 text-foreground"
                placeholder="0"
                placeholderTextColor="#9ca3af"
                value={actualHours}
                onChangeText={(text) => {
                  setActualHours(text);
                  markFieldChanged();
                }}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

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
                      <View className="h-6 w-6 rounded-full bg-gray-300 items-center justify-center mr-2">
                        <Text className="text-xs font-medium text-gray-600">
                          {member.user.name?.charAt(0)?.toUpperCase() || "?"}
                        </Text>
                      </View>
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

          {/* Labels */}
          {projectLabels.length > 0 && (
            <View className="mt-4">
              <Text className="mb-1.5 text-sm font-medium text-foreground">
                Labels
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {projectLabels.map((label) => {
                  const isAttached = task.task_labels?.some(tl => tl.label_id === label.id);
                  return (
                    <Pressable
                      key={label.id}
                      className={`flex-row items-center rounded-full px-3 py-2 ${isAttached ? "" : "bg-muted"}`}
                      style={isAttached ? { backgroundColor: label.color } : undefined}
                      onPress={() => handleToggleLabel(label.id)}
                      disabled={addLabel.isPending || removeLabel.isPending}
                    >
                      {!isAttached && (
                        <View
                          className="mr-1.5 h-3 w-3 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                      )}
                      <Text
                        className={`text-sm font-medium ${isAttached ? "text-white" : "text-muted-foreground"}`}
                      >
                        {label.name}
                      </Text>
                      {isAttached && (
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

          {/* Subtasks Section */}
          <View className="mt-6">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-sm font-medium text-foreground">
                Subtasks{" "}
                {task.subtasks && task.subtasks.length > 0 && (
                  `(${task.subtasks.filter((s) => s.status === "done").length}/${task.subtasks.length})`
                )}
              </Text>
              {!showAddSubtask && (
                <Pressable
                  className="flex-row items-center"
                  onPress={() => setShowAddSubtask(true)}
                >
                  <FontAwesome name="plus" size={12} color="#0ea5e9" />
                  <Text className="ml-1 text-sm font-medium text-primary">Add</Text>
                </Pressable>
              )}
            </View>

            {/* Subtask Progress Bar */}
            {task.subtasks && task.subtasks.length > 0 && (
              <View className="mb-3">
                <View className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <View
                    className="h-full rounded-full bg-emerald-500"
                    style={{
                      width: `${(task.subtasks.filter((s) => s.status === "done").length / task.subtasks.length) * 100}%`,
                    }}
                  />
                </View>
              </View>
            )}

            {/* Add Subtask Input */}
            {showAddSubtask && (
              <View className="mb-3 flex-row items-center rounded-lg bg-muted p-3">
                <FontAwesome name="square-o" size={18} color="#9ca3af" />
                <TextInput
                  className="ml-3 flex-1 text-foreground"
                  placeholder="Add a subtask..."
                  placeholderTextColor="#9ca3af"
                  value={newSubtaskTitle}
                  onChangeText={setNewSubtaskTitle}
                  autoFocus
                  onSubmitEditing={handleAddSubtask}
                  returnKeyType="done"
                />
                <View className="flex-row items-center gap-2">
                  <Pressable
                    className="rounded-lg bg-primary px-3 py-1.5 active:opacity-70"
                    onPress={handleAddSubtask}
                    disabled={createSubtask.isPending || !newSubtaskTitle.trim()}
                  >
                    {createSubtask.isPending ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="text-sm font-medium text-white">Add</Text>
                    )}
                  </Pressable>
                  <Pressable
                    className="rounded-lg bg-gray-200 px-3 py-1.5 active:opacity-70"
                    onPress={() => {
                      setShowAddSubtask(false);
                      setNewSubtaskTitle("");
                    }}
                  >
                    <Text className="text-sm font-medium text-muted-foreground">Cancel</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Subtasks List */}
            {task.subtasks && task.subtasks.length > 0 ? (
              <View className="rounded-lg bg-muted">
                {task.subtasks.map((subtask, index) => (
                  <View
                    key={subtask.id}
                    className={`flex-row items-center p-3 ${index > 0 ? "border-t border-gray-200" : ""}`}
                  >
                    <Pressable
                      onPress={() => handleToggleSubtask(subtask.id, subtask.status)}
                      className="p-1"
                    >
                      <FontAwesome
                        name={subtask.status === "done" ? "check-square" : "square-o"}
                        size={18}
                        color={subtask.status === "done" ? "#10b981" : "#9ca3af"}
                      />
                    </Pressable>
                    <Text
                      className={`ml-2 flex-1 ${subtask.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}
                    >
                      {subtask.title}
                    </Text>
                    <Pressable
                      onPress={() => handleDeleteSubtask(subtask.id, subtask.title)}
                      className="p-1"
                    >
                      <FontAwesome name="trash-o" size={14} color="#9ca3af" />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : !showAddSubtask ? (
              <View className="items-center rounded-lg bg-muted py-6">
                <FontAwesome name="list-ul" size={24} color="#d1d5db" />
                <Text className="mt-2 text-sm text-muted-foreground">
                  No subtasks yet
                </Text>
                <Pressable
                  className="mt-2 flex-row items-center"
                  onPress={() => setShowAddSubtask(true)}
                >
                  <FontAwesome name="plus" size={12} color="#0ea5e9" />
                  <Text className="ml-1 text-sm font-medium text-primary">Add a subtask</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* Comments Section */}
          <View className="mt-6">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-sm font-medium text-foreground">
                Comments {comments.length > 0 && `(${comments.length})`}
              </Text>
            </View>

            {/* Comment Input */}
            <View className="mb-4 flex-row items-start gap-2">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-primary">
                <Text className="text-xs font-medium text-white">
                  {user?.email?.charAt(0)?.toUpperCase() || "?"}
                </Text>
              </View>
              <View className="flex-1">
                <TextInput
                  className="min-h-[40px] rounded-lg bg-muted px-3 py-2 text-foreground"
                  placeholder="Add a comment..."
                  placeholderTextColor="#9ca3af"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                />
                {newComment.trim() && (
                  <Pressable
                    className="mt-2 self-end rounded-lg bg-primary px-4 py-2 active:opacity-70"
                    onPress={handleAddComment}
                    disabled={createComment.isPending}
                  >
                    {createComment.isPending ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="text-sm font-medium text-white">Send</Text>
                    )}
                  </Pressable>
                )}
              </View>
            </View>

            {/* Comment List */}
            {commentsLoading ? (
              <View className="items-center py-4">
                <ActivityIndicator size="small" color="#0ea5e9" />
              </View>
            ) : comments.length === 0 ? (
              <View className="items-center rounded-lg bg-muted py-6">
                <FontAwesome name="comment-o" size={24} color="#d1d5db" />
                <Text className="mt-2 text-sm text-muted-foreground">
                  No comments yet
                </Text>
              </View>
            ) : (
              <View className="rounded-lg bg-muted">
                {comments.map((comment, index) => {
                  const isOwnComment = comment.user_id === user?.id;
                  return (
                    <View
                      key={comment.id}
                      className={`p-3 ${index > 0 ? "border-t border-gray-200" : ""}`}
                    >
                      <View className="flex-row items-start">
                        <View className="h-8 w-8 items-center justify-center rounded-full bg-gray-300">
                          <Text className="text-xs font-medium text-gray-600">
                            {comment.user?.name?.charAt(0)?.toUpperCase() || "?"}
                          </Text>
                        </View>
                        <View className="ml-2 flex-1">
                          <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                              <Text className="text-sm font-medium text-foreground">
                                {comment.user?.name || "Unknown"}
                              </Text>
                              <Text className="ml-2 text-xs text-muted-foreground">
                                {formatCommentTime(comment.created_at)}
                              </Text>
                            </View>
                            {isOwnComment && (
                              <Pressable
                                onPress={() => handleDeleteComment(comment.id)}
                                className="p-1"
                                disabled={deleteComment.isPending}
                              >
                                <FontAwesome name="trash-o" size={14} color="#9ca3af" />
                              </Pressable>
                            )}
                          </View>
                          <Text className="mt-1 text-sm text-foreground">
                            {comment.content}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Metadata */}
          <View className="mt-6 rounded-lg bg-muted p-4">
            <Text className="text-xs text-muted-foreground">
              Created {new Date(task.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
            {task.updated_at !== task.created_at && (
              <Text className="mt-1 text-xs text-muted-foreground">
                Last updated {new Date(task.updated_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
