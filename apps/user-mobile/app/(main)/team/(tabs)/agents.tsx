import { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { Colors } from "@/constants/Colors";
import { useAgents } from "@/lib/hooks/useTeam";
import { Agent } from "@/lib/types/team";
import { AgentCard } from "@/components/team/AgentCard";

export default function AgentsListScreen() {
  const router = useRouter();

  // Fetch agents
  const {
    data: agentsData,
    isLoading,
    refetch,
  } = useAgents();

  const agents = agentsData?.agents || [];

  // Filter enabled agents
  const enabledAgents = useMemo(() => {
    return agents.filter((a) => a.is_enabled);
  }, [agents]);

  // Handlers
  const handleAgentPress = (agent: Agent) => {
    router.push(`/(main)/team/agents/${agent.id}`);
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 py-4">
        <View>
          <Text className="text-2xl font-bold text-foreground">
            AI Agents
          </Text>
          <Text className="text-sm text-muted-foreground">
            {enabledAgents.length} assistant
            {enabledAgents.length !== 1 ? "s" : ""} available
          </Text>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} />
          }
        >
          {enabledAgents.length === 0 ? (
            <View className="flex-1 items-center justify-center py-12">
              <Text style={{ fontSize: 48 }}>✨</Text>
              <Text className="mt-4 text-lg font-medium text-foreground">
                No agents available
              </Text>
              <Text className="mt-1 text-center text-muted-foreground">
                AI assistants will appear here when enabled
              </Text>
            </View>
          ) : (
            <>
              <Text className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
                Choose an assistant
              </Text>
              {enabledAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onPress={() => handleAgentPress(agent)}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
