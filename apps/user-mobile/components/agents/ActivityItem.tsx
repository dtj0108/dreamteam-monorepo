import { View, Text, Pressable, Image } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";

import { StatusBadge } from "./StatusBadge";
import { Colors } from "@/constants/Colors";
import type { AgentScheduleExecution } from "@/lib/types/agents";

interface ActivityItemProps {
  execution: AgentScheduleExecution;
  onPress?: () => void;
  isLast?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return Colors.success;
    case "failed":
      return Colors.destructive;
    case "running":
      return Colors.primary;
    default:
      return Colors.mutedForeground;
  }
};

const getStatusIcon = (status: string): React.ComponentProps<typeof FontAwesome>["name"] => {
  switch (status) {
    case "completed":
      return "check-circle";
    case "failed":
      return "times-circle";
    case "running":
      return "spinner";
    default:
      return "clock-o";
  }
};

export function ActivityItem({ execution, onPress, isLast }: ActivityItemProps) {
  const agentName = execution.agent?.name || "Agent";
  const avatarUrl = execution.agent?.avatar_url;
  const taskDescription =
    execution.schedule?.task_prompt || "Task execution";
  const timeAgo = formatDistanceToNow(new Date(execution.created_at), {
    addSuffix: true,
  });
  const statusColor = getStatusColor(execution.status);
  const statusIcon = getStatusIcon(execution.status);

  return (
    <Pressable
      className={`flex-row items-center p-4 active:opacity-70 ${
        !isLast ? "border-b border-border" : ""
      }`}
      onPress={onPress}
    >
      {/* Icon with status color */}
      <View
        className="h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: statusColor + "20" }}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            className="h-10 w-10 rounded-lg"
          />
        ) : (
          <FontAwesome name={statusIcon} size={18} color={statusColor} />
        )}
      </View>

      {/* Content */}
      <View className="ml-3 flex-1">
        <View className="flex-row items-center">
          <Text className="font-medium text-foreground" numberOfLines={1}>
            {agentName}
          </Text>
          <StatusBadge status={execution.status} />
        </View>
        <Text
          className="mt-0.5 text-sm text-muted-foreground"
          numberOfLines={1}
        >
          {taskDescription}
        </Text>
        <Text className="mt-0.5 text-xs text-muted-foreground">{timeAgo}</Text>
      </View>
    </Pressable>
  );
}
