import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

import { ProductSwitcher } from "@/components/ProductSwitcher";
import { Colors } from "@/constants/Colors";
import { AgentCardGrid, EmptyState } from "@/components/agents";
import { useHiredAgents } from "@/lib/hooks/useAgentsData";

export default function MyAgentsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useHiredAgents();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleAgentPress = (agentId: string) => {
    router.push(`/(main)/agents/${agentId}` as any);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-background">
        <SafeAreaView edges={["top"]} className="bg-background">
          <View className="px-4 py-2">
            <ProductSwitcher />
          </View>
        </SafeAreaView>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (!data?.agents.length) {
    return (
      <View className="flex-1 bg-background">
        <SafeAreaView edges={["top"]} className="bg-background">
          <View className="px-4 py-2">
            <ProductSwitcher />
          </View>
        </SafeAreaView>
        <View className="flex-1 items-center justify-center px-4">
          <View
            className="h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: Colors.primary + "20" }}
          >
            <FontAwesome name="users" size={36} color={Colors.primary} />
          </View>
          <Text className="mt-4 text-xl font-semibold text-foreground">
            No agents hired yet
          </Text>
          <Text className="mt-2 text-center text-muted-foreground">
            Discover and hire AI agents to help automate your work
          </Text>
          <Pressable
            className="mt-6 flex-row items-center rounded-xl bg-primary px-6 py-3 active:opacity-70"
            onPress={() => router.push("/(main)/agents/discover" as any)}
          >
            <FontAwesome name="search" size={16} color="#fff" />
            <Text className="ml-2 font-medium text-white">
              Browse Agents
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={["top"]} className="bg-background">
        <View className="px-4 py-2">
          <ProductSwitcher />
        </View>
      </SafeAreaView>

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4">
        <View>
          <Text className="text-2xl font-bold text-foreground">My Agents</Text>
          <Text className="text-muted-foreground">
            {data.agents.length} agent{data.agents.length !== 1 ? "s" : ""} hired
          </Text>
        </View>
        <Pressable
          className="flex-row items-center rounded-xl bg-primary px-4 py-2.5 active:opacity-70"
          onPress={() => router.push("/(main)/agents/discover" as any)}
        >
          <FontAwesome name="plus" size={14} color="#fff" />
          <Text className="ml-2 text-sm font-medium text-white">
            Discover
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={data.agents}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        columnWrapperStyle={{ gap: 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <AgentCardGrid
            agent={item}
            stats={{
              conversations: 0,
              completed: 0,
              scheduled: 0,
            }}
            onPress={() => handleAgentPress(item.id)}
          />
        )}
      />
    </View>
  );
}
