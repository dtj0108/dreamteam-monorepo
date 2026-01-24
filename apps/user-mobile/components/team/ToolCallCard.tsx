import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";

interface ToolCallCardProps {
  toolCall: {
    name: string;
    args: object;
    result?: unknown;
  };
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasResult = toolCall.result !== undefined;

  // Get a friendly display name for the tool
  const getToolDisplayName = (name: string): string => {
    return name
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .trim()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Get an icon for common tool types
  const getToolIcon = (name: string): string => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("search")) return "search";
    if (lowerName.includes("get") || lowerName.includes("fetch"))
      return "download";
    if (lowerName.includes("create") || lowerName.includes("add"))
      return "plus";
    if (lowerName.includes("update") || lowerName.includes("edit"))
      return "pencil";
    if (lowerName.includes("delete") || lowerName.includes("remove"))
      return "trash";
    if (lowerName.includes("calculate") || lowerName.includes("compute"))
      return "calculator";
    if (lowerName.includes("budget") || lowerName.includes("finance"))
      return "money";
    if (lowerName.includes("lead") || lowerName.includes("sales"))
      return "handshake-o";
    if (lowerName.includes("project") || lowerName.includes("task"))
      return "tasks";
    return "cog";
  };

  return (
    <View className="mb-2 rounded-lg bg-background">
      {/* Header */}
      <Pressable
        className="flex-row items-center p-3"
        onPress={() => setIsExpanded(!isExpanded)}
      >
        {/* Icon */}
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <FontAwesome
            name={getToolIcon(toolCall.name) as any}
            size={14}
            color={Colors.primary}
          />
        </View>

        {/* Name and status */}
        <View className="ml-3 flex-1">
          <Text className="font-medium text-foreground">
            {getToolDisplayName(toolCall.name)}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {hasResult ? "Completed" : "Running..."}
          </Text>
        </View>

        {/* Status indicator */}
        {hasResult ? (
          <FontAwesome name="check-circle" size={16} color={Colors.success} />
        ) : (
          <FontAwesome
            name="spinner"
            size={16}
            color={Colors.primary}
          />
        )}

        {/* Expand chevron */}
        <FontAwesome
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={12}
          color={Colors.mutedForeground}
          style={{ marginLeft: 8 }}
        />
      </Pressable>

      {/* Expanded content */}
      {isExpanded && (
        <View className="border-t border-border px-3 pb-3 pt-2">
          {/* Arguments */}
          <Text className="mb-1 text-xs font-medium uppercase text-muted-foreground">
            Arguments
          </Text>
          <View className="rounded-md bg-muted p-2">
            <Text className="font-mono text-xs text-foreground">
              {JSON.stringify(toolCall.args, null, 2)}
            </Text>
          </View>

          {/* Result */}
          {hasResult && (
            <>
              <Text className="mb-1 mt-3 text-xs font-medium uppercase text-muted-foreground">
                Result
              </Text>
              <View className="rounded-md bg-muted p-2">
                <Text className="font-mono text-xs text-foreground">
                  {typeof toolCall.result === "string"
                    ? toolCall.result
                    : JSON.stringify(toolCall.result, null, 2)}
                </Text>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}
