import { View, Text } from "react-native";
import {
  TaskPriority,
  ProjectPriority,
  TASK_PRIORITY_COLORS,
  PROJECT_PRIORITY_COLORS,
  getTaskPriorityLabel,
  getProjectPriorityLabel,
} from "../../lib/types/projects";

interface PriorityBadgeProps {
  taskPriority?: TaskPriority;
  projectPriority?: ProjectPriority;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function PriorityBadge({
  taskPriority,
  projectPriority,
  size = "md",
  showLabel = true,
}: PriorityBadgeProps) {
  let color: string;
  let label: string;

  if (taskPriority) {
    color = TASK_PRIORITY_COLORS[taskPriority];
    label = getTaskPriorityLabel(taskPriority);
  } else if (projectPriority) {
    color = PROJECT_PRIORITY_COLORS[projectPriority];
    label = getProjectPriorityLabel(projectPriority);
  } else {
    return null;
  }

  // Dot-only mode
  if (!showLabel) {
    const dotSize = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
    return <View className={`rounded-full ${dotSize}`} style={{ backgroundColor: color }} />;
  }

  const sizeClasses = size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1";
  const textClasses = size === "sm" ? "text-xs" : "text-xs";

  return (
    <View
      className={`flex-row items-center rounded-full ${sizeClasses}`}
      style={{ backgroundColor: color + "20" }}
    >
      <View className="mr-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <Text className={`font-medium ${textClasses}`} style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
