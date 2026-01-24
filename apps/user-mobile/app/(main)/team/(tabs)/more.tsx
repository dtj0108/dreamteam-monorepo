import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { ProductSwitcher } from "@/components/ProductSwitcher";

interface SettingsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
}

function SettingsItem({ icon, title, subtitle, onPress }: SettingsItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-xl bg-white p-4 mb-2"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
        <Ionicons name={icon} size={20} color="#64748b" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-base font-medium text-foreground">{title}</Text>
        {subtitle && (
          <Text className="text-sm text-muted-foreground">{subtitle}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#64748b" />
    </Pressable>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header with ProductSwitcher */}
      <View className="px-4 py-2">
        <ProductSwitcher />
      </View>

      <ScrollView className="flex-1">
      <View className="px-4 py-6">
        <Text className="mb-4 text-2xl font-bold text-foreground">More</Text>

        <View className="mb-6">
          <Text className="mb-2 px-1 text-sm font-medium uppercase text-muted-foreground">
            Preferences
          </Text>
          <SettingsItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Manage notification settings"
          />
          <SettingsItem
            icon="moon-outline"
            title="Do Not Disturb"
            subtitle="Pause notifications"
          />
          <SettingsItem
            icon="color-palette-outline"
            title="Appearance"
            subtitle="Theme and display options"
          />
        </View>

        <View className="mb-6">
          <Text className="mb-2 px-1 text-sm font-medium uppercase text-muted-foreground">
            Workspace
          </Text>
          <SettingsItem
            icon="people-outline"
            title="Members"
            subtitle="View workspace members"
          />
          <SettingsItem
            icon="settings-outline"
            title="Workspace Settings"
            subtitle="Manage workspace preferences"
          />
        </View>

        <View>
          <Text className="mb-2 px-1 text-sm font-medium uppercase text-muted-foreground">
            About
          </Text>
          <SettingsItem
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Get help with dreamteam"
          />
          <SettingsItem
            icon="information-circle-outline"
            title="About"
            subtitle="Version 1.0.0"
          />
        </View>
      </View>
      </ScrollView>
    </View>
  );
}
