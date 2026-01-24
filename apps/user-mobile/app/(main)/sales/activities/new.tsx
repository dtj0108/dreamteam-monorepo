import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";

import { ActivityForm } from "../../../../components/sales/ActivityForm";
import { useCreateLeadActivity } from "../../../../lib/hooks/useLeads";
import { ActivityType, CreateLeadActivityInput } from "../../../../lib/types/sales";

export default function NewActivityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    lead_id: string;
    type?: ActivityType;
  }>();

  const leadId = params.lead_id;
  const initialType = params.type || "note";

  const createActivityMutation = useCreateLeadActivity();

  const handleCancel = () => {
    router.back();
  };

  const handleSubmit = async (data: CreateLeadActivityInput) => {
    if (!leadId) {
      Alert.alert("Error", "Lead ID is required");
      return;
    }

    try {
      await createActivityMutation.mutateAsync({
        leadId,
        data,
      });
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to log activity");
    }
  };

  if (!leadId) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-muted-foreground">Lead ID is required</Text>
        <Pressable onPress={handleCancel} className="mt-4">
          <Text className="text-primary">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-muted px-4 py-3">
        <Pressable
          onPress={handleCancel}
          disabled={createActivityMutation.isPending}
        >
          <Text className="text-primary">Cancel</Text>
        </Pressable>
        <Text className="text-lg font-semibold text-foreground">
          Log Activity
        </Text>
        <View style={{ width: 50 }} />
      </View>

      <ActivityForm
        initialType={initialType}
        onSubmit={handleSubmit}
        isSubmitting={createActivityMutation.isPending}
      />
    </SafeAreaView>
  );
}
