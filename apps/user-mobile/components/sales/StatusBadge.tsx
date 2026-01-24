import { View, Text } from "react-native";
import {
  LeadStatus,
  LEAD_STATUS_COLORS,
  getLeadStatusLabel,
  LeadPipelineStage,
} from "../../lib/types/sales";

interface StatusBadgeProps {
  status?: LeadStatus;
  stage?: LeadPipelineStage;
  size?: "sm" | "md";
}

export function StatusBadge({ status, stage, size = "md" }: StatusBadgeProps) {
  // Determine color and label based on whether we have a status or stage
  let color: string;
  let label: string;

  if (stage) {
    color = stage.color;
    label = stage.name;
  } else if (status) {
    color = LEAD_STATUS_COLORS[status];
    label = getLeadStatusLabel(status);
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
      <Text
        className={`font-medium ${textClasses}`}
        style={{ color }}
      >
        {label}
      </Text>
    </View>
  );
}
