import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import {
  Activity,
  ActivityType,
  ACTIVITY_TYPE_COLORS,
  getActivityTypeLabel,
} from "../../lib/types/sales";
import { ActivityItem } from "./ActivityItem";

type FilterType = ActivityType | "all";

interface FilterChipProps {
  label: string;
  isActive: boolean;
  color?: string;
  onPress: () => void;
}

function FilterChip({ label, isActive, color, onPress }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`mr-2 rounded-full px-3 py-1.5 ${
        isActive ? "" : "bg-muted"
      }`}
      style={isActive ? { backgroundColor: color || "#0ea5e9" } : undefined}
    >
      <Text
        className={`text-sm font-medium ${
          isActive ? "text-white" : "text-muted-foreground"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface ActivityTimelineProps {
  activities: Activity[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onActivityPress?: (activity: Activity) => void;
  onLogActivity?: () => void;
  emptyMessage?: string;
}

export function ActivityTimeline({
  activities,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  onActivityPress,
  onLogActivity,
  emptyMessage = "No activities yet",
}: ActivityTimelineProps) {
  const [filterType, setFilterType] = useState<FilterType>("all");

  const filteredActivities =
    filterType === "all"
      ? activities
      : activities.filter((a) => a.type === filterType);

  const activityTypes: FilterType[] = [
    "all",
    "call",
    "sms",
    "email",
    "meeting",
    "note",
    "task",
  ];

  const getFilterColor = (type: FilterType): string => {
    if (type === "all") return "#0ea5e9";
    return ACTIVITY_TYPE_COLORS[type];
  };

  const getFilterLabel = (type: FilterType): string => {
    if (type === "all") return "All";
    return getActivityTypeLabel(type);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-12 border-b border-border px-4 py-2"
        contentContainerStyle={{ alignItems: "center" }}
      >
        {activityTypes.map((type) => (
          <FilterChip
            key={type}
            label={getFilterLabel(type)}
            isActive={filterType === type}
            color={getFilterColor(type)}
            onPress={() => setFilterType(type)}
          />
        ))}
      </ScrollView>

      {/* Activity list */}
      {filteredActivities.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 py-12">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FontAwesome name="history" size={24} color="#9ca3af" />
          </View>
          <Text className="mt-4 text-center text-lg font-medium text-foreground">
            {emptyMessage}
          </Text>
          <Text className="mt-1 text-center text-muted-foreground">
            {filterType === "all"
              ? "Log your first activity to track interactions"
              : `No ${getFilterLabel(filterType).toLowerCase()} activities found`}
          </Text>
          {onLogActivity && filterType === "all" && (
            <Pressable
              onPress={onLogActivity}
              className="mt-4 rounded-full bg-primary px-6 py-2.5 active:opacity-70"
            >
              <Text className="font-medium text-white">Log Activity</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredActivities}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ActivityItem
              activity={item}
              showTimeline={index > 0}
              isLast={index === filteredActivities.length - 1}
              onPress={() => onActivityPress?.(item)}
            />
          )}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor="#0ea5e9"
              />
            ) : undefined
          }
        />
      )}
    </View>
  );
}
