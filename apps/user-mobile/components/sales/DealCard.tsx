import { Pressable, Text, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import {
  Deal,
  formatCurrency,
  getOpportunityStageLabel,
  OPPORTUNITY_STAGE_COLORS,
} from "../../lib/types/sales";

interface DealCardProps {
  deal: Deal;
  onPress?: () => void;
  onLongPress?: () => void;
  compact?: boolean;
}

function formatDate(dateString?: string): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DealCard({
  deal,
  onPress,
  onLongPress,
  compact = false,
}: DealCardProps) {
  const stageColor = OPPORTUNITY_STAGE_COLORS[deal.stage];
  const stageLabel = getOpportunityStageLabel(deal.stage);
  const closeDate = formatDate(deal.expected_close_date);

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
          {deal.name}
        </Text>
        {deal.lead?.name && (
          <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
            {deal.lead.name}
          </Text>
        )}
        <View className="mt-2 flex-row items-center justify-between">
          {deal.value !== undefined && deal.value > 0 ? (
            <Text className="text-sm font-semibold text-foreground">
              {formatCurrency(deal.value)}
            </Text>
          ) : (
            <View />
          )}
          <View className="flex-row items-center">
            <Text className="text-xs text-muted-foreground">
              {deal.probability}%
            </Text>
          </View>
        </View>
        {closeDate && (
          <View className="mt-1.5 flex-row items-center">
            <FontAwesome name="calendar" size={10} color="#9ca3af" />
            <Text className="ml-1 text-xs text-muted-foreground">
              {closeDate}
            </Text>
          </View>
        )}
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
        style={{ backgroundColor: stageColor + "20" }}
      >
        <FontAwesome name="dollar" size={18} color={stageColor} />
      </View>

      {/* Content */}
      <View className="ml-3 flex-1">
        <Text className="font-medium text-foreground" numberOfLines={1}>
          {deal.name}
        </Text>
        <View className="mt-0.5 flex-row items-center">
          {deal.lead?.name && (
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {deal.lead.name}
            </Text>
          )}
          {deal.lead?.name && closeDate && (
            <Text className="mx-1.5 text-muted-foreground">·</Text>
          )}
          {closeDate && (
            <View className="flex-row items-center">
              <FontAwesome name="calendar" size={10} color="#9ca3af" />
              <Text className="ml-1 text-xs text-muted-foreground">
                {closeDate}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Value and stage */}
      <View className="items-end">
        {deal.value !== undefined && deal.value > 0 && (
          <Text className="font-semibold text-foreground">
            {formatCurrency(deal.value)}
          </Text>
        )}
        <View className="mt-1 flex-row items-center">
          <View
            className="rounded-full px-2 py-0.5"
            style={{ backgroundColor: stageColor + "20" }}
          >
            <Text
              className="text-xs font-medium"
              style={{ color: stageColor }}
            >
              {stageLabel}
            </Text>
          </View>
          <FontAwesome
            name="chevron-right"
            size={12}
            color="#9ca3af"
            style={{ marginLeft: 8 }}
          />
        </View>
      </View>
    </Pressable>
  );
}
