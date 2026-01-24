import { View, Text } from "react-native";
import {
  ProjectStatus,
  TaskStatus,
  PROJECT_STATUS_COLORS,
  TASK_STATUS_COLORS,
  getProjectStatusLabel,
  getTaskStatusLabel,
} from "../../lib/types/projects";

interface StatusBadgeProps {
  projectStatus?: ProjectStatus;
  taskStatus?: TaskStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ projectStatus, taskStatus, size = "md" }: StatusBadgeProps) {
  let color: string;
  let label: string;

  if (taskStatus) {
    color = TASK_STATUS_COLORS[taskStatus];
    label = getTaskStatusLabel(taskStatus);
  } else if (projectStatus) {
    color = PROJECT_STATUS_COLORS[projectStatus];
    label = getProjectStatusLabel(projectStatus);
  } else {
    return null;
  }

  const sizeClasses = size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1";
  const textClasses = size === "sm" ? "text-xs" : "text-xs";

  return (
    <View
      className={`rounded-full ${sizeClasses}`}
      style={{ backgroundColor: color + "20" }}
    >
      <Text className={`font-medium ${textClasses}`} style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
