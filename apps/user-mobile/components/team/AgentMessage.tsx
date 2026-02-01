import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";
import { AgentMessage as AgentMessageType } from "@/lib/types/team";
import { ToolCallCard } from "./ToolCallCard";

// Parse inline markdown using sequential replacement approach
function parseInlineMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let key = 0;

  const patterns: Array<{ regex: RegExp; style: object }> = [
    { regex: /\*\*(.+?)\*\*/g, style: markdownStyles.bold },
    { regex: /~~(.+?)~~/g, style: markdownStyles.strikethrough },
    { regex: /`([^`]+)`/g, style: markdownStyles.code },
    { regex: /\*([^*]+)\*/g, style: markdownStyles.italic },
    { regex: /\b_([^_]+)_\b/g, style: markdownStyles.italic },
  ];

  const combinedPattern = /(\*\*[^*]+\*\*|~~[^~]+~~|`[^`]+`|\*[^*]+\*|\b_[^_]+_\b)/g;

  let lastIndex = 0;
  let match;

  while ((match = combinedPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(
        <Text key={`${keyPrefix}-${key++}`}>
          {text.slice(lastIndex, match.index)}
        </Text>
      );
    }

    const matchedText = match[0];
    let processed = false;

    for (const { regex, style } of patterns) {
      regex.lastIndex = 0;
      const patternMatch = regex.exec(matchedText);
      if (patternMatch && patternMatch[0] === matchedText) {
        result.push(
          <Text key={`${keyPrefix}-${key++}`} style={style}>
            {patternMatch[1]}
          </Text>
        );
        processed = true;
        break;
      }
    }

    if (!processed) {
      result.push(
        <Text key={`${keyPrefix}-${key++}`}>{matchedText}</Text>
      );
    }

    lastIndex = match.index + matchedText.length;
  }

  if (lastIndex < text.length) {
    result.push(
      <Text key={`${keyPrefix}-${key++}`}>{text.slice(lastIndex)}</Text>
    );
  }

  if (result.length === 0) {
    result.push(<Text key={`${keyPrefix}-0`}>{text}</Text>);
  }

  return result;
}

// Full markdown parser for agent messages
function parseMarkdown(text: string, isUser: boolean): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  const lines = text.split('\n');
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const h3Match = line.match(/^###\s+(.+)$/);
    const h2Match = line.match(/^##\s+(.+)$/);
    const h1Match = line.match(/^#\s+(.+)$/);

    if (h3Match) {
      result.push(
        <Text key={key++} style={[markdownStyles.h3, isUser && markdownStyles.userText]}>
          {parseInlineMarkdown(h3Match[1], `h3-${key}`)}
        </Text>
      );
    } else if (h2Match) {
      result.push(
        <Text key={key++} style={[markdownStyles.h2, isUser && markdownStyles.userText]}>
          {parseInlineMarkdown(h2Match[1], `h2-${key}`)}
        </Text>
      );
    } else if (h1Match) {
      result.push(
        <Text key={key++} style={[markdownStyles.h1, isUser && markdownStyles.userText]}>
          {parseInlineMarkdown(h1Match[1], `h1-${key}`)}
        </Text>
      );
    } else if (line.trim() === '') {
      result.push(<Text key={key++}>{'\n'}</Text>);
    } else {
      result.push(
        <Text key={key++}>
          {parseInlineMarkdown(line, `line-${key}`)}
          {i < lines.length - 1 ? '\n' : ''}
        </Text>
      );
    }
  }

  return result;
}

const markdownStyles = StyleSheet.create({
  bold: { fontWeight: "700" },
  italic: { fontStyle: "italic" },
  code: {
    fontFamily: "monospace",
    backgroundColor: "rgba(0,0,0,0.1)",
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  strikethrough: { textDecorationLine: "line-through" },
  h1: { fontSize: 20, fontWeight: "700", marginTop: 8, marginBottom: 4 },
  h2: { fontSize: 18, fontWeight: "700", marginTop: 6, marginBottom: 3 },
  h3: { fontSize: 16, fontWeight: "700", marginTop: 4, marginBottom: 2 },
  userText: { color: "white" },
});

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

        {/* Message content with markdown rendering */}
        {message.content ? (
          <Text className={isUser ? "text-white" : "text-foreground"}>
            {parseMarkdown(message.content, isUser)}
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
