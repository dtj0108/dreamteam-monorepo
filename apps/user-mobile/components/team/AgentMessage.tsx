import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";
import { AgentMessage as AgentMessageType } from "@/lib/types/team";
import { ToolCallCard } from "./ToolCallCard";

interface AgentMessageProps {
  message: AgentMessageType;
  agentName: string;
  agentEmoji: string;
  isStreaming?: boolean;
}

export function AgentMessage({
  message,
  agentName,
  agentEmoji,
  isStreaming = false,
}: AgentMessageProps) {
  const isUser = message.role === "user";
  const hasToolCalls =
    message.tool_calls && message.tool_calls.length > 0;

  return (
    <View className={`mb-4 ${isUser ? "items-end" : "items-start"}`}>
      {/* Message bubble */}
      <View
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser ? "bg-primary" : "bg-muted"
        }`}
      >
        {/* Header for assistant messages */}
        {!isUser && (
          <View className="mb-1 flex-row items-center">
            <Text className="text-lg">{agentEmoji}</Text>
            <Text className="ml-1.5 font-semibold text-foreground">
              {agentName}
            </Text>
          </View>
        )}

        {/* Message content */}
        {message.content ? (
          <Text className={isUser ? "text-white" : "text-foreground"}>
            {message.content}
          </Text>
        ) : isStreaming ? (
          <View className="flex-row items-center">
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text className="ml-2 text-muted-foreground">Thinking...</Text>
          </View>
        ) : null}

        {/* Streaming indicator */}
        {isStreaming && message.content && (
          <View className="mt-1 flex-row items-center">
            <View className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          </View>
        )}

        {/* Tool calls */}
        {hasToolCalls && (
          <View className="mt-3 border-t border-border pt-3">
            {message.tool_calls!.map((toolCall, index) => {
              const toolResult = message.tool_results?.find(
                (r) => r.tool_call_id === toolCall.id
              );
              return (
                <ToolCallCard
                  key={toolCall.id || index}
                  toolCall={{
                    name: toolCall.name,
                    args: toolCall.args,
                    result: toolResult?.result,
                  }}
                />
              );
            })}
          </View>
        )}
      </View>

      {/* Timestamp */}
      <Text className="mt-1 text-xs text-muted-foreground">
        {formatTime(message.created_at)}
      </Text>
    </View>
  );
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
