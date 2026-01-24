import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GoalCard } from "@/components/finance/GoalCard";
import { Loading } from "@/components/Loading";
import { Colors } from "@/constants/Colors";
import { useGoalsByType } from "@/lib/hooks/useGoals";
import { GOAL_TYPE_COLORS } from "@/lib/types/finance";

export default function ProfitGoalsScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useGoalsByType("profit");
  const [showAchieved, setShowAchieved] = useState(false);

  const allGoals = data?.goals ?? [];
  const activeGoals = allGoals.filter((g) => !g.is_achieved);
  const achievedGoals = allGoals.filter((g) => g.is_achieved);

  const color = GOAL_TYPE_COLORS.profit;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Pressable onPress={() => router.back()}>
          <FontAwesome name="chevron-left" size={18} color={Colors.primary} />
        </Pressable>
        <Text className="text-lg font-semibold text-foreground">
          Profit Goals
        </Text>
        <Pressable
          className="h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: color }}
          onPress={() =>
            router.push("/(main)/finance/goals/new?type=profit")
          }
        >
          <FontAwesome name="plus" size={14} color="white" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {isLoading ? (
          <Loading />
        ) : (
          <>
            {/* Active Goals */}
            <Text className="mb-3 mt-4 text-sm font-medium uppercase text-muted-foreground">
              Active Goals ({activeGoals.length})
            </Text>
            {activeGoals.length > 0 ? (
              <View className="gap-3">
                {activeGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onPress={() =>
                      router.push(`/(main)/finance/goals/${goal.id}`)
                    }
                  />
                ))}
              </View>
            ) : (
              <View className="items-center rounded-xl bg-muted py-8">
                <FontAwesome
                  name="money"
                  size={32}
                  color={Colors.mutedForeground}
                />
                <Text className="mt-2 text-muted-foreground">
                  No active profit goals
                </Text>
                <Pressable
                  className="mt-4 rounded-lg px-4 py-2"
                  style={{ backgroundColor: color }}
                  onPress={() =>
                    router.push("/(main)/finance/goals/new?type=profit")
                  }
                >
                  <Text className="font-medium text-white">Add Goal</Text>
                </Pressable>
              </View>
            )}

            {/* Achieved Goals (Collapsible) */}
            {achievedGoals.length > 0 && (
              <View className="mt-6">
                <Pressable
                  className="flex-row items-center justify-between py-2"
                  onPress={() => setShowAchieved(!showAchieved)}
                >
                  <Text className="text-sm font-medium uppercase text-muted-foreground">
                    Achieved ({achievedGoals.length})
                  </Text>
                  <FontAwesome
                    name={showAchieved ? "chevron-up" : "chevron-down"}
                    size={14}
                    color={Colors.mutedForeground}
                  />
                </Pressable>
                {showAchieved && (
                  <View className="mt-2 gap-3">
                    {achievedGoals.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        onPress={() =>
                          router.push(`/(main)/finance/goals/${goal.id}`)
                        }
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
