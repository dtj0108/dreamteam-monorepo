import { Pressable, Text, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import {
  Activity,
  ActivityType,
  ACTIVITY_TYPE_COLORS,
  ACTIVITY_TYPE_ICONS,
  getActivityTypeLabel,
} from "../../lib/types/sales";

interface ActivityItemProps {
  activity: Activity;
  showTimeline?: boolean;
  isLast?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ActivityItem({
  activity,
  showTimeline = true,
  isLast = false,
  onPress,
  onLongPress,
}: ActivityItemProps) {
  const color = ACTIVITY_TYPE_COLORS[activity.type];
  const iconName = ACTIVITY_TYPE_ICONS[activity.type] as keyof typeof FontAwesome.glyphMap;
  const typeLabel = getActivityTypeLabel(activity.type);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      className="flex-row active:opacity-70"
    >
      {/* Timeline connector and icon */}
      <View className="w-10 items-center">
        {/* Top connector line */}
        {showTimeline && (
          <View
            className="absolute left-1/2 top-0 h-3 w-0.5 -translate-x-1/2"
            style={{ backgroundColor: "#e5e5e5" }}
          />
        )}

        {/* Icon circle */}
        <View
          className="mt-3 h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: color + "20" }}
        >
          <FontAwesome name={iconName} size={14} color={color} />
        </View>

        {/* Bottom connector line */}
        {showTimeline && !isLast && (
          <View
            className="absolute bottom-0 left-1/2 top-11 w-0.5 -translate-x-1/2"
            style={{ backgroundColor: "#e5e5e5" }}
          />
        )}
      </View>

      {/* Content */}
      <View className="ml-3 flex-1 pb-4">
        {/* Header row */}
        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="font-medium text-foreground">
              {activity.subject || typeLabel}
            </Text>
            {/* Activity type badge */}
            <View
              className="ml-2 rounded px-1.5 py-0.5"
              style={{ backgroundColor: color + "20" }}
            >
              <Text className="text-[10px] font-medium" style={{ color }}>
                {typeLabel.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text className="text-xs text-muted-foreground">
            {getRelativeTime(activity.created_at)}
          </Text>
        </View>

        {/* Description */}
        {activity.description && (
          <Text
            className="mt-1 text-sm text-muted-foreground"
            numberOfLines={2}
          >
            {activity.description}
          </Text>
        )}

        {/* Contact association */}
        {activity.contact && (
          <View className="mt-1.5 flex-row items-center">
            <FontAwesome name="user" size={10} color="#9ca3af" />
            <Text className="ml-1.5 text-xs text-muted-foreground">
              {activity.contact.first_name}{" "}
              {activity.contact.last_name || ""}
            </Text>
          </View>
        )}

        {/* Task completion status */}
        {activity.type === "task" && (
          <View className="mt-1.5 flex-row items-center">
            <FontAwesome
              name={activity.is_completed ? "check-circle" : "circle-o"}
              size={12}
              color={activity.is_completed ? "#22c55e" : "#9ca3af"}
            />
            <Text
              className={`ml-1.5 text-xs ${
                activity.is_completed
                  ? "text-green-600"
                  : "text-muted-foreground"
              }`}
            >
              {activity.is_completed ? "Completed" : "Pending"}
            </Text>
            {activity.due_date && !activity.is_completed && (
              <Text className="ml-2 text-xs text-muted-foreground">
                Due{" "}
                {new Date(activity.due_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}
