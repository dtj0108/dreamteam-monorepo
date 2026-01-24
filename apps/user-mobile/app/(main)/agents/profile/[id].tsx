import { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Animated,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import LottieView from "lottie-react-native";

import { Colors } from "@/constants/Colors";
import { useAgentDetail, useAgentTools, useHireAgent } from "@/lib/hooks/useAgentsData";
import type { AgentTool, ToolCategory } from "@/lib/types/agents";
import { HireDialog } from "@/components/agents";
import { useState } from "react";

// Category display configuration
const categoryConfig: Record<ToolCategory, { emoji: string; label: string; color: string }> = {
  finance: { emoji: "💰", label: "Finance", color: "#22c55e" },
  crm: { emoji: "🤝", label: "Sales", color: "#f97316" },
  team: { emoji: "💬", label: "Team", color: "#8b5cf6" },
  projects: { emoji: "📋", label: "Projects", color: "#0ea5e9" },
  knowledge: { emoji: "📖", label: "Knowledge", color: "#ec4899" },
  communications: { emoji: "📧", label: "Communications", color: "#14b8a6" },
  goals: { emoji: "🎯", label: "Goals", color: "#eab308" },
  agents: { emoji: "🤖", label: "Agents", color: "#6366f1" },
};

// Skeleton loading card component
function SkeletonToolCard({ delay = 0 }: { delay?: number }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim, delay]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={{ opacity }}
      className="mr-3 h-20 w-28 rounded-xl bg-gray-200"
    />
  );
}

// Tool category card component
function ToolCategoryCard({
  category,
  tools,
}: {
  category: ToolCategory;
  tools: AgentTool[];
}) {
  const config = categoryConfig[category] || {
    emoji: "🔧",
    label: category,
    color: Colors.mutedForeground,
  };

  return (
    <View
      className="mr-3 rounded-xl p-3"
      style={{ backgroundColor: config.color + "15", minWidth: 110 }}
    >
      <Text className="text-2xl">{config.emoji}</Text>
      <Text className="mt-1 font-medium text-foreground">{config.label}</Text>
      <Text className="text-sm text-muted-foreground">
        {tools.length} {tools.length === 1 ? "tool" : "tools"}
      </Text>
    </View>
  );
}

