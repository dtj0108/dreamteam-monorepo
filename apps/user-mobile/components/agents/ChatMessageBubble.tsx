import { View, Text, ActivityIndicator } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";
import { TypingIndicator } from "./TypingIndicator";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { MarkdownText } from "./MarkdownText";
import type {
  ChatMessage,
  ChatMessagePart,
  ToolCallPart,
} from "@/lib/types/agents";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  agentName?: string;
  department?: string;
  isStreaming?: boolean;
}

export function ChatMessageBubble({
  message,
  agentName,
  department,
  isStreaming = false,
}: ChatMessageBubbleProps) {
  const isUser = message.role === "user";
  const toolCallParts = message.parts.filter(
    (p): p is ToolCallPart => p.type === "tool-call"
  );
  const hasToolCalls = toolCallParts.length > 0;

  if (isUser) {
    return (
      <View className="mb-4 items-end">
        <View className="max-w-[80%] rounded-2xl rounded-br-md bg-sky-100 px-4 py-3">
          <Text className="text-[15px] leading-relaxed text-slate-800">
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  // Assistant message - ChatGPT style (no bubble, just text)
  return (
    <View className="mb-4 items-start">
      <View className="max-w-[90%] py-2">
        {/* Message content */}
        {message.content ? (
          <MarkdownText content={message.content} />
        ) : isStreaming ? (
          <ThinkingIndicator
            agentName={agentName}
            department={department}
            size="compact"
          />
        ) : null}

        {/* Streaming indicator */}
        {isStreaming && message.content && (
          <View className="mt-2">
            <TypingIndicator size="small" />
          </View>
        )}

        {/* Tool calls */}
        {hasToolCalls && (
          <View className="mt-3 border-t border-gray-100 pt-3">
            {toolCallParts.map((toolCall, index) => (
              <ToolCallCard key={toolCall.toolCallId || index} toolCall={toolCall} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

interface ToolCallCardProps {
  toolCall: ToolCallPart;
}

function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const getStateIcon = () => {
    switch (toolCall.state) {
      case "pending":
        return <FontAwesome name="clock-o" size={12} color="#9ca3af" />;
      case "running":
        return <ActivityIndicator size="small" color={Colors.primary} />;
      case "completed":
        return <FontAwesome name="check-circle" size={12} color="#22c55e" />;
      case "error":
        return <FontAwesome name="times-circle" size={12} color="#ef4444" />;
      default:
        return null;
    }
  };

  const getBorderColor = () => {
    switch (toolCall.state) {
      case "running":
        return "#0ea5e9";
      case "completed":
        return "#22c55e";
      case "error":
        return "#ef4444";
      default:
        return "#e5e7eb";
    }
  };

  return (
    <View
      className="mb-2 rounded-lg border p-2"
      style={{ borderColor: getBorderColor() }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <FontAwesome name="cog" size={12} color="#9ca3af" />
          <Text className="ml-2 text-sm font-medium text-foreground">
            {toolCall.displayName || toolCall.toolName}
          </Text>
        </View>
        {getStateIcon()}
      </View>

      {/* Show duration for completed calls */}
      {toolCall.state === "completed" && toolCall.durationMs && (
        <Text className="mt-1 text-xs text-gray-400">
          Completed in {toolCall.durationMs}ms
        </Text>
      )}

      {/* Show error message if failed */}
      {toolCall.state === "error" && toolCall.result !== undefined && (
        <Text className="mt-1 text-xs text-red-500">
          {typeof toolCall.result === "string"
            ? toolCall.result
            : JSON.stringify(toolCall.result)}
        </Text>
      )}
    </View>
  );
}
