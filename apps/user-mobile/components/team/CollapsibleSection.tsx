import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  rightElement?: React.ReactNode;
  badgeCount?: number;
}

export function CollapsibleSection({
  title,
  children,
  defaultExpanded = true,
  rightElement,
  badgeCount = 0,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const rotation = useSharedValue(defaultExpanded ? 0 : -90);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    rotation.value = withTiming(isExpanded ? -90 : 0, { duration: 200 });
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View className="mb-4">
      <Pressable
        onPress={toggleExpanded}
        className="flex-row items-center justify-between px-4 py-3"
      >
        <View className="flex-row items-center">
          <Text className="text-base font-semibold text-foreground">{title}</Text>
          {badgeCount > 0 && (
            <View className="ml-2 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 py-0.5">
              <Text className="text-xs font-semibold text-white">
                {badgeCount > 99 ? "99+" : badgeCount}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center">
          {rightElement}
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-down" size={20} color="#64748b" />
          </Animated.View>
        </View>
      </Pressable>

      {isExpanded && <View className="px-4">{children}</View>}
    </View>
  );
}
