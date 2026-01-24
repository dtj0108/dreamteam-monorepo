import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { ScrollView, View, Text, Pressable, Switch, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useEffect } from "react";

import { Colors } from "@/constants/Colors";
import { useNotifications } from "@/providers/notification-provider";

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { preferences, updatePreferences, expoPushToken, requestPermissions } =
    useNotifications();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (
    key: keyof typeof preferences,
    value: boolean
  ) => {
    setIsLoading(true);
    try {
      await updatePreferences({ [key]: value });
    } catch (error) {
      console.error("Failed to update preference:", error);
      Alert.alert("Error", "Failed to update notification settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const token = await requestPermissions();
      if (!token) {
        Alert.alert(
          "Notifications Disabled",
          "Please enable notifications in your device settings to receive push notifications.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Failed to enable notifications:", error);
      Alert.alert("Error", "Failed to enable notifications");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      {/* Header */}
      <View className="flex-row items-center px-4 pt-4 pb-2">
        <Pressable
          onPress={() => router.back()}
          className="mr-3 rounded-full p-2 active:bg-muted"
        >
          <FontAwesome name="arrow-left" size={18} color={Colors.foreground} />
        </Pressable>
        <Text className="text-xl font-bold text-foreground">Notifications</Text>
      </View>

      {/* Push Notification Status */}
      {!expoPushToken && (
        <View className="mx-4 mt-4 rounded-2xl bg-amber-50 p-4">
          <View className="flex-row items-start">
            <FontAwesome
              name="exclamation-triangle"
              size={18}
              color="#d97706"
            />
            <View className="ml-3 flex-1">
              <Text className="font-semibold text-amber-800">
                Push Notifications Disabled
              </Text>
              <Text className="mt-1 text-sm text-amber-700">
                Enable push notifications to receive alerts for messages,
                mentions, and tasks.
              </Text>
              <Pressable
                onPress={handleEnableNotifications}
                disabled={isLoading}
                className="mt-3 self-start rounded-lg bg-amber-600 px-4 py-2 active:bg-amber-700"
              >
                <Text className="font-semibold text-white">
                  Enable Notifications
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Master Toggle Section */}
      <View className="mx-4 mt-6">
        <Text className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          General
        </Text>
        <View className="rounded-2xl bg-white shadow-sm">
          <SettingToggle
            icon="bell"
            label="Push Notifications"
            description="Receive notifications on this device"
            value={preferences.enabled}
            onValueChange={(value) => handleToggle("enabled", value)}
            disabled={isLoading || !expoPushToken}
          />
          <Divider />
          <SettingToggle
            icon="volume-up"
            label="Notification Sound"
            description="Play a sound when notifications arrive"
            value={preferences.sound}
            onValueChange={(value) => handleToggle("sound", value)}
            disabled={isLoading || !preferences.enabled}
          />
        </View>
      </View>

      {/* Notification Categories */}
      <View className="mx-4 mt-6">
        <Text className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Categories
        </Text>
        <View className="rounded-2xl bg-white shadow-sm">
          <SettingToggle
            icon="comments"
            label="Messages"
            description="New messages in channels and DMs"
            value={preferences.messages}
            onValueChange={(value) => handleToggle("messages", value)}
            disabled={isLoading || !preferences.enabled}
          />
          <Divider />
          <SettingToggle
            icon="at"
            label="Mentions"
            description="When someone mentions you"
            value={preferences.mentions}
            onValueChange={(value) => handleToggle("mentions", value)}
            disabled={isLoading || !preferences.enabled}
          />
          <Divider />
          <SettingToggle
            icon="check-square"
            label="Tasks"
            description="Task assignments and updates"
            value={preferences.tasks}
            onValueChange={(value) => handleToggle("tasks", value)}
            disabled={isLoading || !preferences.enabled}
          />
          <Divider />
          <SettingToggle
            icon="clock-o"
            label="Reminders"
            description="Scheduled reminders and due dates"
            value={preferences.reminders}
            onValueChange={(value) => handleToggle("reminders", value)}
            disabled={isLoading || !preferences.enabled}
          />
        </View>
      </View>

      {/* Debug Info (only show if token exists) */}
      {expoPushToken && (
        <View className="mx-4 mt-6">
          <Text className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Device Info
          </Text>
          <View className="rounded-2xl bg-white p-4 shadow-sm">
            <Text className="text-xs text-muted-foreground">Push Token</Text>
            <Text
              className="mt-1 text-xs text-foreground"
              numberOfLines={2}
              ellipsizeMode="middle"
            >
              {expoPushToken}
            </Text>
          </View>
        </View>
      )}

      {/* Help Text */}
      <View className="mx-4 mt-6 px-2">
        <Text className="text-center text-xs text-muted-foreground">
          Notification settings are stored on this device. Changes will not sync
          across your other devices.
        </Text>
      </View>
    </ScrollView>
  );
}

interface SettingToggleProps {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

function SettingToggle({
  icon,
  label,
  description,
  value,
  onValueChange,
  disabled,
}: SettingToggleProps) {
  return (
    <View
      className={`flex-row items-center px-4 py-3.5 ${disabled ? "opacity-50" : ""}`}
    >
      <View className="h-8 w-8 items-center justify-center rounded-lg bg-muted">
        <FontAwesome name={icon} size={16} color={Colors.mutedForeground} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-base text-foreground">{label}</Text>
        <Text className="text-xs text-muted-foreground">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: Colors.muted, true: Colors.primary }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

function Divider() {
  return <View className="ml-14 h-px bg-border" />;
}
