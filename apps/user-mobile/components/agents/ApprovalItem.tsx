import { View, Text, Pressable, Image, Alert } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { format } from "date-fns";

import { Colors } from "@/constants/Colors";
import type { AgentScheduleExecution } from "@/lib/types/agents";

interface ApprovalItemProps {
  execution: AgentScheduleExecution;
  onApprove: () => void;
  onReject: () => void;
  isLoading?: boolean;
  isLast?: boolean;
}

export function ApprovalItem({
  execution,
  onApprove,
  onReject,
  isLoading,
  isLast,
}: ApprovalItemProps) {
  const agentName = execution.agent?.name || "Agent";
  const avatarUrl = execution.agent?.avatar_url;
  const taskPrompt = execution.schedule?.task_prompt || "Scheduled task";
  const scheduledTime = format(
    new Date(execution.scheduled_for),
    "MMM d, yyyy h:mm a"
  );

  const handleReject = () => {
    Alert.alert(
      "Reject Execution",
      "Are you sure you want to reject this scheduled task?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reject", style: "destructive", onPress: onReject },
      ]
    );
  };

  return (
    <View className={`p-4 ${!isLast ? "border-b border-border" : ""}`}>
      <View className="flex-row items-start">
        {/* Clock icon with tinted background */}
        <View
          className="h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: Colors.warning + "20" }}
        >
          <FontAwesome name="clock-o" size={18} color={Colors.warning} />
        </View>

        {/* Content */}
        <View className="ml-3 flex-1">
          <Text className="font-medium text-foreground">{agentName}</Text>
          <Text
            className="mt-0.5 text-sm text-muted-foreground"
            numberOfLines={2}
          >
            {taskPrompt}
          </Text>
          <Text className="mt-1 text-xs text-muted-foreground">
            Scheduled: {scheduledTime}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="mt-3 flex-row justify-end gap-2">
        <Pressable
          className="rounded-lg border border-border bg-background px-4 py-2 active:opacity-70"
          onPress={handleReject}
          disabled={isLoading}
        >
          <Text className="text-sm font-medium text-foreground">Reject</Text>
        </Pressable>
        <Pressable
          className="rounded-lg bg-primary px-4 py-2 active:opacity-70"
          onPress={onApprove}
          disabled={isLoading}
        >
          <Text className="text-sm font-medium text-white">Approve</Text>
        </Pressable>
      </View>
    </View>
  );
}
