import { Pressable, Text, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import {
  Activity,
  ActivityType,
  ACTIVITY_TYPE_COLORS,
  ACTIVITY_TYPE_ICONS,
  getActivityTypeLabel,
  Communication,
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

  // Check if this is a communication item
  const isCommunication = activity._isCommunication;
  const commData = activity._communicationData;

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
          <View className="flex-row items-center flex-1">
            {/* Direction indicator for communications */}
            {isCommunication && commData && (
              <Text className="mr-1 text-sm" style={{ color }}>
                {commData.direction === "inbound" ? "↙" : "↗"}
              </Text>
            )}
            <Text className="font-medium text-foreground flex-shrink" numberOfLines={1}>
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
          <Text className="text-xs text-muted-foreground ml-2">
            {getRelativeTime(activity.created_at)}
          </Text>
        </View>

        {/* Description / SMS body */}
        {activity.description && (
          <Text
            className="mt-1 text-sm text-muted-foreground"
            numberOfLines={activity.type === "sms" ? 3 : 2}
          >
            {activity.description}
          </Text>
        )}

        {/* Communication-specific details */}
        {isCommunication && commData && (
          <View className="mt-1.5 flex-row items-center flex-wrap">
            {/* Phone number */}
            {commData.to_number && (
              <View className="flex-row items-center mr-3">
                <FontAwesome name="phone" size={10} color="#9ca3af" />
                <Text className="ml-1.5 text-xs text-muted-foreground">
                  {commData.direction === "inbound" ? commData.from_number : commData.to_number}
                </Text>
              </View>
            )}
            {/* Call duration */}
            {commData.type === "call" && commData.duration !== undefined && commData.duration > 0 && (
              <View className="flex-row items-center mr-3">
                <FontAwesome name="clock-o" size={10} color="#9ca3af" />
                <Text className="ml-1.5 text-xs text-muted-foreground">
                  {formatCallDuration(commData.duration)}
                </Text>
              </View>
            )}
            {/* Call status (if not completed successfully) */}
            {commData.type === "call" && commData.status && !["completed", "sent", "delivered", "received"].includes(commData.status) && (
              <View className="flex-row items-center">
                <FontAwesome name="exclamation-circle" size={10} color="#f59e0b" />
                <Text className="ml-1.5 text-xs text-amber-600 capitalize">
                  {commData.status.replace("-", " ")}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Contact association (for non-communication activities) */}
        {!isCommunication && activity.contact && (
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

/**
 * Format call duration in seconds to a human-readable string
 */
function formatCallDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}
