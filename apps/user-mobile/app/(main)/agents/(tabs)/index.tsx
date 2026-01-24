import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

import { ProductSwitcher } from "@/components/ProductSwitcher";
import { Colors } from "@/constants/Colors";
import { StatCard, ActivityItem, ApprovalItem } from "@/components/agents";
import {
  useDashboardStats,
  useHiredAgents,
  useAgentActivity,
  usePendingApprovals,
  useApproveExecution,
  useRejectExecution,
} from "@/lib/hooks/useAgentsData";

export default function AgentsHomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Queries
  const { data: stats, refetch: refetchStats, isLoading: statsLoading } = useDashboardStats();
  const { data: hiredAgents, refetch: refetchHired } = useHiredAgents();
  const { data: activity, refetch: refetchActivity } = useAgentActivity({ limit: 5 });
  const { data: pending, refetch: refetchPending } = usePendingApprovals();

  // Mutations
  const approveMutation = useApproveExecution();
  const rejectMutation = useRejectExecution();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchStats(),
      refetchHired(),
      refetchActivity(),
      refetchPending(),
    ]);
    setRefreshing(false);
  };

  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleReject = (id: string) => {
    rejectMutation.mutate({ id });
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
          <Text className="text-2xl font-bold text-foreground">Dashboard</Text>
          <Text className="text-muted-foreground">
            Your AI agents and their activity
          </Text>
        </View>

        {/* Stat Cards */}
        {statsLoading ? (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <View className="mb-4">
            <View className="flex-row gap-3">
              <StatCard
                label="Hired Agents"
                value={stats?.hiredAgents || 0}
                icon="users"
                color={Colors.primary}
                href="/(main)/agents/my-agents"
              />
              <StatCard
                label="Pending"
                value={stats?.pendingApprovals || 0}
                icon="clock-o"
                color={Colors.warning}
                href="/(main)/agents/activity"
                showAlert={(stats?.pendingApprovals || 0) > 0}
              />
            </View>
            <View className="mt-3 flex-row gap-3">
              <StatCard
                label="Completed"
                value={stats?.completedTasks || 0}
                icon="check-circle"
                color={Colors.success}
                href="/(main)/agents/activity"
              />
              <StatCard
                label="Schedules"
                value={stats?.activeSchedules || 0}
                icon="calendar"
                color="#8b5cf6"
                href="/(main)/agents/more"
              />
            </View>
          </View>
        )}

        {/* Recent Activity */}
        <View className="mb-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-foreground">
              Recent Activity
            </Text>
            <Pressable
              onPress={() => router.push("/(main)/agents/activity" as any)}
            >
              <Text className="text-sm text-primary">View All</Text>
            </Pressable>
          </View>

          {activity?.executions.length === 0 ? (
            <View className="rounded-xl bg-muted p-4">
              <Text className="text-center text-muted-foreground">
                No recent activity
              </Text>
              <Text className="mt-1 text-center text-sm text-muted-foreground">
                Activity from your agents will appear here
              </Text>
            </View>
          ) : (
            <View className="overflow-hidden rounded-xl bg-muted">
              {activity?.executions.slice(0, 5).map((exec, index) => (
                <ActivityItem
                  key={exec.id}
                  execution={exec}
                  isLast={index === Math.min(activity.executions.length, 5) - 1}
                />
              ))}
            </View>
          )}
        </View>

        {/* Pending Approvals */}
        {(pending?.executions.length || 0) > 0 && (
          <View className="mb-4">
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Text className="text-lg font-semibold text-foreground">
                  Pending Approvals
                </Text>
                <View className="ml-2 h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5">
                  <Text className="text-xs font-bold text-white">
                    {pending?.executions.length}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => router.push("/(main)/agents/activity" as any)}
              >
                <Text className="text-sm text-primary">View All</Text>
              </Pressable>
            </View>
            <View className="overflow-hidden rounded-xl bg-muted">
              {pending?.executions.slice(0, 3).map((exec, index) => (
                <ApprovalItem
                  key={exec.id}
                  execution={exec}
                  onApprove={() => handleApprove(exec.id)}
                  onReject={() => handleReject(exec.id)}
                  isLoading={
                    approveMutation.isPending || rejectMutation.isPending
                  }
                  isLast={index === Math.min(pending.executions.length, 3) - 1}
                />
              ))}
            </View>
          </View>
        )}

        {/* My Agents Preview */}
        <View className="mb-8">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-foreground">
              My Agents
            </Text>
            <Pressable
              onPress={() => router.push("/(main)/agents/my-agents" as any)}
            >
              <Text className="text-sm text-primary">View All</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
            style={{ marginHorizontal: -16 }}
            contentInset={{ left: 16, right: 16 }}
            contentOffset={{ x: -16, y: 0 }}
          >
            {hiredAgents?.agents.slice(0, 3).map((agent) => (
              <Pressable
                key={agent.id}
                className="w-36 rounded-xl bg-muted p-3 active:opacity-70"
                onPress={() =>
                  router.push(`/(main)/agents/${agent.localAgentId || agent.id}` as any)
                }
              >
                <View className="h-12 w-12 items-center justify-center rounded-xl bg-background">
                  {agent.avatar_url ? (
                    <Image
                      source={{ uri: agent.avatar_url }}
                      className="h-12 w-12 rounded-xl"
                    />
                  ) : (
                    <Text className="text-2xl">✨</Text>
                  )}
                </View>
                <Text
                  className="mt-2 font-semibold text-foreground"
                  numberOfLines={1}
                >
                  {agent.name}
                </Text>
                <Text className="mt-1 text-xs text-primary">
                  Meet →
                </Text>
              </Pressable>
            ))}
            {/* Discover More Card */}
            <Pressable
              className="w-36 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-3 active:opacity-70"
              onPress={() => router.push("/(main)/agents/discover" as any)}
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: Colors.primary + "20" }}
              >
                <FontAwesome
                  name="plus"
                  size={18}
                  color={Colors.primary}
                />
              </View>
              <Text className="mt-2 text-center text-sm font-medium text-primary">
                Discover More
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}
