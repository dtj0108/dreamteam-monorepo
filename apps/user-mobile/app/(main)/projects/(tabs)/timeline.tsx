import { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";

import { useProjects, useMyTasks } from "../../../../lib/hooks/useProjects";
import {
  Task,
  TASK_STATUS_COLORS,
  getTaskStatusLabel,
} from "../../../../lib/types/projects";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TASK_LABEL_WIDTH = 140;
const DAY_WIDTH = 32;

type ViewMode = "week" | "month";

export default function TimelineScreen() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Fetch data
  const { data: projectsData, isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = useMyTasks();

  const projects = projectsData?.projects || [];
  const tasks = tasksData?.tasks || [];

  // Filter tasks with dates
  const tasksWithDates = useMemo(() => {
    return tasks.filter((task) => task.due_date || task.start_date);
  }, [tasks]);

  // Generate date range
  const dateRange = useMemo(() => {
    const dates: Date[] = [];
    const daysToShow = viewMode === "week" ? 7 : 30;

    // Start from beginning of the week/month
    const start = new Date(currentDate);
    if (viewMode === "week") {
      start.setDate(start.getDate() - start.getDay()); // Start from Sunday
    } else {
      start.setDate(1); // Start from first of month
    }

    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }

    return dates;
  }, [currentDate, viewMode]);

  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleTaskPress = (task: Task) => {
    if (task.project) {
      router.push({
        pathname: "/(main)/projects/(tabs)/(home)/tasks/[taskId]",
        params: { taskId: task.id, projectId: task.project_id },
      });
    }
  };

  const isLoading = projectsLoading || tasksLoading;

  const handleRefresh = () => {
    refetchProjects();
    refetchTasks();
  };

  const formatDateHeader = () => {
    if (viewMode === "week") {
      const start = dateRange[0];
      const end = dateRange[dateRange.length - 1];
      return `${start?.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isWeekend = (date: Date) => {
    return date.getDay() === 0 || date.getDay() === 6;
  };

  const getTaskPosition = (task: Task) => {
    const startDate = task.start_date ? new Date(task.start_date) : task.due_date ? new Date(task.due_date) : null;
    const endDate = task.due_date ? new Date(task.due_date) : startDate;

    if (!startDate || !endDate) return null;

    const rangeStart = dateRange[0];
    const rangeEnd = dateRange[dateRange.length - 1];

    // Check if task is in view
    if (endDate < rangeStart || startDate > rangeEnd) return null;

    const visibleStart = startDate < rangeStart ? rangeStart : startDate;
    const visibleEnd = endDate > rangeEnd ? rangeEnd : endDate;

    const startOffset = Math.floor((visibleStart.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((visibleEnd.getTime() - visibleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return {
      left: startOffset * DAY_WIDTH,
      width: Math.max(duration * DAY_WIDTH - 4, DAY_WIDTH - 4),
    };
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
          headerTitle: "Timeline",
          headerStyle: { backgroundColor: "#fafafa" },
        }}
      />

      {/* Controls */}
      <View className="border-b border-gray-100 px-4 py-3">
        {/* View Mode Toggle */}
        <View className="mb-3 flex-row gap-2">
          {[
            { value: "week" as ViewMode, label: "Week" },
            { value: "month" as ViewMode, label: "Month" },
          ].map(({ value, label }) => (
            <Pressable
              key={value}
              className={`flex-1 rounded-lg py-2 ${viewMode === value ? "bg-primary" : "bg-muted"}`}
              onPress={() => setViewMode(value)}
            >
              <Text
                className={`text-center text-sm font-medium ${viewMode === value ? "text-white" : "text-muted-foreground"}`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Navigation */}
        <View className="flex-row items-center justify-between">
          <Pressable className="p-2" onPress={goToPrevious}>
            <FontAwesome name="chevron-left" size={16} color="#6b7280" />
          </Pressable>

          <Pressable onPress={goToToday}>
            <Text className="text-base font-semibold text-foreground">
              {formatDateHeader()}
            </Text>
          </Pressable>

          <Pressable className="p-2" onPress={goToNext}>
            <FontAwesome name="chevron-right" size={16} color="#6b7280" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Timeline Grid */}
        <View className="flex-row">
          {/* Task Labels Column */}
          <View style={{ width: TASK_LABEL_WIDTH }}>
            {/* Header placeholder */}
            <View className="h-12 border-b border-r border-gray-200 bg-gray-50" />

            {/* Task labels */}
            {tasksWithDates.map((task) => (
              <Pressable
                key={task.id}
                className="h-12 justify-center border-b border-r border-gray-200 px-2"
                onPress={() => handleTaskPress(task)}
              >
                <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                  {task.title}
                </Text>
                {task.project && (
                  <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                    {task.project.name}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>

          {/* Timeline Content */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ width: dateRange.length * DAY_WIDTH }}
          >
            <View>
              {/* Date Headers */}
              <View className="h-12 flex-row border-b border-gray-200 bg-gray-50">
                {dateRange.map((date, index) => (
                  <View
                    key={index}
                    className={`items-center justify-center ${isToday(date) ? "bg-primary/10" : isWeekend(date) ? "bg-gray-100" : ""}`}
                    style={{ width: DAY_WIDTH }}
                  >
                    <Text className={`text-xs ${isToday(date) ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      {date.toLocaleDateString("en-US", { weekday: "narrow" })}
                    </Text>
                    <Text className={`text-sm ${isToday(date) ? "text-primary font-bold" : "text-foreground"}`}>
                      {date.getDate()}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Task Bars */}
              {tasksWithDates.map((task) => {
                const position = getTaskPosition(task);
                const statusColor = TASK_STATUS_COLORS[task.status];

                return (
                  <View
                    key={task.id}
                    className="relative h-12 flex-row border-b border-gray-200"
                  >
                    {/* Grid lines */}
                    {dateRange.map((date, index) => (
                      <View
                        key={index}
                        className={`border-r border-gray-100 ${isToday(date) ? "bg-primary/5" : isWeekend(date) ? "bg-gray-50" : ""}`}
                        style={{ width: DAY_WIDTH, height: "100%" }}
                      />
                    ))}

                    {/* Task bar */}
                    {position && (
                      <Pressable
                        className="absolute top-2 h-8 items-center justify-center rounded-md px-2"
                        style={{
                          left: position.left + 2,
                          width: position.width,
                          backgroundColor: statusColor,
                        }}
                        onPress={() => handleTaskPress(task)}
                      >
                        <Text
                          className="text-xs font-medium text-white"
                          numberOfLines={1}
                        >
                          {task.title}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Legend */}
        <View className="mx-4 mt-6 rounded-lg bg-muted p-3">
          <Text className="mb-2 text-xs font-medium text-muted-foreground">Legend</Text>
          <View className="flex-row flex-wrap gap-4">
            {(["todo", "in_progress", "review", "done"] as const).map((status) => (
              <View key={status} className="flex-row items-center">
                <View
                  className="mr-1.5 h-3 w-3 rounded"
                  style={{ backgroundColor: TASK_STATUS_COLORS[status] }}
                />
                <Text className="text-xs text-muted-foreground">
                  {getTaskStatusLabel(status)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Empty State */}
        {tasksWithDates.length === 0 && (
          <View className="items-center py-12">
            <FontAwesome name="calendar-o" size={48} color="#d1d5db" />
            <Text className="mt-4 text-lg font-medium text-foreground">
              No scheduled tasks
            </Text>
            <Text className="mt-1 text-center text-muted-foreground">
              Add start dates or due dates to tasks to see them on the timeline
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
