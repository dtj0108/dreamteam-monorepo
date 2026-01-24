import { View, Text, Pressable, Image, Modal, ScrollView } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";
import type { AgentWithHireStatus } from "@/lib/types/agents";

interface HireDialogProps {
  agent: AgentWithHireStatus | null;
  visible: boolean;
  onClose: () => void;
  onHire: () => void;
  isLoading?: boolean;
}

export function HireDialog({
  agent,
  visible,
  onClose,
  onHire,
  isLoading,
}: HireDialogProps) {
  if (!agent) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/50 px-6"
        onPress={onClose}
      >
        <Pressable
          className="w-full max-w-sm rounded-2xl bg-background p-6"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-xl bg-muted">
              {agent.avatar_url ? (
                <Image
                  source={{ uri: agent.avatar_url }}
                  className="h-12 w-12 rounded-xl"
                />
              ) : (
                <Text className="text-2xl">✨</Text>
              )}
            </View>
            <Text className="ml-3 flex-1 text-lg font-semibold text-foreground">
              Hire {agent.name}?
            </Text>
            <Pressable onPress={onClose} className="p-2">
              <FontAwesome name="times" size={20} color={Colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Description */}
          <Text className="mt-4 text-muted-foreground">
            {agent.user_description || agent.description || "This agent can help you with various tasks."}
          </Text>

          {/* System prompt preview */}
          <View className="mt-4 rounded-lg bg-muted p-3">
            <Text className="text-sm font-medium text-foreground">
              This agent can help with:
            </Text>
            <ScrollView className="mt-2 max-h-24">
              <Text className="text-sm text-muted-foreground" numberOfLines={4}>
                {agent.system_prompt?.substring(0, 200) || "General assistance"}
                {(agent.system_prompt?.length || 0) > 200 && "..."}
              </Text>
            </ScrollView>
          </View>

          {/* Buttons */}
          <View className="mt-6 flex-row gap-3">
            <Pressable
              className="flex-1 items-center rounded-lg border border-border py-3 active:opacity-70"
              onPress={onClose}
              disabled={isLoading}
            >
              <Text className="font-medium text-foreground">Cancel</Text>
            </Pressable>
            <Pressable
              className="flex-1 items-center rounded-lg bg-primary py-3 active:opacity-70"
              onPress={onHire}
              disabled={isLoading}
            >
              <Text className="font-medium text-white">
                {isLoading ? "Hiring..." : "Hire Agent"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
