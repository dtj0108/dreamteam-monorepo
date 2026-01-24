import { View, Text, Switch, Image } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { format } from "date-fns";

import { Colors } from "@/constants/Colors";
import type { AgentSchedule } from "@/lib/types/agents";

interface ScheduleItemProps {
  schedule: AgentSchedule;
  onToggle: (enabled: boolean) => void;
  isLoading?: boolean;
  isLast?: boolean;
}

export function ScheduleItem({
  schedule,
  onToggle,
  isLoading,
  isLast,
}: ScheduleItemProps) {
  const agentName = schedule.agent?.name || "Agent";
  const avatarUrl = schedule.agent?.avatar_url;
  const nextRun = schedule.next_run_at
    ? format(new Date(schedule.next_run_at), "MMM d, h:mm a")
    : "Not scheduled";

  return (
    <View className={`flex-row items-center p-4 ${!isLast ? "border-b border-border" : ""}`}>
      {/* Calendar icon with tinted background */}
      <View
        className="h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: "#8b5cf6" + "20" }}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            className="h-10 w-10 rounded-lg"
          />
        ) : (
          <FontAwesome name="calendar" size={18} color="#8b5cf6" />
        )}
      </View>

      {/* Content */}
      <View className="ml-3 flex-1">
        <Text className="font-medium text-foreground">{schedule.name}</Text>
        <Text className="mt-0.5 text-sm text-muted-foreground">
          {agentName}
        </Text>
        <View className="mt-1 flex-row items-center">
          <FontAwesome name="clock-o" size={10} color={Colors.mutedForeground} />
          <Text className="ml-1 text-xs text-muted-foreground">
            Next: {nextRun}
          </Text>
        </View>
      </View>

      {/* Toggle */}
      <Switch
        value={schedule.is_enabled}
        onValueChange={onToggle}
        disabled={isLoading}
        trackColor={{ false: Colors.muted, true: Colors.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}
