import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface QuickActionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  hasNotification?: boolean;
  isActive?: boolean;
  onPress?: () => void;
  flex?: boolean;
}

export function QuickActionCard({
  icon,
  title,
  subtitle,
  hasNotification = false,
  isActive = false,
  onPress,
  flex = false,
}: QuickActionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-xl border p-3 ${flex ? "flex-1" : "mr-3 w-28"} ${
        isActive
          ? "border-primary/30 bg-primary/10"
          : "border-gray-200 bg-white"
      }`}
    >
      <View className="relative mb-2">
        <Ionicons
          name={icon}
          size={24}
          color={isActive ? "#0ea5e9" : "#64748b"}
        />
        {hasNotification && (
          <View className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary" />
        )}
      </View>
      <Text
        className={`text-base font-semibold ${
          isActive ? "text-primary" : "text-foreground"
        }`}
      >
        {title}
      </Text>
      <Text className="text-sm text-muted-foreground">{subtitle}</Text>
    </Pressable>
  );
}
