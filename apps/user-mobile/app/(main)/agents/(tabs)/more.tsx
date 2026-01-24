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
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { ProductSwitcher } from "@/components/ProductSwitcher";
import { Colors } from "@/constants/Colors";
import { ScheduleItem } from "@/components/agents";
import { useAgentSchedules, useToggleSchedule } from "@/lib/hooks/useAgentsData";

export default function AgentsMoreScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [showSchedules, setShowSchedules] = useState(true);

  const { data: schedulesData, isLoading: schedulesLoading, refetch } = useAgentSchedules();
  const toggleMutation = useToggleSchedule();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await toggleMutation.mutateAsync({ id, enabled });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update schedule");
    }
  };

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={["top"]} className="bg-background">
        <View className="px-4 py-2">
          <ProductSwitcher />
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="py-4">
          <Text className="text-2xl font-bold text-foreground">More</Text>
          <Text className="text-muted-foreground">
            Schedules and settings
          </Text>
        </View>

        {/* Menu Items */}
        <View className="mb-6 gap-3">
          <MenuItem
            icon="cog"
            iconColor="#6b7280"
            title="Agent Settings"
            subtitle="Configure agent preferences"
            onPress={() => {}}
            comingSoon
          />
          <MenuItem
            icon="bell"
            iconColor={Colors.warning}
            title="Notifications"
            subtitle="Manage agent notifications"
            onPress={() => {}}
            comingSoon
          />
          <MenuItem
            icon="question-circle"
            iconColor={Colors.primary}
            title="Help & Support"
            subtitle="Get help with agents"
            onPress={() => {}}
            comingSoon
          />
        </View>

        {/* Schedules Section */}
        <View>
          <Pressable
            className="mb-3 flex-row items-center justify-between"
            onPress={() => setShowSchedules(!showSchedules)}
          >
            <View className="flex-row items-center">
              <View
                className="h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: "#8b5cf6" + "20" }}
              >
                <FontAwesome name="calendar" size={14} color="#8b5cf6" />
              </View>
              <Text className="ml-3 text-lg font-semibold text-foreground">
                Schedules
              </Text>
              {schedulesData?.schedules.length ? (
                <View className="ml-2 rounded-full bg-muted px-2 py-0.5">
                  <Text className="text-xs font-medium text-muted-foreground">
                    {schedulesData.schedules.length}
                  </Text>
                </View>
              ) : null}
            </View>
            <FontAwesome
              name={showSchedules ? "chevron-up" : "chevron-down"}
              size={12}
              color={Colors.mutedForeground}
            />
          </Pressable>

          {showSchedules && (
            <>
              {schedulesLoading ? (
                <View className="items-center py-8">
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              ) : !schedulesData?.schedules.length ? (
                <View className="items-center rounded-xl bg-muted py-8">
                  <View
                    className="h-12 w-12 items-center justify-center rounded-full"
                    style={{ backgroundColor: "#8b5cf6" + "20" }}
                  >
                    <FontAwesome name="calendar-o" size={20} color="#8b5cf6" />
                  </View>
                  <Text className="mt-3 font-medium text-foreground">
                    No schedules configured
                  </Text>
                  <Text className="mt-1 text-sm text-muted-foreground">
                    Set up automated agent tasks
                  </Text>
                </View>
              ) : (
                <View className="overflow-hidden rounded-xl bg-muted">
                  {schedulesData.schedules.map((schedule, index) => (
                    <ScheduleItem
                      key={schedule.id}
                      schedule={schedule}
                      onToggle={(enabled) => handleToggle(schedule.id, enabled)}
                      isLoading={toggleMutation.isPending}
                      isLast={index === schedulesData.schedules.length - 1}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function MenuItem({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
  comingSoon,
}: {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  comingSoon?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-xl bg-muted p-4 active:opacity-70"
      disabled={comingSoon}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: iconColor + "20" }}
      >
        <FontAwesome name={icon} size={18} color={iconColor} />
      </View>
      <View className="ml-3 flex-1">
        <View className="flex-row items-center">
          <Text className="font-medium text-foreground">{title}</Text>
          {comingSoon && (
            <View className="ml-2 rounded bg-muted-foreground/20 px-1.5 py-0.5">
              <Text className="text-xs text-muted-foreground">Soon</Text>
            </View>
          )}
        </View>
        <Text className="mt-0.5 text-sm text-muted-foreground">{subtitle}</Text>
      </View>
      <FontAwesome name="chevron-right" size={14} color={Colors.mutedForeground} />
    </Pressable>
  );
}
