import { useState, useMemo } from "react";
import {
  View,
  Text,
  SectionList,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useMyTasks, useAllTasks } from "../../../../lib/hooks/useProjects";
import { Task, TaskStatus, TASK_STATUS_COLORS } from "../../../../lib/types/projects";
import { TaskCard } from "../../../../components/projects/TaskCard";
import { StatsCard } from "../../../../components/projects/StatsCard";

const STATUS_FILTERS: { label: string; value: TaskStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "To Do", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Review", value: "review" },
  { label: "Done", value: "done" },
];

type ViewMode = "mine" | "all";

// Helper to group tasks by due date
function groupTasksByDueDate(tasks: Task[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));

  const groups: { title: string; data: Task[]; isOverdue?: boolean }[] = [
    { title: "Overdue", data: [], isOverdue: true },
    { title: "Today", data: [] },
    { title: "Tomorrow", data: [] },
    { title: "This Week", data: [] },
    { title: "Later", data: [] },
    { title: "No Due Date", data: [] },
  ];

  tasks.forEach((task) => {
    if (!task.due_date) {
      groups[5].data.push(task);
      return;
    }

    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate < today && task.status !== "done") {
      groups[0].data.push(task); // Overdue
    } else if (dueDate.getTime() === today.getTime()) {
      groups[1].data.push(task); // Today
    } else if (dueDate.getTime() === tomorrow.getTime()) {
      groups[2].data.push(task); // Tomorrow
    } else if (dueDate <= endOfWeek) {
      groups[3].data.push(task); // This Week
    } else {
      groups[4].data.push(task); // Later
    }
  });

  // Filter out empty groups
  return groups.filter((g) => g.data.length > 0);
}

