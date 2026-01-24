import { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { Stack } from "expo-router";

import { useProjects, useMyTasks } from "../../../../lib/hooks/useProjects";
import {
  TaskStatus,
  TASK_STATUS_COLORS,
  getTaskStatusLabel,
  PROJECT_STATUS_COLORS,
  getProjectStatusLabel,
} from "../../../../lib/types/projects";
import { ProgressBar } from "../../../../components/projects/ProgressBar";

type TimeRange = "week" | "month" | "quarter";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "quarter", label: "This Quarter" },
];

export default function ReportsScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>("month");

  // Fetch data
  const { data: projectsData, isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const { data: myTasksData, isLoading: tasksLoading, refetch: refetchTasks } = useMyTasks();

  const projects = projectsData?.projects || [];
  const tasks = myTasksData?.tasks || [];
  const taskStats = myTasksData?.stats;

  // Calculate task distribution
  const taskDistribution = useMemo(() => {
    const distribution: Record<TaskStatus, number> = {
      todo: 0,
      in_progress: 0,
      review: 0,
      done: 0,
    };
    tasks.forEach((task) => {
      distribution[task.status]++;
    });
    return distribution;
  }, [tasks]);

  // Calculate project status distribution
  const projectDistribution = useMemo(() => {
    return {
      active: projects.filter((p) => p.status === "active").length,
      on_hold: projects.filter((p) => p.status === "on_hold").length,
      completed: projects.filter((p) => p.status === "completed").length,
    };
  }, [projects]);

  // Calculate overall stats
  const totalTasks = tasks.length;
  const completedTasks = taskDistribution.done;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const overdueTasks = taskStats?.overdue || 0;

  const isLoading = projectsLoading || tasksLoading;

  const handleRefresh = () => {
    refetchProjects();
    refetchTasks();
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
          headerTitle: "Reports",
          headerStyle: { backgroundColor: "#fafafa" },
        }}
      />

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Time Range Selector */}
        <View className="flex-row gap-2 px-4 py-3">
          {TIME_RANGES.map(({ value, label }) => (
            <Pressable
              key={value}
              className={`flex-1 rounded-lg py-2 ${timeRange === value ? "bg-primary" : "bg-muted"}`}
              onPress={() => setTimeRange(value)}
            >
              <Text
                className={`text-center text-sm font-medium ${timeRange === value ? "text-white" : "text-muted-foreground"}`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Overview Stats */}
        <View className="px-4">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Overview
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {[
              { label: "Total Projects", value: projects.length, color: "#6366f1" },
              { label: "Total Tasks", value: totalTasks, color: "#3b82f6" },
              { label: "Completion Rate", value: `${completionRate}%`, color: "#10b981" },
              { label: "Overdue Tasks", value: overdueTasks, color: "#ef4444" },
            ].map(({ label, value, color }) => (
              <View key={label} className="flex-1 min-w-[45%] rounded-xl bg-muted p-4">
                <Text className="text-2xl font-bold" style={{ color }}>
                  {value}
                </Text>
                <Text className="mt-1 text-xs text-muted-foreground">{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Task Distribution */}
        <View className="mt-6 px-4">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Task Distribution
          </Text>
          <View className="rounded-xl bg-muted p-4">
            {(["todo", "in_progress", "review", "done"] as TaskStatus[]).map((status) => {
              const count = taskDistribution[status];
              const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
              const color = TASK_STATUS_COLORS[status];

              return (
                <View key={status} className="mb-3 last:mb-0">
                  <View className="mb-1 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View
                        className="mr-2 h-3 w-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <Text className="text-sm font-medium text-foreground">
                        {getTaskStatusLabel(status)}
                      </Text>
                    </View>
                    <Text className="text-sm text-muted-foreground">
                      {count} ({percentage}%)
                    </Text>
                  </View>
                  <View className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <View
                      className="h-full rounded-full"
                      style={{ backgroundColor: color, width: `${percentage}%` }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Project Status Distribution */}
        <View className="mt-6 px-4">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Project Status
          </Text>
          <View className="rounded-xl bg-muted p-4">
            {[
              { status: "active", count: projectDistribution.active },
              { status: "on_hold", count: projectDistribution.on_hold },
              { status: "completed", count: projectDistribution.completed },
            ].map(({ status, count }) => {
              const percentage = projects.length > 0 ? Math.round((count / projects.length) * 100) : 0;
              const color = PROJECT_STATUS_COLORS[status as keyof typeof PROJECT_STATUS_COLORS];

              return (
                <View key={status} className="mb-3 last:mb-0">
                  <View className="mb-1 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View
                        className="mr-2 h-3 w-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <Text className="text-sm font-medium text-foreground">
                        {getProjectStatusLabel(status as any)}
                      </Text>
                    </View>
                    <Text className="text-sm text-muted-foreground">
                      {count} ({percentage}%)
                    </Text>
                  </View>
                  <View className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <View
                      className="h-full rounded-full"
                      style={{ backgroundColor: color, width: `${percentage}%` }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Project Progress Table */}
        <View className="mt-6 px-4">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Project Progress
          </Text>
          <View className="rounded-xl bg-muted overflow-hidden">
            {/* Header */}
            <View className="flex-row border-b border-gray-200 bg-gray-100 px-4 py-2">
              <Text className="flex-1 text-xs font-semibold text-muted-foreground">Project</Text>
              <Text className="w-16 text-center text-xs font-semibold text-muted-foreground">Tasks</Text>
              <Text className="w-20 text-center text-xs font-semibold text-muted-foreground">Progress</Text>
            </View>

            {/* Rows */}
            {projects.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-muted-foreground">No projects</Text>
              </View>
            ) : (
              projects.slice(0, 10).map((project, index) => (
                <View
                  key={project.id}
                  className={`flex-row items-center px-4 py-3 ${index > 0 ? "border-t border-gray-200" : ""}`}
                >
                  <View className="flex-1 flex-row items-center">
                    <View
                      className="mr-2 h-3 w-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
                      {project.name}
                    </Text>
                  </View>
                  <Text className="w-16 text-center text-sm text-muted-foreground">
                    {project.completedTasks || 0}/{project.totalTasks || 0}
                  </Text>
                  <View className="w-20 items-center">
                    <ProgressBar
                      progress={project.progress || 0}
                      size="sm"
                      color={project.color}
                    />
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Summary Stats */}
        <View className="mt-6 px-4">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Summary
          </Text>
          <View className="flex-row gap-3">
            {[
              { label: "Completed Tasks", value: completedTasks, icon: "check-circle", color: "#10b981" },
              { label: "In Progress", value: taskDistribution.in_progress, icon: "spinner", color: "#3b82f6" },
              { label: "To Review", value: taskDistribution.review, icon: "eye", color: "#8b5cf6" },
            ].map(({ label, value, icon, color }) => (
              <View key={label} className="flex-1 items-center rounded-xl bg-muted p-4">
                <FontAwesome name={icon as any} size={24} color={color} />
                <Text className="mt-2 text-xl font-bold text-foreground">{value}</Text>
                <Text className="mt-1 text-center text-xs text-muted-foreground">{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
