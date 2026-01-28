import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

export default function NotificationsSettingsScreen() {
  const router = useRouter();

  // In a real app, these would come from a settings API or local storage
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: "budget_warning",
      title: "Budget Warning",
      description: "Alert when spending reaches 80% of budget",
      enabled: true,
    },
    {
      id: "budget_exceeded",
      title: "Budget Exceeded",
      description: "Alert when spending exceeds budget limit",
      enabled: true,
    },
    {
      id: "recurring_reminder",
      title: "Recurring Transaction Reminder",
      description: "Reminder before recurring transactions are created",
      enabled: false,
    },
    {
      id: "subscription_renewal",
      title: "Subscription Renewal",
      description: "Alert before subscription renewals",
      enabled: true,
    },
    {
      id: "large_transaction",
      title: "Large Transaction Alert",
      description: "Alert for transactions over a threshold amount",
      enabled: false,
    },
    {
      id: "weekly_summary",
      title: "Weekly Summary",
      description: "Weekly financial summary digest",
      enabled: true,
    },
    {
      id: "monthly_report",
      title: "Monthly Report Ready",
      description: "Notification when monthly reports are available",
      enabled: true,
    },
  ]);

  const toggleSetting = (id: string) => {
    setSettings((prev) =>
      prev.map((setting) =>
        setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
      )
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View className="flex-row items-center py-4">
          <Pressable onPress={() => router.back()} className="mr-3">
            <FontAwesome name="chevron-left" size={18} color={Colors.primary} />
          </Pressable>
          <View>
            <Text className="text-2xl font-bold text-foreground">
              Notification Settings
            </Text>
            <Text className="text-muted-foreground">
              Manage your finance alerts
            </Text>
          </View>
        </View>

        {/* Push Notifications Banner */}
        <View className="mb-6 flex-row items-center rounded-xl bg-primary/10 p-4">
          <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
            <FontAwesome name="bell" size={18} color={Colors.primary} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-medium text-foreground">
              Push Notifications
            </Text>
            <Text className="text-sm text-muted-foreground">
              Enable in device settings to receive alerts
            </Text>
          </View>
          <FontAwesome name="chevron-right" size={14} color={Colors.primary} />
        </View>

        {/* Budget Alerts Section */}
        <View className="mb-6">
          <Text className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
            Budget Alerts
          </Text>
          <View className="gap-2">
            {settings
              .filter((s) =>
                ["budget_warning", "budget_exceeded"].includes(s.id)
              )
              .map((setting) => (
                <NotificationToggle
                  key={setting.id}
                  setting={setting}
                  onToggle={() => toggleSetting(setting.id)}
                />
              ))}
          </View>
        </View>

        {/* Recurring & Subscriptions Section */}
        <View className="mb-6">
          <Text className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
            Recurring & Subscriptions
          </Text>
          <View className="gap-2">
            {settings
              .filter((s) =>
                ["recurring_reminder", "subscription_renewal"].includes(s.id)
              )
              .map((setting) => (
                <NotificationToggle
                  key={setting.id}
                  setting={setting}
                  onToggle={() => toggleSetting(setting.id)}
                />
              ))}
          </View>
        </View>

        {/* Other Alerts Section */}
        <View className="mb-6">
          <Text className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
            Other Alerts
          </Text>
          <View className="gap-2">
            {settings
              .filter((s) => ["large_transaction"].includes(s.id))
              .map((setting) => (
                <NotificationToggle
                  key={setting.id}
                  setting={setting}
                  onToggle={() => toggleSetting(setting.id)}
                />
              ))}
          </View>
        </View>

        {/* Reports Section */}
        <View className="mb-6">
          <Text className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
            Reports & Summaries
          </Text>
          <View className="gap-2">
            {settings
              .filter((s) =>
                ["weekly_summary", "monthly_report"].includes(s.id)
              )
              .map((setting) => (
                <NotificationToggle
                  key={setting.id}
                  setting={setting}
                  onToggle={() => toggleSetting(setting.id)}
                />
              ))}
          </View>
        </View>

        {/* Info Note */}
        <View className="rounded-xl bg-muted p-4">
          <Text className="text-sm text-muted-foreground">
            Notification preferences are synced across all your devices. Changes
            may take a few minutes to apply.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationToggle({
  setting,
  onToggle,
}: {
  setting: NotificationSetting;
  onToggle: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-xl bg-muted p-4">
      <View className="flex-1 pr-4">
        <Text className="font-medium text-foreground">{setting.title}</Text>
        <Text className="text-sm text-muted-foreground">
          {setting.description}
        </Text>
      </View>
      <Switch
        value={setting.enabled}
        onValueChange={onToggle}
        trackColor={{ false: Colors.mutedForeground, true: Colors.primary }}
        thumbColor="white"
      />
    </View>
  );
}
