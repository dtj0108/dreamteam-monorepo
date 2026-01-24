import { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";

import { useProject, useTasks } from "../../../../lib/hooks/useProjects";
import {
  Task,
  TaskStatus,
  TaskPriority,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
  getTaskStatusLabel,
  getTaskPriorityLabel,
} from "../../../../lib/types/projects";
import { TaskCard } from "../../../../components/projects/TaskCard";

type SortField = "title" | "status" | "priority" | "due_date" | "created_at";
type SortDirection = "asc" | "desc";

const STATUS_FILTERS: (TaskStatus | "all")[] = ["all", "todo", "in_progress", "review", "done"];
const PRIORITY_FILTERS: (TaskPriority | "all")[] = ["all", "low", "medium", "high", "urgent"];

export default function ProjectListViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch data
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: tasksData, isLoading: tasksLoading, refetch } = useTasks(id);
  const tasks = tasksData?.tasks || [];

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((task) => task.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== "all") {
      result = result.filter((task) => task.priority === priorityFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "status":
          const statusOrder = { todo: 0, in_progress: 1, review: 2, done: 3 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        case "priority":
          const priorityOrder = { low: 0, medium: 1, high: 2, urgent: 3 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case "due_date":
          if (!a.due_date && !b.due_date) comparison = 0;
          else if (!a.due_date) comparison = 1;
          else if (!b.due_date) comparison = -1;
          else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [tasks, searchQuery, statusFilter, priorityFilter, sortField, sortDirection]);

  const handleTaskPress = (task: Task) => {
    router.push({
      pathname: "/(main)/projects/(tabs)/(home)/tasks/[taskId]",
      params: { taskId: task.id, projectId: id },
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const isLoading = projectLoading || tasksLoading;

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
          headerTitle: "List View",
          headerBackTitle: "Board",
          headerStyle: { backgroundColor: "#fafafa" },
        }}
      />

      {/* Search Bar */}
      <View className="border-b border-gray-100 px-4 py-3">
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

        {/* Filter Toggle */}
        <Pressable
          className="mt-2 flex-row items-center justify-between"
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text className="text-sm font-medium text-muted-foreground">
            {filteredTasks.length} tasks
            {(statusFilter !== "all" || priorityFilter !== "all") && " (filtered)"}
          </Text>
          <View className="flex-row items-center">
            <FontAwesome
              name="filter"
              size={12}
              color={showFilters ? "#0ea5e9" : "#9ca3af"}
            />
            <Text className={`ml-1 text-sm ${showFilters ? "text-primary" : "text-muted-foreground"}`}>
              Filters
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Filters (collapsible) */}
      {showFilters && (
        <View className="border-b border-gray-100 px-4 py-3">
          {/* Status Filter */}
          <View className="mb-3">
            <Text className="mb-1.5 text-xs font-medium text-muted-foreground">Status</Text>
            <View className="flex-row flex-wrap gap-1">
              {STATUS_FILTERS.map((s) => {
                const isSelected = statusFilter === s;
                const color = s === "all" ? "#6b7280" : TASK_STATUS_COLORS[s];
                return (
                  <Pressable
                    key={s}
                    className={`rounded-full px-3 py-1 ${isSelected ? "" : "bg-muted"}`}
                    style={isSelected ? { backgroundColor: color } : undefined}
                    onPress={() => setStatusFilter(s)}
                  >
                    <Text
                      className={`text-xs font-medium ${isSelected ? "text-white" : "text-muted-foreground"}`}
                    >
                      {s === "all" ? "All" : getTaskStatusLabel(s)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Priority Filter */}
          <View className="mb-3">
            <Text className="mb-1.5 text-xs font-medium text-muted-foreground">Priority</Text>
            <View className="flex-row flex-wrap gap-1">
              {PRIORITY_FILTERS.map((p) => {
                const isSelected = priorityFilter === p;
                const color = p === "all" ? "#6b7280" : TASK_PRIORITY_COLORS[p];
                return (
                  <Pressable
                    key={p}
                    className={`rounded-full px-3 py-1 ${isSelected ? "" : "bg-muted"}`}
                    style={isSelected ? { backgroundColor: color } : undefined}
                    onPress={() => setPriorityFilter(p)}
                  >
                    <Text
                      className={`text-xs font-medium ${isSelected ? "text-white" : "text-muted-foreground"}`}
                    >
                      {p === "all" ? "All" : getTaskPriorityLabel(p)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Sort Options */}
          <View>
            <Text className="mb-1.5 text-xs font-medium text-muted-foreground">Sort By</Text>
            <View className="flex-row flex-wrap gap-1">
              {[
                { field: "created_at" as SortField, label: "Created" },
                { field: "due_date" as SortField, label: "Due Date" },
                { field: "priority" as SortField, label: "Priority" },
                { field: "status" as SortField, label: "Status" },
                { field: "title" as SortField, label: "Title" },
              ].map(({ field, label }) => {
                const isSelected = sortField === field;
                return (
                  <Pressable
                    key={field}
                    className={`flex-row items-center rounded-full px-3 py-1 ${isSelected ? "bg-primary" : "bg-muted"}`}
                    onPress={() => toggleSort(field)}
                  >
                    <Text
                      className={`text-xs font-medium ${isSelected ? "text-white" : "text-muted-foreground"}`}
                    >
                      {label}
                    </Text>
                    {isSelected && (
                      <FontAwesome
                        name={sortDirection === "asc" ? "arrow-up" : "arrow-down"}
                        size={10}
                        color="white"
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        className="flex-1 px-4 pt-2"
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetch} />
        }
        renderItem={({ item }) => (
          <TaskCard task={item} onPress={() => handleTaskPress(item)} />
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-12">
            <FontAwesome name="list" size={48} color="#d1d5db" />
            <Text className="mt-4 text-lg font-medium text-foreground">
              No tasks found
            </Text>
            <Text className="mt-1 text-center text-muted-foreground">
              {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                ? "Try adjusting your filters"
                : "Create a task to get started"}
            </Text>
          </View>
        }
      />
    </View>
  );
}
