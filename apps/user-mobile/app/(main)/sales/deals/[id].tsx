import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

import { useDeal, useDeleteDeal } from "../../../../lib/hooks/useDeals";
import {
  formatCurrency,
  getOpportunityStageLabel,
  OPPORTUNITY_STAGE_COLORS,
} from "../../../../lib/types/sales";

export default function DealDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: deal, isLoading, error } = useDeal(id);
  const deleteDealMutation = useDeleteDeal();

  const handleBack = () => {
    router.back();
  };

  const handleEdit = () => {
    router.push({
      pathname: "/(main)/sales/deals/new",
      params: { id: deal?.id, edit: "true" },
    });
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Deal",
      `Are you sure you want to delete "${deal?.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDealMutation.mutateAsync(id);
              router.back();
            } catch (error) {
              Alert.alert("Error", "Failed to delete deal");
            }
          },
        },
      ]
    );
  };

  const handleViewLead = () => {
    if (deal?.lead_id) {
      router.push({
        pathname: "/(main)/sales/leads/[id]",
        params: { id: deal.lead_id },
      });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );
  }

  if (error || !deal) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <FontAwesome name="exclamation-circle" size={48} color="#ef4444" />
        <Text className="mt-4 text-lg text-foreground">Deal not found</Text>
        <Pressable
          className="mt-4 rounded-full bg-primary px-4 py-2"
          onPress={handleBack}
        >
          <Text className="font-medium text-white">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const stageColor = OPPORTUNITY_STAGE_COLORS[deal.stage];
  const stageLabel = getOpportunityStageLabel(deal.stage);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-muted px-4 py-3">
        <Pressable
          className="flex-row items-center active:opacity-70"
          onPress={handleBack}
        >
          <FontAwesome name="chevron-left" size={16} color="#0ea5e9" />
          <Text className="ml-2 text-primary">Back</Text>
        </Pressable>
        <View className="flex-row items-center gap-2">
          <Pressable
            className="h-8 w-8 items-center justify-center rounded-full bg-muted active:opacity-70"
            onPress={handleEdit}
          >
            <FontAwesome name="pencil" size={14} color="#6b7280" />
          </Pressable>
          <Pressable
            className="h-8 w-8 items-center justify-center rounded-full bg-red-100 active:opacity-70"
            onPress={handleDelete}
          >
            <FontAwesome name="trash" size={14} color="#ef4444" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Deal header */}
        <View className="border-b border-muted px-4 py-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xl font-bold text-foreground">{deal.name}</Text>
              {deal.lead?.name && (
                <Pressable
                  onPress={handleViewLead}
                  className="mt-1 flex-row items-center active:opacity-70"
                >
                  <FontAwesome name="building" size={12} color="#6b7280" />
                  <Text className="ml-1.5 text-sm text-primary">
                    {deal.lead.name}
                  </Text>
                </Pressable>
              )}
            </View>
            <View
              className="rounded-full px-3 py-1"
              style={{ backgroundColor: stageColor + "20" }}
            >
              <Text className="font-medium" style={{ color: stageColor }}>
                {stageLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Key Metrics */}
        <View className="px-4 py-4">
          <View className="flex-row gap-3">
            {/* Value Card */}
            <View className="flex-1 rounded-xl bg-muted p-4">
              <Text className="text-xs text-muted-foreground">DEAL VALUE</Text>
              <Text className="mt-1 text-2xl font-bold text-foreground">
                {deal.value ? formatCurrency(deal.value) : "$0"}
              </Text>
            </View>

            {/* Probability Card */}
            <View className="flex-1 rounded-xl bg-muted p-4">
              <Text className="text-xs text-muted-foreground">PROBABILITY</Text>
              <Text className="mt-1 text-2xl font-bold text-foreground">
                {deal.probability}%
              </Text>
            </View>
          </View>

          {/* Weighted Value */}
          {deal.value !== undefined && deal.value > 0 && (
            <View className="mt-3 rounded-xl bg-muted p-4">
              <Text className="text-xs text-muted-foreground">WEIGHTED VALUE</Text>
              <Text className="mt-1 text-xl font-semibold text-foreground">
                {formatCurrency((deal.value * deal.probability) / 100)}
              </Text>
              <Text className="mt-0.5 text-xs text-muted-foreground">
                Based on {deal.probability}% probability
              </Text>
            </View>
          )}
        </View>

        {/* Details Section */}
        <View className="px-4 pb-4">
          <Text className="mb-2 text-lg font-semibold text-foreground">
            Details
          </Text>
          <View className="rounded-xl bg-muted">
            {/* Expected Close Date */}
            <View className="border-b border-background p-4">
              <Text className="text-xs text-muted-foreground">
                Expected Close Date
              </Text>
              <Text className="mt-1 text-foreground">
                {deal.expected_close_date
                  ? new Date(deal.expected_close_date).toLocaleDateString(
                      "en-US",
                      { weekday: "long", month: "long", day: "numeric", year: "numeric" }
                    )
                  : "Not set"}
              </Text>
            </View>

            {/* Stage */}
            <View className="border-b border-background p-4">
              <Text className="text-xs text-muted-foreground">Stage</Text>
              <View className="mt-1 flex-row items-center">
                <View
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: stageColor }}
                />
                <Text className="ml-2 text-foreground">{stageLabel}</Text>
              </View>
            </View>

            {/* Created At */}
            <View className="p-4">
              <Text className="text-xs text-muted-foreground">Created</Text>
              <Text className="mt-1 text-foreground">
                {new Date(deal.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes Section */}
        {deal.notes && (
          <View className="px-4 pb-4">
            <Text className="mb-2 text-lg font-semibold text-foreground">
              Notes
            </Text>
            <View className="rounded-xl bg-muted p-4">
              <Text className="text-foreground">{deal.notes}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
