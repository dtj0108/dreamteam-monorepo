import { View, Text, ScrollView, Pressable } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useNotificationsList } from "../../../../lib/hooks/useProjects";

interface MenuItemProps {
  icon: string;
  iconColor: string;
  title: string;
  description: string;
  onPress?: () => void;
  comingSoon?: boolean;
  badge?: number;
}

function MenuItem({
  icon,
  iconColor,
  title,
  description,
  onPress,
  comingSoon,
  badge,
}: MenuItemProps) {
  return (
    <Pressable
      className="mb-2 flex-row items-center rounded-xl bg-muted p-4 active:opacity-70"
      onPress={onPress}
      disabled={comingSoon}
    >
      <View className="relative">
        <View
          className="h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: iconColor + "20" }}
        >
          <FontAwesome name={icon as any} size={18} color={iconColor} />
        </View>
        {badge !== undefined && badge > 0 && (
          <View className="absolute -top-1 -right-1 h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1">
            <Text className="text-[10px] font-bold text-white">
              {badge > 99 ? "99+" : badge}
            </Text>
          </View>
        )}
      </View>
      <View className="ml-3 flex-1">
        <View className="flex-row items-center">
          <Text className="font-medium text-foreground">{title}</Text>
          {comingSoon && (
            <View className="ml-2 rounded-full bg-gray-200 px-2 py-0.5">
              <Text className="text-[10px] font-medium text-gray-500">
                Coming Soon
              </Text>
            </View>
          )}
        </View>
        <Text className="mt-0.5 text-sm text-muted-foreground">{description}</Text>
      </View>
      <FontAwesome name="chevron-right" size={14} color="#9ca3af" />
    </Pressable>
  );
}

export default function MoreScreen() {
  const router = useRouter();

  // Fetch notifications for badge count
  const { data: notificationsData } = useNotificationsList({ limit: 1 });
  const unreadCount = notificationsData?.unread_count || 0;

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 py-4">
        <Text className="text-2xl font-bold text-foreground">More</Text>
        <Text className="text-sm text-muted-foreground">
          Additional project tools
        </Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Notifications Section */}
        <MenuItem
          icon="bell"
          iconColor="#0ea5e9"
          title="Notifications"
          description="Task updates and mentions"
          badge={unreadCount}
          onPress={() => router.push("/(main)/projects/(tabs)/notifications")}
        />

        {/* Views Section */}
        <Text className="mb-2 mt-4 text-xs font-semibold uppercase text-muted-foreground">
          Views
        </Text>

        <MenuItem
          icon="align-left"
          iconColor="#10b981"
          title="Timeline"
          description="Gantt chart view of projects"
          onPress={() => router.push("/(main)/projects/(tabs)/timeline")}
        />

        {/* Analytics Section */}
        <Text className="mb-2 mt-6 text-xs font-semibold uppercase text-muted-foreground">
          Analytics
        </Text>

        <MenuItem
          icon="users"
          iconColor="#f59e0b"
          title="Workload"
          description="Team capacity and utilization"
          onPress={() => router.push("/(main)/projects/(tabs)/workload")}
        />

        <MenuItem
          icon="bar-chart"
          iconColor="#ef4444"
          title="Reports"
          description="Project analytics and metrics"
          onPress={() => router.push("/(main)/projects/(tabs)/reports")}
        />

        {/* Settings Section */}
        <Text className="mb-2 mt-6 text-xs font-semibold uppercase text-muted-foreground">
          Settings
        </Text>

        <MenuItem
          icon="tags"
          iconColor="#6366f1"
          title="Labels"
          description="Manage project labels"
          comingSoon
        />

        <MenuItem
          icon="cog"
          iconColor="#6b7280"
          title="Preferences"
          description="Project module settings"
          comingSoon
        />
      </ScrollView>
    </View>
  );
}