export default function MyTasksScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("mine");

  // Fetch data with status filter
  const queryParams = statusFilter !== "all" ? { status: statusFilter } : undefined;
  const myTasksQuery = useMyTasks(queryParams);
  const allTasksQuery = useAllTasks(queryParams);

  // Select the appropriate query based on view mode
  const { data: tasksData, isLoading, refetch } = viewMode === "mine" ? myTasksQuery : allTasksQuery;
  const tasks = tasksData?.tasks || [];

  // Filter tasks by search query and hide completed
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Filter by hideCompleted
    if (hideCompleted) {
      filtered = filtered.filter((task) => task.status !== "done");
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.project?.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [tasks, searchQuery, hideCompleted]);

  // Group tasks by due date
  const groupedTasks = useMemo(() => {
    return groupTasksByDueDate(filteredTasks);
  }, [filteredTasks]);

  // Calculate stats (from all tasks for current view mode, not filtered)
  const myStatsQuery = useMyTasks();
  const allStatsQuery = useAllTasks();
  const statsData = viewMode === "mine" ? myStatsQuery.data : allStatsQuery.data;
  const allTasks = statsData?.tasks || [];

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todo = allTasks.filter((t) => t.status === "todo").length;
    const inProgress = allTasks.filter((t) => t.status === "in_progress").length;
    const review = allTasks.filter((t) => t.status === "review").length;
    const done = allTasks.filter((t) => t.status === "done").length;
    const overdue = allTasks.filter((t) => {
      if (!t.due_date || t.status === "done") return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    }).length;

    return { todo, inProgress, review, done, overdue };
  }, [allTasks]);

  // Handlers
  const handleTaskPress = (task: Task) => {
    if (task.project?.id) {
      router.push(`/(main)/projects/${task.project.id}` as any);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="px-4 py-4">
        <Text className="text-2xl font-bold text-foreground">
          {viewMode === "mine" ? "My Tasks" : "All Tasks"}
        </Text>
        <Text className="text-sm text-muted-foreground">
          {viewMode === "mine" ? "Tasks assigned to you" : "All tasks across projects"}
        </Text>
      </View>

      {/* View Mode Toggle */}
      <View className="flex-row gap-2 px-4 pb-2">
        <Pressable
          className={`flex-1 items-center rounded-lg py-2 ${
            viewMode === "mine" ? "bg-primary" : "bg-muted"
          }`}
          onPress={() => setViewMode("mine")}
        >
          <Text
            className={`text-sm font-medium ${
              viewMode === "mine" ? "text-white" : "text-muted-foreground"
            }`}
          >
            My Tasks
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 items-center rounded-lg py-2 ${
            viewMode === "all" ? "bg-primary" : "bg-muted"
          }`}
          onPress={() => setViewMode("all")}
        >
          <Text
            className={`text-sm font-medium ${
              viewMode === "all" ? "text-white" : "text-muted-foreground"
            }`}
          >
            All Tasks
          </Text>
        </Pressable>
      </View>

      {/* Stats */}
      <View className="flex-row gap-2 px-4 py-2">
        <StatsCard
          label="To Do"
          value={stats.todo}
          icon="circle-o"
          iconColor={TASK_STATUS_COLORS.todo}
        />
        <StatsCard
          label="In Progress"
          value={stats.inProgress}
          icon="spinner"
          iconColor={TASK_STATUS_COLORS.in_progress}
        />
        <StatsCard
          label="Review"
          value={stats.review}
          icon="eye"
          iconColor={TASK_STATUS_COLORS.review}
        />
        <StatsCard
          label="Overdue"
          value={stats.overdue}
          icon="exclamation-circle"
          iconColor="#ef4444"
        />
      </View>

      {/* Search */}
      <View className="px-4 py-2">
        <View className="flex-row items-center rounded-lg bg-muted px-3 py-2">
          <FontAwesome name="search" size={14} color="#9ca3af" />
          <TextInput
            className="ml-2 flex-1 text-foreground"
            placeholder="Search tasks..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <FontAwesome name="times-circle" size={14} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Status Filter Tabs + Hide Completed Toggle */}
      <View className="flex-row items-center justify-between px-4 py-2">
        <View className="flex-row gap-2">
          {STATUS_FILTERS.map((filter) => {
            const isActive = statusFilter === filter.value;
            const color =
              filter.value !== "all"
                ? TASK_STATUS_COLORS[filter.value as TaskStatus]
                : "#6b7280";

            return (
              <Pressable
                key={filter.value}
                className={`rounded-full px-3 py-1.5 ${isActive ? "" : "bg-muted"}`}
                style={isActive ? { backgroundColor: color + "20" } : undefined}
                onPress={() => setStatusFilter(filter.value)}
              >
                <Text
                  className={`text-xs font-medium ${isActive ? "" : "text-muted-foreground"}`}
                  style={isActive ? { color } : undefined}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          className="flex-row items-center gap-2"
          onPress={() => setHideCompleted(!hideCompleted)}
        >
          <Text className="text-xs text-muted-foreground">Hide done</Text>
          <Switch
            value={hideCompleted}
            onValueChange={setHideCompleted}
            trackColor={{ false: "#e5e5e5", true: "#0ea5e9" }}
            thumbColor="#ffffff"
            style={{ transform: [{ scale: 0.7 }] }}
          />
        </Pressable>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : groupedTasks.length === 0 ? (
        <View className="flex-1 items-center justify-center py-12">
          <FontAwesome name="check-square-o" size={48} color="#d1d5db" />
          <Text className="mt-4 text-lg font-medium text-foreground">
            {searchQuery
              ? "No tasks found"
              : viewMode === "mine"
              ? "No tasks assigned"
              : "No tasks yet"}
          </Text>
          <Text className="mt-1 text-center text-muted-foreground">
            {searchQuery
              ? "Try a different search term"
              : viewMode === "mine"
              ? "Tasks assigned to you will\nappear here"
              : "Create tasks in your projects\nto see them here"}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={groupedTasks}
          keyExtractor={(item) => item.id}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} />
          }
          renderSectionHeader={({ section }) => (
            <View className="flex-row items-center py-2">
              <Text
                className={`font-semibold ${section.isOverdue ? "text-red-500" : "text-foreground"}`}
              >
                {section.title}
              </Text>
              <View
                className="ml-2 rounded-full px-2 py-0.5"
                style={{
                  backgroundColor: section.isOverdue ? "#ef444420" : "#f5f5f5",
                }}
              >
                <Text
                  className={`text-xs font-medium ${section.isOverdue ? "text-red-500" : "text-muted-foreground"}`}
                >
                  {section.data.length}
                </Text>
              </View>
            </View>
          )}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onPress={() => handleTaskPress(item)}
              showProject
            />
          )}
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  );
}
