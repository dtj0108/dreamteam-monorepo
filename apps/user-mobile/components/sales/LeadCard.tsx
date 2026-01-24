import { View, Text, Pressable } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { Lead, LeadPipelineStage } from "../../lib/types/sales";
import { StatusBadge } from "./StatusBadge";

interface LeadCardProps {
  lead: Lead & { contactCount?: number; stage?: LeadPipelineStage };
  onPress?: () => void;
  onLongPress?: () => void;
  compact?: boolean;
}

export function LeadCard({ lead, onPress, onLongPress, compact = false }: LeadCardProps) {
  if (compact) {
    // Compact version for Kanban board
    return (
      <Pressable
        className="mb-2 rounded-lg bg-white p-3 shadow-sm active:opacity-70"
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={300}
      >
        <Text className="font-medium text-foreground" numberOfLines={1}>
          {lead.name}
        </Text>
        {lead.industry && (
          <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
            {lead.industry}
          </Text>
        )}
        <View className="mt-2 flex-row items-center justify-between">
          <StatusBadge status={lead.status} size="sm" />
          {lead.contactCount !== undefined && lead.contactCount > 0 && (
            <View className="flex-row items-center">
              <FontAwesome name="user" size={10} color="#6b7280" />
              <Text className="ml-1 text-xs text-muted-foreground">
                {lead.contactCount}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  // Full version for list view
  return (
    <Pressable
      className="mb-2 flex-row items-center rounded-xl bg-muted p-4 active:opacity-70"
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
    >
      {/* Icon */}
      <View
        className="h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: "#0ea5e920" }}
      >
        <FontAwesome name="building" size={18} color="#0ea5e9" />
      </View>

      {/* Content */}
      <View className="ml-3 flex-1">
        <Text className="font-medium text-foreground" numberOfLines={1}>
          {lead.name}
        </Text>
        <View className="mt-0.5 flex-row items-center">
          {lead.industry && (
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {lead.industry}
            </Text>
          )}
          {lead.industry && lead.contactCount !== undefined && lead.contactCount > 0 && (
            <Text className="mx-1.5 text-muted-foreground">·</Text>
          )}
          {lead.contactCount !== undefined && lead.contactCount > 0 && (
            <View className="flex-row items-center">
              <FontAwesome name="user" size={10} color="#6b7280" />
              <Text className="ml-1 text-xs text-muted-foreground">
                {lead.contactCount}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Status badge and arrow */}
      <View className="flex-row items-center">
        <StatusBadge status={lead.status} stage={lead.stage} size="sm" />
        <FontAwesome
          name="chevron-right"
          size={12}
          color="#9ca3af"
          style={{ marginLeft: 8 }}
        />
      </View>
    </Pressable>
  );
}
