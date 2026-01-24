import { useMemo, useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  ScrollView,
  ActionSheetIOS,
  Platform,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";

import { useProject, useTasks, useUpdateTask } from "../../../../lib/hooks/useProjects";
import {
  Task,
  TaskStatus,
  TASK_STATUS_ORDER,
  getTaskStatusLabel,
} from "../../../../lib/types/projects";
import { KanbanColumn } from "../../../../components/projects/KanbanColumn";
import { ProgressBar } from "../../../../components/projects/ProgressBar";
import { StatusBadge } from "../../../../components/projects/StatusBadge";
import { ProjectFABMenu } from "../../../../components/projects/FABMenu";
import { KanbanDragProvider, useKanbanDrag } from "../../../../lib/contexts/KanbanDragContext";
import { DragOverlay } from "../../../../components/projects/DragOverlay";

function ProjectKanbanContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  // Board height for constraining column heights
  const [boardHeight, setBoardHeight] = useState<number>(0);

  // Fetch project and tasks
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: tasksData, isLoading: tasksLoading } = useTasks(id);
  const tasks = tasksData?.tasks || [];

  // Mutations
  const updateTask = useUpdateTask(id);

  // Access drag context
  const { scrollEnabled, horizontalScrollOffset } = useKanbanDrag();

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };
    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  // Calculate column width - show ~1.3 columns on mobile for visual hint
  const columnWidth = useMemo(() => {
    const padding = 24; // total horizontal padding
    return Math.max((screenWidth - padding) * 0.7, 240);
  }, [screenWidth]);

  // Handlers
  const handleTaskPress = useCallback((task: Task) => {
    router.push({
      pathname: "/(main)/projects/(tabs)/(home)/tasks/[taskId]",
      params: { taskId: task.id, projectId: id },
    });
  }, [router, id]);

  const handleAddTask = () => {
    router.push({
      pathname: "/(main)/projects/(tabs)/(home)/tasks/new",
      params: { projectId: id, defaultStatus: "todo" },
    });
  };

  // Handle scroll to track offset for column hit detection
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    horizontalScrollOffset.value = event.nativeEvent.contentOffset.x;
  }, [horizontalScrollOffset]);

  const isLoading = projectLoading || tasksLoading;

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
        <FontAwesome name="folder-open-o" size={48} color="#d1d5db" />
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
          headerShown: false,
        }}
      />

      {/* Custom Back Button */}
      <SafeAreaView edges={['top']} className="bg-background">
        <View className="flex-row items-center px-4 py-2">
          <Pressable
            className="h-8 w-8 items-center justify-center rounded-full active:bg-muted"
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#0f172a" />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Project Header */}
      <View className="border-b border-gray-100 px-4 pb-4">
        <View className="flex-row items-center">
          <View
            className="mr-3 h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: project.color + "20" }}
          >
            <FontAwesome name="folder" size={22} color={project.color} />
          </View>
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground" numberOfLines={1}>
              {project.name}
            </Text>
            <View className="mt-0.5 flex-row items-center">
              <StatusBadge projectStatus={project.status} size="sm" />
              {project.target_end_date && (
                <Text className="ml-2 text-xs text-muted-foreground">
                  Due {new Date(project.target_end_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Progress */}
        {project.progress !== undefined && (
          <View className="mt-3">
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="text-xs text-muted-foreground">Progress</Text>
              <Text className="text-xs font-medium text-foreground">
                {project.completedTasks || 0}/{project.totalTasks || 0} tasks
              </Text>
            </View>
            <ProgressBar progress={project.progress} size="sm" color={project.color} />
          </View>
        )}

        {/* View Tabs */}
        <View className="mt-3 flex-row gap-2">
          <View className="flex-row rounded-lg bg-muted p-1">
            <View className="rounded-md bg-white px-3 py-1.5 shadow-sm">
              <Text className="text-xs font-medium text-foreground">Board</Text>
            </View>
            <Pressable
              className="px-3 py-1.5"
              onPress={() => router.push({
                pathname: "/(main)/projects/[id]/list",
                params: { id },
              })}
            >
              <Text className="text-xs font-medium text-muted-foreground">List</Text>
            </Pressable>
            <Pressable
              className="px-3 py-1.5"
              onPress={() => router.push({
                pathname: "/(main)/projects/[id]/calendar",
                params: { id },
              })}
            >
              <Text className="text-xs font-medium text-muted-foreground">Calendar</Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mt-3 flex-row gap-2">
          <Pressable
            className="flex-row items-center rounded-lg bg-muted px-3 py-2 active:opacity-70"
            onPress={() => router.push({
              pathname: "/(main)/projects/[id]/milestones",
              params: { id },
            })}
          >
            <FontAwesome name="flag" size={12} color="#6b7280" />
            <Text className="ml-1.5 text-xs font-medium text-muted-foreground">Milestones</Text>
          </Pressable>
          <Pressable
            className="flex-row items-center rounded-lg bg-muted px-3 py-2 active:opacity-70"
            onPress={() => router.push({
              pathname: "/(main)/projects/[id]/activity",
              params: { id },
            })}
          >
            <FontAwesome name="clock-o" size={12} color="#6b7280" />
            <Text className="ml-1.5 text-xs font-medium text-muted-foreground">Activity</Text>
          </Pressable>
          <Pressable
            className="flex-row items-center rounded-lg bg-muted px-3 py-2 active:opacity-70"
            onPress={() => router.push({
              pathname: "/(main)/projects/[id]/knowledge",
              params: { id },
            })}
          >
            <FontAwesome name="file-text-o" size={12} color="#6b7280" />
            <Text className="ml-1.5 text-xs font-medium text-muted-foreground">Knowledge</Text>
          </Pressable>
        </View>
      </View>

      {/* Kanban Board */}
      <View
        className="flex-1"
        onLayout={(e) => setBoardHeight(e.nativeEvent.layout.height)}
      >
        {boardHeight > 0 && tasks.length > 0 ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEnabled={scrollEnabled}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{
                paddingHorizontal: 12,
                paddingTop: 16,
                paddingBottom: 100,
              }}
            >
              {TASK_STATUS_ORDER.map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  title={getTaskStatusLabel(status)}
                  tasks={tasksByStatus[status]}
                  onTaskPress={handleTaskPress}
                  width={columnWidth}
                  height={boardHeight - 16}
                  scrollEnabled={scrollEnabled}
                />
              ))}
            </ScrollView>
            <DragOverlay cardWidth={columnWidth} />
          </>
        ) : tasks.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <FontAwesome name="tasks" size={48} color="#d1d5db" />
            <Text className="mt-4 text-lg font-medium text-foreground">
              No tasks yet
            </Text>
            <Text className="mt-1 text-center text-muted-foreground">
              Create your first task to get started
            </Text>
            <Pressable
              className="mt-4 flex-row items-center rounded-full bg-primary px-4 py-2 active:opacity-70"
              onPress={handleAddTask}
            >
              <FontAwesome name="plus" size={14} color="#ffffff" />
              <Text className="ml-2 font-medium text-white">Add Task</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* FAB Menu */}
      <ProjectFABMenu
        onCreateTask={handleAddTask}
        onOpenSettings={() => router.push({
          pathname: "/(main)/projects/[id]/settings",
          params: { id },
        })}
      />
    </View>
  );
}

