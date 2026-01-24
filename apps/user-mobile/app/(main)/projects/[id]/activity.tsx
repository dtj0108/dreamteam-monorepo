import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import {
  useProject,
  useProjectActivity,
} from "../../../../lib/hooks/useProjects";
import {
  getActivityActionLabel,
  getActivityActionIcon,
  ProjectActivity,
} from "../../../../lib/types/projects";

export default function ProjectActivityScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [refreshing, setRefreshing] = useState(false);

  // Fetch data
  const { data: project, isLoading: projectLoading } = useProject(id);
  const {
    data: activityData,
    isLoading: activityLoading,
    refetch: refetchActivity,
  } = useProjectActivity(id, { limit: 50 });
  const activities = activityData?.activities || [];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchActivity();
    setRefreshing(false);
  };

  const formatActivityTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getActivityColor = (action: string): string => {
    if (action.includes("created")) return "#22c55e"; // green
    if (action.includes("completed")) return "#10b981"; // emerald
    if (action.includes("deleted") || action.includes("removed") || action.includes("unlinked")) return "#ef4444"; // red
    if (action.includes("updated")) return "#3b82f6"; // blue
    if (action.includes("added") || action.includes("linked")) return "#8b5cf6"; // violet
    return "#6b7280"; // gray
  };

  const groupActivitiesByDate = (activities: ProjectActivity[]): Record<string, ProjectActivity[]> => {
    const groups: Record<string, ProjectActivity[]> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    activities.forEach((activity) => {
      const activityDate = new Date(activity.created_at);
      activityDate.setHours(0, 0, 0, 0);

      let key: string;
      if (activityDate.getTime() === today.getTime()) {
        key = "Today";
      } else if (activityDate.getTime() === yesterday.getTime()) {
        key = "Yesterday";
      } else {
        key = activityDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(activity);
    });

    return groups;
  };

  const isLoading = projectLoading || activityLoading;

  if (isLoading && !refreshing) {
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

  const groupedActivities = groupActivitiesByDate(activities);

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Activity",
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: "#fafafa" },
        }}
      />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View className="px-4 py-4">
          <Text className="text-lg font-semibold text-foreground">
            Project Activity
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            Recent actions and changes in this project
          </Text>
        </View>

        {/* Activity Feed */}
        <View className="px-4">
          {activities.length === 0 ? (
            <View className="items-center rounded-xl bg-muted py-12">
              <FontAwesome name="clock-o" size={48} color="#d1d5db" />
              <Text className="mt-4 text-lg font-medium text-foreground">
                No activity yet
              </Text>
              <Text className="mt-1 text-center text-muted-foreground">
                Activity will appear here as your team works on this project
              </Text>
            </View>
          ) : (
            Object.entries(groupedActivities).map(([dateLabel, dateActivities]) => (
              <View key={dateLabel} className="mb-6">
                {/* Date Header */}
                <Text className="mb-3 text-sm font-medium text-muted-foreground">
                  {dateLabel}
                </Text>

                {/* Activities for this date */}
                <View className="rounded-xl bg-muted overflow-hidden">
                  {dateActivities.map((activity, index) => (
                    <View
                      key={activity.id}
                      className={`flex-row p-4 ${
                        index > 0 ? "border-t border-gray-200" : ""
                      }`}
                    >
                      {/* Icon */}
                      <View
                        className="h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${getActivityColor(activity.action)}20` }}
                      >
                        <FontAwesome
                          name={getActivityActionIcon(activity.action) as any}
                          size={16}
                          color={getActivityColor(activity.action)}
                        />
                      </View>

                      {/* Content */}
                      <View className="ml-3 flex-1">
                        <View className="flex-row flex-wrap items-baseline">
                          <Text className="font-medium text-foreground">
                            {activity.user?.name || "Unknown user"}
                          </Text>
                          <Text className="ml-1 text-muted-foreground">
                            {getActivityActionLabel(activity.action)}
                          </Text>
                        </View>

                        {activity.entity_name && (
                          <Text
                            className="mt-1 text-sm text-foreground"
                            numberOfLines={1}
                          >
                            "{activity.entity_name}"
                          </Text>
                        )}

                        <Text className="mt-1 text-xs text-muted-foreground">
                          {formatActivityTime(activity.created_at)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Activity Count */}
        {activities.length > 0 && (
          <View className="mx-4 mt-2">
            <Text className="text-sm text-muted-foreground">
              Showing {activities.length} activit{activities.length === 1 ? "y" : "ies"}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
