import { View, Text, ActivityIndicator } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

import type { ScheduleExecutionStatus } from "@/lib/types/agents";

interface StatusBadgeProps {
  status: ScheduleExecutionStatus;
  size?: "sm" | "md";
}

const statusConfig: Record<
  ScheduleExecutionStatus,
  { label: string; bgColor: string; textColor: string; icon: string }
> = {
  completed: {
    label: "Completed",
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-700",
    icon: "check-circle",
  },
  failed: {
    label: "Failed",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
    icon: "times-circle",
  },
  pending_approval: {
    label: "Pending",
    bgColor: "bg-amber-100",
    textColor: "text-amber-700",
    icon: "clock-o",
  },
  approved: {
    label: "Approved",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
    icon: "check",
  },
  rejected: {
    label: "Rejected",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
    icon: "ban",
  },
  running: {
    label: "Running",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
    icon: "spinner",
  },
  cancelled: {
    label: "Cancelled",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
    icon: "ban",
  },
};

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const config = statusConfig[status];
  const isRunning = status === "running";

  const paddingClass = size === "sm" ? "px-2 py-0.5" : "px-3 py-1";
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const iconSize = size === "sm" ? 10 : 12;

  return (
    <View
      className={`flex-row items-center rounded-full ${config.bgColor} ${paddingClass}`}
    >
      {isRunning ? (
        <ActivityIndicator size="small" color="#3b82f6" />
      ) : (
        <FontAwesome
          name={config.icon as any}
          size={iconSize}
          className={config.textColor}
        />
      )}
      <Text className={`ml-1 font-medium ${config.textColor} ${textSize}`}>
        {config.label}
      </Text>
    </View>
  );
}
