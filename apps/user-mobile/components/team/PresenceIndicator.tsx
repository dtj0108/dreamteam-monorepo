import { View } from "react-native";

import { PresenceStatus, PRESENCE_STATUS_COLORS } from "@/lib/types/team";

interface PresenceIndicatorProps {
  status: PresenceStatus;
  size?: "xs" | "sm" | "md" | "lg";
}

const SIZE_MAP = {
  xs: { dot: 6, ring: 1 },
  sm: { dot: 10, ring: 2 },
  md: { dot: 12, ring: 2 },
  lg: { dot: 16, ring: 3 },
};

export function PresenceIndicator({
  status,
  size = "md",
}: PresenceIndicatorProps) {
  const { dot, ring } = SIZE_MAP[size];
  const color = PRESENCE_STATUS_COLORS[status];

  return (
    <View
      style={{
        width: dot + ring * 2,
        height: dot + ring * 2,
        borderRadius: (dot + ring * 2) / 2,
        backgroundColor: "white",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
