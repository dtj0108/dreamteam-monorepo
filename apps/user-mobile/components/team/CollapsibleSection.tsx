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
}

export function CollapsibleSection({
  title,
  children,
  defaultExpanded = true,
  rightElement,
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
        <Text className="text-base font-semibold text-foreground">{title}</Text>
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
