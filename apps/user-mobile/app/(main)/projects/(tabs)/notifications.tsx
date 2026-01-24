import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";

import {
  useNotificationsList,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "../../../../lib/hooks/useProjects";
import {
  ProjectNotification,
  getNotificationIcon,
  getNotificationColor,
} from "../../../../lib/types/projects";

export default function NotificationsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch notifications
  const {
    data: notificationsData,
    isLoading,
    refetch,
  } = useNotificationsList({ limit: 50 });
  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unread_count || 0;

  // Mutations
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: ProjectNotification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }

    // Navigate based on notification type
    if (notification.task_id && notification.project_id) {
      router.push({
        pathname: "/(main)/projects/(tabs)/(home)/tasks/[taskId]",
        params: { taskId: notification.task_id, projectId: notification.project_id },
      });
    } else if (notification.project_id) {
      router.push({
        pathname: "/(main)/projects/[id]",
        params: { id: notification.project_id },
      });
    }
  };

  const handleMarkAllRead = () => {
    if (unreadCount > 0) {
      markAllRead.mutate();
    }
  };

  const handleDeleteNotification = (notification: ProjectNotification) => {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteNotification.mutate(notification.id),
        },
      ]
    );
  };

  const formatNotificationTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Notifications",
          headerStyle: { backgroundColor: "#fafafa" },
          headerRight: () =>
            unreadCount > 0 ? (
              <Pressable onPress={handleMarkAllRead} className="mr-2">
                <Text className="font-medium text-primary">Mark all read</Text>
              </Pressable>
            ) : null,
        }}
      />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Stats Header */}
        {notifications.length > 0 && (
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
            <Text className="text-sm text-muted-foreground">
              {notifications.length} notification{notifications.length === 1 ? "" : "s"}
            </Text>
            {unreadCount > 0 && (
              <View className="flex-row items-center">
                <View className="h-2 w-2 rounded-full bg-primary mr-1.5" />
                <Text className="text-sm font-medium text-primary">
                  {unreadCount} unread
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Notifications List */}
        <View className="px-4 pt-2">
          {notifications.length === 0 ? (
            <View className="items-center rounded-xl bg-muted py-12 mt-4">
              <FontAwesome name="bell-o" size={48} color="#d1d5db" />
              <Text className="mt-4 text-lg font-medium text-foreground">
                No notifications
              </Text>
              <Text className="mt-1 text-center text-muted-foreground">
                You're all caught up! Notifications will appear here.
              </Text>
            </View>
          ) : (
            notifications.map((notification, index) => (
              <Pressable
                key={notification.id}
                className={`flex-row items-start py-4 ${
                  index > 0 ? "border-t border-gray-100" : ""
                } ${!notification.is_read ? "bg-primary/5 -mx-4 px-4" : ""}`}
                onPress={() => handleNotificationPress(notification)}
                onLongPress={() => handleDeleteNotification(notification)}
              >
                {/* Icon */}
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${getNotificationColor(notification.type)}20` }}
                >
                  <FontAwesome
                    name={getNotificationIcon(notification.type) as any}
                    size={16}
                    color={getNotificationColor(notification.type)}
                  />
                </View>

                {/* Content */}
                <View className="ml-3 flex-1">
                  <View className="flex-row items-start justify-between">
                    <Text
                      className={`flex-1 ${
                        notification.is_read ? "text-foreground" : "font-semibold text-foreground"
                      }`}
                      numberOfLines={2}
                    >
                      {notification.title}
                    </Text>
                    <Text className="ml-2 text-xs text-muted-foreground">
                      {formatNotificationTime(notification.created_at)}
                    </Text>
                  </View>

                  <Text
                    className="mt-1 text-sm text-muted-foreground"
                    numberOfLines={2}
                  >
                    {notification.body}
                  </Text>

                  {/* Project/Task Context */}
                  {notification.project && (
                    <View className="mt-2 flex-row items-center">
                      <View
                        className="h-3 w-3 rounded"
                        style={{ backgroundColor: notification.project.color }}
                      />
                      <Text className="ml-1.5 text-xs text-muted-foreground" numberOfLines={1}>
                        {notification.project.name}
                        {notification.task && ` / ${notification.task.title}`}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Unread Indicator */}
                {!notification.is_read && (
                  <View className="ml-2 mt-2 h-2 w-2 rounded-full bg-primary" />
                )}
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
