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
} from "../../../../lib/types/projects";

type TimePeriod = "week" | "month";

const DEFAULT_HOURS_PER_WEEK = 40;

interface TeamMemberWorkload {
  id: string;
  name: string;
  avatarUrl: string | null;
  allocatedHours: number;
  availableHours: number;
  utilization: number;
  taskCount: number;
  projectCount: number;
  tasksByStatus: Record<TaskStatus, number>;
}

export default function WorkloadScreen() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("week");

  // Fetch data
  const { data: projectsData, isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const { data: myTasksData, isLoading: tasksLoading, refetch: refetchTasks } = useMyTasks();

  const projects = projectsData?.projects || [];
  const tasks = myTasksData?.tasks || [];

  // For demo purposes, we'll create some mock workload data
  // In a real app, this would come from aggregating all project members and their tasks
  const teamWorkload = useMemo((): TeamMemberWorkload[] => {
    // This is a simplified implementation
    // In reality, you'd fetch all project members and their assigned tasks across all projects

    const multiplier = timePeriod === "week" ? 1 : 4;
    const availableHours = DEFAULT_HOURS_PER_WEEK * multiplier;

    // Create a mock current user workload based on myTasks
    const tasksByStatus: Record<TaskStatus, number> = {
      todo: 0,
      in_progress: 0,
      review: 0,
      done: 0,
    };

    let allocatedHours = 0;
    const projectIds = new Set<string>();

    tasks.forEach((task) => {
      tasksByStatus[task.status]++;
      allocatedHours += task.estimated_hours || 2; // Default 2 hours if not specified
      if (task.project?.id) {
        projectIds.add(task.project.id);
      }
    });

    const utilization = Math.round((allocatedHours / availableHours) * 100);

    return [
      {
        id: "current-user",
        name: "You",
        avatarUrl: null,
        allocatedHours,
        availableHours,
        utilization,
        taskCount: tasks.length,
        projectCount: projectIds.size,
        tasksByStatus,
      },
    ];
  }, [tasks, timePeriod]);

  // Calculate team stats
  const teamStats = useMemo(() => {
    const members = teamWorkload.length;
    const totalAllocated = teamWorkload.reduce((sum, m) => sum + m.allocatedHours, 0);
    const overloaded = teamWorkload.filter((m) => m.utilization > 100).length;
    const available = teamWorkload.filter((m) => m.utilization < 80).length;

    return { members, totalAllocated, overloaded, available };
  }, [teamWorkload]);

  const isLoading = projectsLoading || tasksLoading;

  const handleRefresh = () => {
    refetchProjects();
    refetchTasks();
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 100) return "#ef4444"; // Red - overloaded
    if (utilization > 80) return "#f59e0b"; // Amber - warning
    return "#10b981"; // Green - healthy
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
          headerTitle: "Workload",
          headerStyle: { backgroundColor: "#fafafa" },
        }}
      />

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Time Period Selector */}
        <View className="flex-row gap-2 px-4 py-3">
          {[
            { value: "week" as TimePeriod, label: "This Week" },
            { value: "month" as TimePeriod, label: "This Month" },
          ].map(({ value, label }) => (
            <Pressable
              key={value}
              className={`flex-1 rounded-lg py-2 ${timePeriod === value ? "bg-primary" : "bg-muted"}`}
              onPress={() => setTimePeriod(value)}
            >
              <Text
                className={`text-center text-sm font-medium ${timePeriod === value ? "text-white" : "text-muted-foreground"}`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Team Stats */}
        <View className="px-4">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Team Overview
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {[
              { label: "Team Members", value: teamStats.members, color: "#6366f1" },
              { label: "Total Hours", value: teamStats.totalAllocated, color: "#3b82f6" },
              { label: "Overloaded", value: teamStats.overloaded, color: "#ef4444" },
              { label: "Available", value: teamStats.available, color: "#10b981" },
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

        {/* Team Member Cards */}
        <View className="mt-6 px-4">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Capacity by Team Member
          </Text>

          {teamWorkload.length === 0 ? (
            <View className="items-center rounded-xl bg-muted py-12">
              <FontAwesome name="users" size={48} color="#d1d5db" />
              <Text className="mt-4 text-lg font-medium text-foreground">
                No team members
              </Text>
              <Text className="mt-1 text-muted-foreground">
                Add members to projects to see workload
              </Text>
            </View>
          ) : (
            teamWorkload.map((member) => {
              const utilizationColor = getUtilizationColor(member.utilization);
              const isOverloaded = member.utilization > 100;

              return (
                <View key={member.id} className="mb-3 rounded-xl bg-muted p-4">
                  {/* Header */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-300">
                        <Text className="font-medium text-gray-600">
                          {member.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View className="ml-3">
                        <Text className="font-semibold text-foreground">{member.name}</Text>
                        <Text className="text-sm text-muted-foreground">
                          {member.taskCount} tasks · {member.projectCount} projects
                        </Text>
                      </View>
                    </View>
                    {isOverloaded && (
                      <View className="rounded-full bg-red-100 px-2 py-1">
                        <Text className="text-xs font-medium text-red-600">Overloaded</Text>
                      </View>
                    )}
                  </View>

                  {/* Capacity Bar */}
                  <View className="mt-4">
                    <View className="mb-1 flex-row items-center justify-between">
                      <Text className="text-xs text-muted-foreground">Capacity</Text>
                      <Text className="text-xs font-medium" style={{ color: utilizationColor }}>
                        {member.allocatedHours}h / {member.availableHours}h ({member.utilization}%)
                      </Text>
                    </View>
                    <View className="h-3 overflow-hidden rounded-full bg-gray-200">
                      <View
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: utilizationColor,
                          width: `${Math.min(member.utilization, 100)}%`,
                        }}
                      />
                      {isOverloaded && (
                        <View
                          className="absolute left-0 top-0 h-full rounded-full opacity-50"
                          style={{
                            backgroundColor: "#ef4444",
                            width: `${Math.min(member.utilization - 100, 50)}%`,
                            marginLeft: "100%",
                          }}
                        />
                      )}
                    </View>
                  </View>

                  {/* Task Breakdown */}
                  <View className="mt-4 flex-row justify-between">
                    {(["todo", "in_progress", "review"] as TaskStatus[]).map((status) => {
                      const count = member.tasksByStatus[status];
                      const color = TASK_STATUS_COLORS[status];

                      return (
                        <View key={status} className="flex-row items-center">
                          <View
                            className="mr-1.5 h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <Text className="text-xs text-muted-foreground">
                            {count} {status.replace("_", " ")}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Utilization Legend */}
        <View className="mx-4 mt-6 rounded-lg bg-muted p-3">
          <Text className="mb-2 text-xs font-medium text-muted-foreground">Utilization Guide</Text>
          <View className="flex-row flex-wrap gap-4">
            {[
              { label: "Healthy", color: "#10b981", range: "< 80%" },
              { label: "Warning", color: "#f59e0b", range: "80-100%" },
              { label: "Overloaded", color: "#ef4444", range: "> 100%" },
            ].map(({ label, color, range }) => (
              <View key={label} className="flex-row items-center">
                <View
                  className="mr-1.5 h-3 w-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <Text className="text-xs text-muted-foreground">
                  {label} ({range})
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Note about data */}
        <View className="mx-4 mt-4 rounded-lg bg-amber-50 p-3">
          <View className="flex-row items-center">
            <FontAwesome name="info-circle" size={14} color="#f59e0b" />
            <Text className="ml-2 flex-1 text-xs text-amber-700">
              Workload calculations are based on estimated hours. Set estimated hours on tasks for more accurate capacity planning.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
