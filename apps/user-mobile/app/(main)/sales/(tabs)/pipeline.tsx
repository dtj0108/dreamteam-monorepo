import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useLeads, useMoveLeadStage } from "../../../../lib/hooks/useLeads";
import { useLeadPipelines, useDefaultLeadPipeline } from "../../../../lib/hooks/useLeadPipelines";
import { Lead } from "../../../../lib/types/sales";
import { LeadsKanbanBoard } from "../../../../components/sales/LeadsKanbanBoard";
import { ProductSwitcher } from "../../../../components/ProductSwitcher";

export default function PipelineScreen() {
  const router = useRouter();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);

  // Fetch data
  const { data: leadsData, isLoading: leadsLoading } = useLeads();
  const { data: pipelinesData, isLoading: pipelinesLoading } = useLeadPipelines();
  const { data: defaultPipeline } = useDefaultLeadPipeline();
  const moveLeadStageMutation = useMoveLeadStage();

  const isLoading = leadsLoading || pipelinesLoading;
  const leads = leadsData?.leads || [];
  const pipelines = pipelinesData?.pipelines || [];

  // Get current pipeline (selected or default)
  const currentPipeline = useMemo(() => {
    if (selectedPipelineId) {
      return pipelines.find((p) => p.id === selectedPipelineId) || defaultPipeline;
    }
    return defaultPipeline;
  }, [selectedPipelineId, pipelines, defaultPipeline]);

  // Handlers
  const handleLeadPress = (lead: Lead) => {
    router.push(`/(main)/sales/leads/${lead.id}`);
  };

  const handleAddLead = (stageId?: string) => {
    if (stageId) {
      router.push({
        pathname: "/(main)/sales/leads/new",
        params: { stage_id: stageId, pipeline_id: currentPipeline?.id },
      });
    } else {
      router.push("/(main)/sales/leads/new");
    }
  };

  const handleMoveLead = async (leadId: string, stageId: string) => {
    try {
      await moveLeadStageMutation.mutateAsync({
        lead_id: leadId,
        stage_id: stageId,
        pipeline_id: currentPipeline?.id,
      });
    } catch (error) {
      console.error("Failed to move lead:", error);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={["top"]} className="bg-background">
        <View className="px-4 py-2">
          <ProductSwitcher />
        </View>
      </SafeAreaView>

      {/* Header */}
      <View className="px-4 py-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-foreground">Pipeline</Text>
            <Text className="text-sm text-muted-foreground">
              {currentPipeline?.name || "Lead Pipeline"}
            </Text>
          </View>
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full bg-primary active:opacity-70"
            onPress={() => handleAddLead()}
          >
            <FontAwesome name="plus" size={16} color="white" />
          </Pressable>
        </View>
      </View>

      {/* Pipeline Selector (if multiple pipelines) */}
      {pipelines.length > 1 && (
        <View className="flex-row gap-2 px-4 py-2">
          {pipelines.map((pipeline) => (
            <Pressable
              key={pipeline.id}
              className={`rounded-full px-3 py-1.5 ${
                (selectedPipelineId || defaultPipeline?.id) === pipeline.id
                  ? "bg-primary"
                  : "bg-muted"
              }`}
              onPress={() => setSelectedPipelineId(pipeline.id)}
            >
              <Text
                className={`text-sm font-medium ${
                  (selectedPipelineId || defaultPipeline?.id) === pipeline.id
                    ? "text-white"
                    : "text-muted-foreground"
                }`}
              >
                {pipeline.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : (
        <LeadsKanbanBoard
          pipeline={currentPipeline || null}
          leads={leads as any}
          onLeadPress={handleLeadPress}
          onAddLead={handleAddLead}
          onMoveLead={handleMoveLead}
        />
      )}
    </View>
  );
}