export default function AgentProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showHireDialog, setShowHireDialog] = useState(false);

  const { data, isLoading, error } = useAgentDetail(id);
  const { data: tools, isLoading: toolsLoading } = useAgentTools(id || null);
  const hireMutation = useHireAgent();

  const agent = data?.agent;
  const isHired = data?.isHired ?? false;
  const localAgentId = data?.localAgent?.id;

  // Group tools by category
  const toolsByCategory = useMemo(() => {
    if (!tools) return new Map<ToolCategory, AgentTool[]>();

    const grouped = new Map<ToolCategory, AgentTool[]>();
    tools.forEach((tool) => {
      const existing = grouped.get(tool.category) || [];
      grouped.set(tool.category, [...existing, tool]);
    });
    return grouped;
  }, [tools]);

  const hasUserDescription =
    agent?.user_description &&
    agent.user_description !== agent.description;
  const hasTechnicalDescription =
    agent?.description && agent.description !== agent.user_description;

  const handleStartChat = () => {
    if (localAgentId) {
      router.push(`/(main)/agents/${localAgentId}` as any);
    } else if (id) {
      router.push(`/(main)/agents/${id}` as any);
    }
  };

  const handleHire = async () => {
    if (!agent) return;
    try {
      await hireMutation.mutateAsync(agent.id);
      setShowHireDialog(false);
      Alert.alert("Success", `${agent.name} has been hired!`);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to hire agent");
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-background">
        <SafeAreaView edges={["top"]} className="bg-background">
          <View className="flex-row items-center px-4 py-3">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
              style={{ backgroundColor: "rgba(0,0,0,0.05)" }}
            >
              <Ionicons name="chevron-back" size={24} color={Colors.foreground} />
            </Pressable>
          </View>
        </SafeAreaView>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (error || !agent) {
    return (
      <View className="flex-1 bg-background">
        <SafeAreaView edges={["top"]} className="bg-background">
          <View className="flex-row items-center px-4 py-3">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
              style={{ backgroundColor: "rgba(0,0,0,0.05)" }}
            >
              <Ionicons name="chevron-back" size={24} color={Colors.foreground} />
            </Pressable>
          </View>
        </SafeAreaView>
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle" size={48} color={Colors.destructive} />
          <Text className="mt-4 text-center text-lg font-medium text-foreground">
            Agent not found
          </Text>
          <Text className="mt-2 text-center text-muted-foreground">
            This agent may no longer be available.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-6 rounded-xl bg-primary px-6 py-3 active:opacity-70"
          >
            <Text className="font-medium text-white">Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={["top"]} className="bg-background">
        <View className="flex-row items-center px-4 py-3">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: "rgba(0,0,0,0.05)" }}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.foreground} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar and Name Header */}
        <View className="items-center px-4 pt-4 pb-6">
          {agent.avatar_url ? (
            <View className="h-24 w-24 items-center justify-center rounded-2xl bg-muted overflow-hidden">
              <Image
                source={{ uri: agent.avatar_url }}
                className="h-24 w-24 rounded-2xl"
              />
            </View>
          ) : (
            <LottieView
              source={require("@/ai-sphere-animation.json")}
              autoPlay
              loop
              style={{ width: 180, height: 180 }}
            />
          )}

          <Text className="mt-4 text-2xl font-bold text-foreground">
            {agent.name}
          </Text>

          {agent.department && (
            <Text className="mt-1 text-muted-foreground">
              {agent.department.name}
            </Text>
          )}

          {isHired && (
            <View className="mt-3 flex-row items-center rounded-full bg-green-100 px-3 py-1.5">
              <FontAwesome name="check" size={12} color={Colors.success} />
              <Text className="ml-2 text-sm font-medium" style={{ color: Colors.success }}>
                Hired
              </Text>
            </View>
          )}
        </View>

        {/* What I do section */}
        <View className="mx-4 rounded-2xl bg-muted p-4">
          <Text className="mb-2 text-lg font-semibold text-foreground">
            What I do
          </Text>
          <Text className="leading-6 text-muted-foreground">
            {agent.user_description ||
              agent.description ||
              "This agent can help you with various tasks."}
          </Text>
        </View>

        {/* Technical Details section (if different from user_description) */}
        {hasUserDescription && hasTechnicalDescription && (
          <View className="mx-4 mt-4 rounded-2xl bg-muted p-4">
            <Text className="mb-2 text-lg font-semibold text-foreground">
              Technical Details
            </Text>
            <Text className="leading-6 text-muted-foreground">
              {agent.description}
            </Text>
          </View>
        )}

        {/* Tools & Capabilities section */}
        <View className="mt-6">
          <Text className="mb-3 px-4 text-lg font-semibold text-foreground">
            Tools & Capabilities
          </Text>

          {toolsLoading ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              <SkeletonToolCard delay={0} />
              <SkeletonToolCard delay={100} />
              <SkeletonToolCard delay={200} />
            </ScrollView>
          ) : toolsByCategory.size === 0 ? (
            <View className="mx-4 items-center rounded-xl bg-muted py-6">
              <Ionicons
                name="construct-outline"
                size={28}
                color={Colors.mutedForeground}
              />
              <Text className="mt-2 text-muted-foreground">
                No tools configured
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {Array.from(toolsByCategory.entries()).map(([category, categoryTools]) => (
                <ToolCategoryCard
                  key={category}
                  category={category}
                  tools={categoryTools}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      <SafeAreaView edges={["bottom"]} className="absolute bottom-0 left-0 right-0 bg-background">
        <View className="px-4 pb-4 pt-2 border-t border-gray-100">
          {isHired ? (
            <Pressable
              className="items-center rounded-xl bg-primary py-4 active:opacity-70"
              onPress={handleStartChat}
            >
              <View className="flex-row items-center">
                <Ionicons name="chatbubble" size={18} color="#fff" />
                <Text className="ml-2 font-semibold text-white">
                  Start Chat
                </Text>
              </View>
            </Pressable>
          ) : (
            <Pressable
              className="items-center rounded-xl bg-primary py-4 active:opacity-70"
              onPress={() => setShowHireDialog(true)}
            >
              <View className="flex-row items-center">
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text className="ml-2 font-semibold text-white">
                  Hire Agent
                </Text>
              </View>
            </Pressable>
          )}
        </View>
      </SafeAreaView>

      {/* Hire Dialog */}
      <HireDialog
        agent={agent as any}
        visible={showHireDialog}
        onClose={() => setShowHireDialog(false)}
        onHire={handleHire}
        isLoading={hireMutation.isPending}
      />
    </View>
  );
}