export default function ProjectKanbanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const updateTask = useUpdateTask(id);

  // Handler for moving tasks (from drag-drop)
  const handleTaskMoved = useCallback((task: Task, newStatus: TaskStatus) => {
    updateTask.mutate({
      taskId: task.id,
      data: { status: newStatus },
    });
  }, [updateTask]);

  // Handler for showing action sheet (from long-press without drag)
  const handleActionSheetRequested = useCallback((task: Task) => {
    // Get available statuses (exclude current status)
    const availableStatuses = TASK_STATUS_ORDER.filter(s => s !== task.status);
    const options = [
      ...availableStatuses.map(s => `Move to ${getTaskStatusLabel(s)}`),
      "Cancel",
    ];
    const cancelButtonIndex = options.length - 1;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: task.title,
          message: "Move task to another column",
        },
        (buttonIndex) => {
          if (buttonIndex !== cancelButtonIndex) {
            const newStatus = availableStatuses[buttonIndex];
            updateTask.mutate({
              taskId: task.id,
              data: { status: newStatus },
            });
          }
        }
      );
    } else {
      // Android fallback using Alert
      Alert.alert(
        task.title,
        "Move task to another column",
        [
          ...availableStatuses.map((status) => ({
            text: `Move to ${getTaskStatusLabel(status)}`,
            onPress: () => {
              updateTask.mutate({
                taskId: task.id,
                data: { status },
              });
            },
          })),
          { text: "Cancel", style: "cancel" as const },
        ]
      );
    }
  }, [updateTask]);

  return (
    <KanbanDragProvider
      onTaskMoved={handleTaskMoved}
      onActionSheetRequested={handleActionSheetRequested}
    >
      <ProjectKanbanContent />
    </KanbanDragProvider>
  );
}
