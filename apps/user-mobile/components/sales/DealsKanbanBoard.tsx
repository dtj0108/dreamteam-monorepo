import { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import PagerView from "react-native-pager-view";
import { FontAwesome } from "@expo/vector-icons";
import {
  Deal,
  OpportunityStage,
  formatCurrency,
  getOpportunityStageLabel,
  OPPORTUNITY_STAGE_COLORS,
} from "../../lib/types/sales";
import { DealCard } from "./DealCard";

// Fixed stages for deals (unlike leads which have dynamic pipeline stages)
const DEAL_STAGES: { id: OpportunityStage; name: string; color: string }[] = [
  { id: "prospect", name: "Prospect", color: OPPORTUNITY_STAGE_COLORS.prospect },
  { id: "qualified", name: "Qualified", color: OPPORTUNITY_STAGE_COLORS.qualified },
  { id: "proposal", name: "Proposal", color: OPPORTUNITY_STAGE_COLORS.proposal },
  { id: "negotiation", name: "Negotiation", color: OPPORTUNITY_STAGE_COLORS.negotiation },
  { id: "closed_won", name: "Closed Won", color: OPPORTUNITY_STAGE_COLORS.closed_won },
  { id: "closed_lost", name: "Closed Lost", color: OPPORTUNITY_STAGE_COLORS.closed_lost },
];

interface DealsKanbanBoardProps {
  deals: Deal[];
  onDealPress: (deal: Deal) => void;
  onAddDeal: (stage?: OpportunityStage) => void;
  onMoveDeal: (dealId: string, stage: OpportunityStage) => void;
  isLoading?: boolean;
}

export function DealsKanbanBoard({
  deals,
  onDealPress,
  onAddDeal,
  onMoveDeal,
  isLoading,
}: DealsKanbanBoardProps) {
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Get deals for a specific stage
  const getDealsForStage = (stage: OpportunityStage) => {
    return deals.filter((deal) => deal.stage === stage);
  };

  // Get stage stats (count and total value)
  const getStageStats = () => {
    const stats: Record<OpportunityStage, { count: number; value: number }> = {
      prospect: { count: 0, value: 0 },
      qualified: { count: 0, value: 0 },
      proposal: { count: 0, value: 0 },
      negotiation: { count: 0, value: 0 },
      closed_won: { count: 0, value: 0 },
      closed_lost: { count: 0, value: 0 },
    };

    deals.forEach((deal) => {
      stats[deal.stage].count += 1;
      stats[deal.stage].value += deal.value || 0;
    });

    return stats;
  };

  const stageStats = getStageStats();

  // Handle long press to initiate move
  const handleDealLongPress = (deal: Deal) => {
    const stageOptions = DEAL_STAGES
      .filter((s) => s.id !== deal.stage)
      .map((stage) => ({
        text: stage.name,
        onPress: () => {
          onMoveDeal(deal.id, stage.id);
        },
      }));

    Alert.alert(
      "Move Deal",
      `Move "${deal.name}" to:`,
      [...stageOptions, { text: "Cancel", style: "cancel" }]
    );
  };

  return (
    <View className="flex-1">
      {/* Page indicator dots */}
      <View className="flex-row items-center justify-center gap-1.5 py-2">
        {DEAL_STAGES.map((stage, index) => (
          <Pressable
            key={stage.id}
            onPress={() => pagerRef.current?.setPage(index)}
          >
            <View
              className={`h-2 rounded-full ${
                index === currentPage ? "w-6" : "w-2"
              }`}
              style={{
                backgroundColor:
                  index === currentPage ? stage.color : stage.color + "40",
              }}
            />
          </Pressable>
        ))}
      </View>

      {/* Stage name header with value */}
      <View className="flex-row items-center justify-center gap-2 pb-2">
        <View
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: DEAL_STAGES[currentPage]?.color }}
        />
        <Text className="text-lg font-semibold text-foreground">
          {DEAL_STAGES[currentPage]?.name}
        </Text>
        <View className="rounded-full bg-muted px-2 py-0.5">
          <Text className="text-xs text-muted-foreground">
            {stageStats[DEAL_STAGES[currentPage]?.id]?.count || 0}
          </Text>
        </View>
      </View>

      {/* Stage value */}
      {stageStats[DEAL_STAGES[currentPage]?.id]?.value > 0 && (
        <View className="items-center pb-2">
          <Text className="text-sm text-muted-foreground">
            Total: {formatCurrency(stageStats[DEAL_STAGES[currentPage]?.id]?.value || 0)}
          </Text>
        </View>
      )}

      {/* Swipeable pager */}
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
      >
        {DEAL_STAGES.map((stage) => {
          const stageDeals = getDealsForStage(stage.id);

          return (
            <View key={stage.id} className="flex-1 px-4">
              <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
              >
                {stageDeals.length === 0 ? (
                  <View className="items-center justify-center py-12">
                    <FontAwesome name="inbox" size={32} color="#d1d5db" />
                    <Text className="mt-2 text-sm text-muted-foreground">
                      No deals in this stage
                    </Text>
                  </View>
                ) : (
                  stageDeals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      compact
                      onPress={() => onDealPress(deal)}
                      onLongPress={() => handleDealLongPress(deal)}
                    />
                  ))
                )}
              </ScrollView>

              {/* Add deal button */}
              <Pressable
                className="absolute bottom-4 right-0 left-0 mx-auto flex-row items-center justify-center rounded-full bg-primary px-4 py-2 active:opacity-70"
                style={{ width: 140 }}
                onPress={() => onAddDeal(stage.id)}
              >
                <FontAwesome name="plus" size={12} color="white" />
                <Text className="ml-2 font-medium text-white">Add Deal</Text>
              </Pressable>
            </View>
          );
        })}
      </PagerView>

      {/* Swipe hint */}
      <View className="flex-row items-center justify-center pb-2">
        <FontAwesome name="hand-o-left" size={12} color="#9ca3af" />
        <Text className="mx-2 text-xs text-muted-foreground">
          Swipe to change stage
        </Text>
        <FontAwesome name="hand-o-right" size={12} color="#9ca3af" />
      </View>
    </View>
  );
}
