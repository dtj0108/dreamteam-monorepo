import { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  Pressable,
  Alert,
} from "react-native";
import PagerView from "react-native-pager-view";
import { FontAwesome } from "@expo/vector-icons";
import { Lead, LeadPipeline, LeadPipelineStage } from "../../lib/types/sales";
import { LeadCard } from "./LeadCard";

interface LeadsKanbanBoardProps {
  pipeline: LeadPipeline | null;
  leads: (Lead & { contactCount?: number; stage?: LeadPipelineStage })[];
  onLeadPress: (lead: Lead) => void;
  onAddLead: (stageId: string) => void;
  onMoveLead: (leadId: string, stageId: string) => void;
  isLoading?: boolean;
}

export function LeadsKanbanBoard({
  pipeline,
  leads,
  onLeadPress,
  onAddLead,
  onMoveLead,
  isLoading,
}: LeadsKanbanBoardProps) {
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [movingLead, setMovingLead] = useState<Lead | null>(null);

  const stages = pipeline?.stages?.sort((a, b) => a.position - b.position) || [];
  const screenWidth = Dimensions.get("window").width;

  // Get leads for a specific stage
  const getLeadsForStage = (stageId: string) => {
    return leads.filter((lead) => lead.stage_id === stageId);
  };

  // Count leads per stage
  const getStageCounts = () => {
    const counts: Record<string, number> = {};
    stages.forEach((stage) => {
      counts[stage.id] = getLeadsForStage(stage.id).length;
    });
    return counts;
  };

  const stageCounts = getStageCounts();

  // Handle long press to initiate move
  const handleLeadLongPress = (lead: Lead) => {
    setMovingLead(lead);

    const stageOptions = stages
      .filter((s) => s.id !== lead.stage_id)
      .map((stage) => ({
        text: stage.name,
        onPress: () => {
          onMoveLead(lead.id, stage.id);
          setMovingLead(null);
        },
      }));

    Alert.alert(
      "Move Lead",
      `Move "${lead.name}" to:`,
      [...stageOptions, { text: "Cancel", style: "cancel", onPress: () => setMovingLead(null) }]
    );
  };

  if (!pipeline || stages.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <FontAwesome name="columns" size={48} color="#9ca3af" />
        <Text className="mt-4 text-center text-muted-foreground">
          No pipeline configured
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Page indicator dots */}
      <View className="flex-row items-center justify-center gap-1.5 py-2">
        {stages.map((stage, index) => (
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

      {/* Stage name header */}
      <View className="flex-row items-center justify-center gap-2 pb-2">
        <View
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: stages[currentPage]?.color }}
        />
        <Text className="text-lg font-semibold text-foreground">
          {stages[currentPage]?.name}
        </Text>
        <View className="rounded-full bg-muted px-2 py-0.5">
          <Text className="text-xs text-muted-foreground">
            {stageCounts[stages[currentPage]?.id] || 0}
          </Text>
        </View>
      </View>

      {/* Swipeable pager */}
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
      >
        {stages.map((stage) => {
          const stageLeads = getLeadsForStage(stage.id);

          return (
            <View key={stage.id} className="flex-1 px-4">
              <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
              >
                {stageLeads.length === 0 ? (
                  <View className="items-center justify-center py-12">
                    <FontAwesome name="inbox" size={32} color="#d1d5db" />
                    <Text className="mt-2 text-sm text-muted-foreground">
                      No leads in this stage
                    </Text>
                  </View>
                ) : (
                  stageLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      compact
                      onPress={() => onLeadPress(lead)}
                      onLongPress={() => handleLeadLongPress(lead)}
                    />
                  ))
                )}
              </ScrollView>

              {/* Add lead button */}
              <Pressable
                className="absolute bottom-4 right-0 left-0 mx-auto flex-row items-center justify-center rounded-full bg-primary px-4 py-2 active:opacity-70"
                style={{ width: 140 }}
                onPress={() => onAddLead(stage.id)}
              >
                <FontAwesome name="plus" size={12} color="white" />
                <Text className="ml-2 font-medium text-white">Add Lead</Text>
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
