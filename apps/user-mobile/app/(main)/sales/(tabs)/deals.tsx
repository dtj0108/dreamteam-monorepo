import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useDeals, useDealStats, useMoveDealStage } from "../../../../lib/hooks/useDeals";
import { Deal, OpportunityStage, formatCurrency } from "../../../../lib/types/sales";
import { DealsKanbanBoard } from "../../../../components/sales/DealsKanbanBoard";
import { StatsCard } from "../../../../components/sales/StatsCard";
import { ProductSwitcher } from "../../../../components/ProductSwitcher";

export default function DealsScreen() {
  const router = useRouter();

  const { data: dealsData, isLoading } = useDeals();
  const { data: stats } = useDealStats();
  const moveDealStageMutation = useMoveDealStage();

  const deals = dealsData?.deals || [];

  const handleDealPress = (deal: Deal) => {
    router.push({
      pathname: "/(main)/sales/deals/[id]",
      params: { id: deal.id },
    });
  };

  const handleAddDeal = (stage?: OpportunityStage) => {
    router.push({
      pathname: "/(main)/sales/deals/new",
      params: stage ? { stage } : {},
    });
  };

  const handleMoveDeal = (dealId: string, stage: OpportunityStage) => {
    moveDealStageMutation.mutate({ id: dealId, stage });
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={["top"]} className="bg-background">
        <View className="px-4 py-2">
          <ProductSwitcher />
        </View>
      </SafeAreaView>

      {/* Stats Row */}
      <View className="flex-row gap-2 px-4 py-3">
        <StatsCard
          title="Total Deals"
          value={stats?.totalCount?.toString() || "0"}
          compact
        />
        <StatsCard
          title="Pipeline Value"
          value={formatCurrency(stats?.totalValue || 0)}
          compact
        />
        <StatsCard
          title="Weighted"
          value={formatCurrency(stats?.weightedValue || 0)}
          compact
        />
      </View>

      {/* Kanban Board */}
      <DealsKanbanBoard
        deals={deals}
        onDealPress={handleDealPress}
        onAddDeal={handleAddDeal}
        onMoveDeal={handleMoveDeal}
      />
    </View>
  );
}
