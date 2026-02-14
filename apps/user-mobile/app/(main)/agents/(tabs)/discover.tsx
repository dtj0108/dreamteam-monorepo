import { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

import { ProductSwitcher } from "@/components/ProductSwitcher";
import { Colors } from "@/constants/Colors";
import { AgentCardGrid, HireDialog } from "@/components/agents";
import { useAgentsList, useHireAgent } from "@/lib/hooks/useAgentsData";
import type { AgentWithHireStatus } from "@/lib/types/agents";

export default function DiscoverAgentsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<AgentWithHireStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, error, refetch } = useAgentsList({ search: search || undefined });
  const hireMutation = useHireAgent();

  // Filter agents based on search
  const filteredAgents = useMemo(() => {
    if (!data?.agents) return [];
    if (!search) return data.agents;
    const searchLower = search.toLowerCase();
    return data.agents.filter(
      (a) =>
        a.name.toLowerCase().includes(searchLower) ||
        a.description?.toLowerCase().includes(searchLower)
    );
  }, [data?.agents, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleHire = async () => {
    if (!selectedAgent) return;
    try {
      await hireMutation.mutateAsync(selectedAgent.id);
      setSelectedAgent(null);
      Alert.alert("Success", `${selectedAgent.name} has been hired!`);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to hire agent");
    }
  };

  const handleAgentPress = (agent: AgentWithHireStatus) => {
    router.push(`/(main)/agents/profile/${agent.id}` as any);
  };

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={["top"]} className="bg-background">
        <View className="px-4 py-2">
          <ProductSwitcher />
        </View>
      </SafeAreaView>

      {/* Header */}
      <View className="px-4 py-4">
        <Text className="text-2xl font-bold text-foreground">Discover</Text>
        <Text className="text-muted-foreground">
          Find and hire AI agents for your team
        </Text>
      </View>

      {/* Search */}
      <View className="px-4 pb-4">
        <View className="flex-row items-center rounded-xl bg-muted px-4 py-3">
          <FontAwesome name="search" size={16} color={Colors.mutedForeground} />
          <TextInput
            className="ml-3 flex-1 text-base text-foreground"
            placeholder="Search agents..."
            placeholderTextColor={Colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} className="p-1">
              <FontAwesome
                name="times-circle"
                size={18}
                color={Colors.mutedForeground}
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* Agents Grid */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base font-medium text-foreground">
            Failed to load agents
          </Text>
          <Text className="mt-2 text-center text-muted-foreground">
            {(error as Error)?.message || "Please try again."}
          </Text>
          <Pressable
            className="mt-4 rounded-xl bg-primary px-4 py-2 active:opacity-70"
            onPress={() => refetch()}
          >
            <Text className="font-medium text-white">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredAgents}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          columnWrapperStyle={{ gap: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <View
                className="h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: Colors.primary + "20" }}
              >
                <FontAwesome name="search" size={28} color={Colors.primary} />
              </View>
              <Text className="mt-4 text-lg font-medium text-foreground">
                No agents found
              </Text>
              <Text className="mt-1 text-center text-muted-foreground">
                Try a different search term
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <AgentCardGrid
              agent={item}
              onPress={() => handleAgentPress(item)}
              onHire={() => setSelectedAgent(item)}
            />
          )}
        />
      )}

      {/* Hire Dialog */}
      <HireDialog
        agent={selectedAgent}
        visible={!!selectedAgent}
        onClose={() => setSelectedAgent(null)}
        onHire={handleHire}
        isLoading={hireMutation.isPending}
      />
    </View>
  );
}
