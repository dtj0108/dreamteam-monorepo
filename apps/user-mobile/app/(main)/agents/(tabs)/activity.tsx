import { useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { ProductSwitcher } from "@/components/ProductSwitcher";
import { Colors } from "@/constants/Colors";
import { ActivityItem, ApprovalItem } from "@/components/agents";
import {
  useAgentActivity,
  usePendingApprovals,
  useApproveExecution,
  useRejectExecution,
} from "@/lib/hooks/useAgentsData";
import type { ScheduleExecutionStatus } from "@/lib/types/agents";

type ActivityTab = "all" | "pending";

const STATUS_FILTERS: {
  label: string;
  value: ScheduleExecutionStatus | undefined;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: "All", value: undefined, icon: "list" },
  { label: "Running", value: "running", icon: "play-circle" },
  { label: "Completed", value: "completed", icon: "checkmark-circle" },
  { label: "Failed", value: "failed", icon: "close-circle" },
];

export default function ActivityScreen() {
  const [activeTab, setActiveTab] = useState<ActivityTab>("all");
  const [statusFilter, setStatusFilter] = useState<ScheduleExecutionStatus | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  // Activity data
  const {
    data: activityData,
    isLoading: activityLoading,
    refetch: refetchActivity,
  } = useAgentActivity({ status: statusFilter });

  // Pending approvals data
  const {
    data: pendingData,
    isLoading: pendingLoading,
    refetch: refetchPending,
  } = usePendingApprovals();

  // Mutations for pending approvals
  const approveMutation = useApproveExecution();
  const rejectMutation = useRejectExecution();

  const pendingCount = pendingData?.executions.length || 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchActivity(), refetchPending()]);
    setRefreshing(false);
  };

  const handleApprove = async (id: string) => {
    try {
      await approveMutation.mutateAsync(id);
      Alert.alert("Success", "Execution approved");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to approve");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectMutation.mutateAsync({ id });
    } catch (error: any) {
      console.error("Failed to reject:", error);
    }
  };

  const toggleDropdown = (open: boolean) => {
    setDropdownOpen(open);
    Animated.spring(dropdownAnim, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  };

  const selectFilter = (value: ScheduleExecutionStatus | undefined) => {
    setStatusFilter(value);
    toggleDropdown(false);
  };

  const isLoading = activeTab === "all" ? activityLoading : pendingLoading;

  const cardShadow = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  };

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={["top"]} className="bg-neutral-50">
        <View className="px-4 py-2">
          <ProductSwitcher />
        </View>
      </SafeAreaView>

      {/* Header */}
      <View className="px-4 py-4">
        <Text className="text-2xl font-bold text-foreground">Activity</Text>
        <Text className="text-gray-500">Agent tasks and approvals</Text>
      </View>

      {/* Tab Cards - Folder Style */}
      <View className="gap-4 px-4 pb-4">
        {/* All Activity Tab - Folder */}
        <Pressable
          className="relative active:opacity-70"
          onPress={() => setActiveTab("all")}
        >
          {/* Folder tab */}
          <View
            className="absolute left-0 top-0 h-4 w-16 rounded-t-xl"
            style={{
              backgroundColor: activeTab === "all" ? Colors.primary : "#e5e5e5",
            }}
          />
          {/* Folder body */}
          <View
            className="mt-2 flex-row items-center rounded-2xl rounded-tl-none p-4"
            style={{
              backgroundColor: activeTab === "all" ? Colors.primary : "#f5f5f5",
              ...cardShadow,
            }}
          >
            <View
              className={`h-10 w-10 items-center justify-center rounded-xl ${
                activeTab === "all" ? "bg-white/20" : "bg-white"
              }`}
            >
              <Ionicons
                name="list"
                size={20}
                color={activeTab === "all" ? "#fff" : Colors.foreground}
              />
            </View>
            <View className="ml-3 flex-1">
              <Text
                className={`text-base font-semibold ${
                  activeTab === "all" ? "text-white" : "text-foreground"
                }`}
              >
                All Activity
              </Text>
              <Text
                className={`text-sm ${
                  activeTab === "all" ? "text-white/70" : "text-gray-500"
                }`}
              >
                View all agent tasks
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={activeTab === "all" ? "#fff" : "#d1d5db"}
            />
          </View>
        </Pressable>

        {/* Pending Tab - Folder */}
        <Pressable
          className="relative active:opacity-70"
          onPress={() => setActiveTab("pending")}
        >
          {/* Folder tab */}
          <View
            className="absolute left-0 top-0 h-4 w-16 rounded-t-xl"
            style={{
              backgroundColor: activeTab === "pending" ? Colors.primary : pendingCount > 0 ? "#f59e0b" : "#d4d4d4",
            }}
          />
          {/* Folder body */}
          <View
            className="mt-2 flex-row items-center rounded-2xl rounded-tl-none p-4"
            style={{
              backgroundColor: activeTab === "pending" ? Colors.primary : "#e5e5e5",
              ...cardShadow,
            }}
          >
            <View
              className={`h-10 w-10 items-center justify-center rounded-xl ${
                activeTab === "pending" ? "bg-white/20" : "bg-white"
              }`}
            >
              <Ionicons
                name="time"
                size={20}
                color={activeTab === "pending" ? "#fff" : "#f59e0b"}
              />
            </View>
            <View className="ml-3 flex-1">
              <Text
                className={`text-base font-semibold ${
                  activeTab === "pending" ? "text-white" : "text-foreground"
                }`}
              >
                Pending Approvals
              </Text>
              <Text
                className={`text-sm ${
                  activeTab === "pending" ? "text-white/70" : "text-gray-500"
                }`}
              >
                Tasks waiting for your review
              </Text>
            </View>
            {pendingCount > 0 && (
              <View
                className={`mr-2 h-6 min-w-[24px] items-center justify-center rounded-full px-2 ${
                  activeTab === "pending" ? "bg-white/20" : "bg-amber-500"
                }`}
              >
                <Text className="text-xs font-bold text-white">{pendingCount}</Text>
              </View>
            )}
            <Ionicons
              name="chevron-forward"
              size={20}
              color={activeTab === "pending" ? "#fff" : "#d1d5db"}
            />
          </View>
        </Pressable>
      </View>

      {/* Status Filter Dropdown (only for All Activity tab) */}
      {activeTab === "all" && (
        <View className="mb-4 px-4">
          {/* Dropdown Button */}
          <Pressable
            className="flex-row items-center justify-between rounded-xl bg-white px-4 py-3 active:opacity-70"
            style={cardShadow}
            onPress={() => toggleDropdown(!dropdownOpen)}
          >
            <View className="flex-row items-center">
              <Ionicons
                name={STATUS_FILTERS.find((f) => f.value === statusFilter)?.icon || "list"}
                size={18}
                color={Colors.foreground}
              />
              <Text className="ml-2 text-base font-medium text-foreground">
                {STATUS_FILTERS.find((f) => f.value === statusFilter)?.label || "All"}
              </Text>
            </View>
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: dropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "180deg"],
                    }),
                  },
                ],
              }}
            >
              <Ionicons name="chevron-down" size={18} color="#9ca3af" />
            </Animated.View>
          </Pressable>

          {/* Dropdown Options */}
          {dropdownOpen && (
            <Animated.View
              className="mt-2 overflow-hidden rounded-xl bg-white"
              style={[
                cardShadow,
                {
                  opacity: dropdownAnim,
                  transform: [
                    {
                      scale: dropdownAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.95, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {STATUS_FILTERS.map((f, index) => (
                <Pressable
                  key={f.label}
                  className={`flex-row items-center px-4 py-3 active:bg-neutral-100 ${
                    index < STATUS_FILTERS.length - 1 ? "border-b border-neutral-100" : ""
                  }`}
                  onPress={() => selectFilter(f.value)}
                >
                  <View
                    className={`h-8 w-8 items-center justify-center rounded-lg ${
                      statusFilter === f.value ? "bg-primary" : "bg-neutral-100"
                    }`}
                  >
                    <Ionicons
                      name={f.icon}
                      size={16}
                      color={statusFilter === f.value ? "#fff" : Colors.foreground}
                    />
                  </View>
                  <Text
                    className={`ml-3 flex-1 text-base ${
                      statusFilter === f.value
                        ? "font-semibold text-primary"
                        : "text-foreground"
                    }`}
                  >
                    {f.label}
                  </Text>
                  {statusFilter === f.value && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  )}
                </Pressable>
              ))}
            </Animated.View>
          )}
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : activeTab === "all" ? (
        // All Activity List
        activityData?.executions.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <View
              className="h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: Colors.primary + "15" }}
            >
              <Ionicons name="list" size={36} color={Colors.primary} />
            </View>
            <Text className="mt-6 text-xl font-semibold text-foreground">
              No activity yet
            </Text>
            <Text className="mt-2 text-center leading-relaxed text-gray-500">
              When your agents complete tasks, they'll appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={activityData?.executions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 12 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderItem={({ item }) => (
              <View className="overflow-hidden rounded-2xl bg-white" style={cardShadow}>
                <ActivityItem execution={item} isLast />
              </View>
            )}
            ListHeaderComponent={<View className="h-2" />}
          />
        )
      ) : (
        // Pending Approvals List
        pendingData?.executions.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <View
              className="h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: Colors.success + "15" }}
            >
              <Ionicons name="checkmark" size={36} color={Colors.success} />
            </View>
            <Text className="mt-6 text-xl font-semibold text-foreground">
              All caught up!
            </Text>
            <Text className="mt-2 text-center leading-relaxed text-gray-500">
              No pending approvals at the moment
            </Text>
          </View>
        ) : (
          <FlatList
            data={pendingData?.executions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 12 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderItem={({ item }) => (
              <View className="overflow-hidden rounded-2xl bg-white" style={cardShadow}>
                <ApprovalItem
                  execution={item}
                  onApprove={() => handleApprove(item.id)}
                  onReject={() => handleReject(item.id)}
                  isLoading={approveMutation.isPending || rejectMutation.isPending}
                  isLast
                />
              </View>
            )}
            ListHeaderComponent={<View className="h-2" />}
          />
        )
      )}
    </View>
  );
}
