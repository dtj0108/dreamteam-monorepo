import { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";

import { useAllMilestones } from "../../../../lib/hooks/useProjects";
import {
  Milestone,
  MilestoneStatus,
  MILESTONE_STATUS_COLORS,
  getMilestoneStatusLabel,
  getMilestoneStatusIcon,
  TASK_STATUS_COLORS,
} from "../../../../lib/types/projects";
import { ProgressBar } from "../../../../components/projects/ProgressBar";

const STATUS_FILTERS: (MilestoneStatus | "all")[] = ["all", "at_risk", "upcoming", "completed", "missed"];

export default function GlobalMilestonesScreen() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<MilestoneStatus | "all">("all");

  // Fetch all milestones across projects
  const { data: milestonesData, isLoading, refetch } = useAllMilestones();
  const allMilestones = milestonesData?.milestones || [];

  // Filter milestones
  const milestones = useMemo(() => {
    if (statusFilter === "all") return allMilestones;
    return allMilestones.filter((m) => m.status === statusFilter);
  }, [allMilestones, statusFilter]);

  // Calculate stats
  const stats = {
    total: allMilestones.length,
    upcoming: allMilestones.filter((m) => m.status === "upcoming").length,
    at_risk: allMilestones.filter((m) => m.status === "at_risk").length,
    completed: allMilestones.filter((m) => m.status === "completed").length,
    missed: allMilestones.filter((m) => m.status === "missed").length,
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

  const handleMilestonePress = (milestone: Milestone) => {
    if (milestone.project) {
      router.push({
        pathname: "/(main)/projects/[id]/milestones",
        params: { id: milestone.project_id },
      });
    }
  };

  const renderMilestoneCard = ({ item }: { item: Milestone }) => {
    const daysUntil = getDaysUntil(item.target_date);
    const statusColor = MILESTONE_STATUS_COLORS[item.status];
    const statusIcon = getMilestoneStatusIcon(item.status);

    return (
      <Pressable
        className="mb-3 rounded-xl bg-muted p-4"
        onPress={() => handleMilestonePress(item)}
      >
        {/* Project Badge */}
        {item.project && (
          <View className="mb-2 flex-row items-center">
            <View
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.project.color }}
            />
            <Text className="ml-1.5 text-xs font-medium text-muted-foreground">
              {item.project.name}
            </Text>
          </View>
        )}

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
          headerTitle: "All Milestones",
          headerStyle: { backgroundColor: "#fafafa" },
        }}
      />

      {/* Stats */}
      <View className="flex-row border-b border-gray-100 px-4 py-3">
        {[
          { label: "At Risk", value: stats.at_risk, color: MILESTONE_STATUS_COLORS.at_risk },
          { label: "Upcoming", value: stats.upcoming, color: MILESTONE_STATUS_COLORS.upcoming },
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

      {/* Status Filter */}
      <View className="border-b border-gray-100 px-4 py-2">
        <View className="flex-row flex-wrap gap-1">
          {STATUS_FILTERS.map((s) => {
            const isSelected = statusFilter === s;
            const color = s === "all" ? "#6b7280" : MILESTONE_STATUS_COLORS[s];
            return (
              <Pressable
                key={s}
                className={`rounded-full px-3 py-1.5 ${isSelected ? "" : "bg-muted"}`}
                style={isSelected ? { backgroundColor: color } : undefined}
                onPress={() => setStatusFilter(s)}
              >
                <Text
                  className={`text-xs font-medium ${isSelected ? "text-white" : "text-muted-foreground"}`}
                >
                  {s === "all" ? "All" : getMilestoneStatusLabel(s)}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
              No milestones found
            </Text>
            <Text className="mt-1 text-center text-muted-foreground">
              {statusFilter !== "all"
                ? `No ${getMilestoneStatusLabel(statusFilter).toLowerCase()} milestones`
                : "Create milestones in your projects"}
            </Text>
          </View>
        }
      />
    </View>
  );
}
