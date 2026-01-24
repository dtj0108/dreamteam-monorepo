import { useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  Image,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";
import { useAgentTools } from "@/lib/hooks/useAgentsData";
import type { AgentWithHireStatus, AgentTool, ToolCategory } from "@/lib/types/agents";

interface AgentAboutSheetProps {
  agent: AgentWithHireStatus | null;
  visible: boolean;
  onClose: () => void;
  onHire?: () => void;
  onChat?: () => void;
}

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

export function AgentAboutSheet({
  agent,
  visible,
  onClose,
  onHire,
  onChat,
}: AgentAboutSheetProps) {
  const { data: tools, isLoading: toolsLoading } = useAgentTools(
    visible && agent ? agent.id : null
  );

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

  if (!agent) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="max-h-[80%] rounded-t-3xl bg-neutral-50">
          {/* Drag Handle */}
          <View className="items-center pt-3 pb-1">
            <View className="h-1 w-10 rounded-full bg-gray-300" />
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header with Avatar and Name */}
            <View className="flex-row items-center px-4 py-4">
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-white">
                {agent.avatar_url ? (
                  <Image
                    source={{ uri: agent.avatar_url }}
                    className="h-16 w-16 rounded-2xl"
                  />
                ) : (
                  <Text className="text-3xl">✨</Text>
                )}
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-xl font-bold text-foreground">
                  {agent.name}
                </Text>
                {agent.department && (
                  <Text className="text-muted-foreground">
                    {agent.department.name}
                  </Text>
                )}
              </View>
              <Pressable
                onPress={onClose}
                className="h-8 w-8 items-center justify-center rounded-full active:opacity-70"
                style={{ backgroundColor: "rgba(0,0,0,0.05)" }}
              >
                <Ionicons name="close" size={18} color={Colors.mutedForeground} />
              </Pressable>
            </View>

            {/* Divider */}
            <View className="mx-4 h-px bg-gray-200" />

            {/* What I do section (user_description) */}
            <View className="px-4 py-4">
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
              <View className="px-4 pb-4">
                <Text className="mb-2 text-lg font-semibold text-foreground">
                  Technical Details
                </Text>
                <Text className="leading-6 text-muted-foreground">
                  {agent.description}
                </Text>
              </View>
            )}

            {/* Divider */}
            <View className="mx-4 h-px bg-gray-200" />

            {/* Tools & Capabilities section */}
            <View className="py-4">
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
                <View className="mx-4 items-center rounded-xl bg-gray-100 py-6">
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

            {/* Action Button */}
            <View className="px-4 pt-2">
              {agent.isHired ? (
                <Pressable
                  className="items-center rounded-xl bg-primary py-4 active:opacity-70"
                  onPress={() => {
                    onClose();
                    onChat?.();
                  }}
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
                  onPress={() => {
                    onClose();
                    onHire?.();
                  }}
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
