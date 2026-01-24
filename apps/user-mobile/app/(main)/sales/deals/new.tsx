import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";

import { useCreateDeal, useUpdateDeal, useDeal } from "../../../../lib/hooks/useDeals";
import { useLeads } from "../../../../lib/hooks/useLeads";
import {
  OpportunityStage,
  OPPORTUNITY_STAGE_COLORS,
  getOpportunityStageLabel,
  CreateDealInput,
} from "../../../../lib/types/sales";

const DEAL_STAGES: OpportunityStage[] = [
  "prospect",
  "qualified",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
];

export default function DealFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    edit?: string;
    stage?: OpportunityStage;
    lead_id?: string;
  }>();

  const isEditing = params.edit === "true" && params.id;
  const { data: existingDeal, isLoading: loadingDeal } = useDeal(params.id || "");
  const { data: leadsData } = useLeads();
  const createDealMutation = useCreateDeal();
  const updateDealMutation = useUpdateDeal();

  const leads = leadsData?.leads || [];

  // Form state
  const [name, setName] = useState("");
  const [leadId, setLeadId] = useState<string>("");
  const [value, setValue] = useState("");
  const [stage, setStage] = useState<OpportunityStage>(params.stage || "prospect");
  const [probability, setProbability] = useState("50");
  const [expectedCloseDate, setExpectedCloseDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");

  const [showStagePicker, setShowStagePicker] = useState(false);
  const [showLeadPicker, setShowLeadPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Initialize form with existing deal data or URL params
  useEffect(() => {
    if (isEditing && existingDeal) {
      setName(existingDeal.name);
      setLeadId(existingDeal.lead_id || "");
      setValue(existingDeal.value?.toString() || "");
      setStage(existingDeal.stage);
      setProbability(existingDeal.probability?.toString() || "50");
      if (existingDeal.expected_close_date) {
        setExpectedCloseDate(new Date(existingDeal.expected_close_date));
      }
      setNotes(existingDeal.notes || "");
    } else if (params.lead_id) {
      setLeadId(params.lead_id);
    }
  }, [isEditing, existingDeal, params.lead_id]);

  const selectedLead = leads.find((l) => l.id === leadId);

  const handleCancel = () => {
    router.back();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Deal name is required");
      return;
    }

    const dealData: CreateDealInput = {
      name: name.trim(),
      lead_id: leadId || undefined,
      value: value ? parseFloat(value) : undefined,
      stage,
      probability: probability ? parseInt(probability, 10) : 50,
      expected_close_date: expectedCloseDate?.toISOString(),
      notes: notes.trim() || undefined,
    };

    try {
      if (isEditing && params.id) {
        await updateDealMutation.mutateAsync({ id: params.id, data: dealData });
      } else {
        await createDealMutation.mutateAsync(dealData);
      }
      router.back();
    } catch (error) {
      Alert.alert("Error", `Failed to ${isEditing ? "update" : "create"} deal`);
    }
  };

  const isSaving = createDealMutation.isPending || updateDealMutation.isPending;

  if (isEditing && loadingDeal) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-muted px-4 py-3">
        <Pressable onPress={handleCancel} disabled={isSaving}>
          <Text className="text-primary">Cancel</Text>
        </Pressable>
        <Text className="text-lg font-semibold text-foreground">
          {isEditing ? "Edit Deal" : "New Deal"}
        </Text>
        <Pressable onPress={handleSave} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator size="small" color="#0ea5e9" />
          ) : (
            <Text className="font-semibold text-primary">Save</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Basic Info Section */}
          <View className="mt-4">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              DEAL INFORMATION
            </Text>
            <View className="rounded-xl bg-muted">
              {/* Deal Name */}
              <View className="border-b border-background p-4">
                <Text className="mb-1 text-xs text-muted-foreground">
                  Deal Name *
                </Text>
                <TextInput
                  className="text-foreground"
                  placeholder="Enter deal name"
                  placeholderTextColor="#9ca3af"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              {/* Associated Lead */}
              <Pressable
                className="flex-row items-center justify-between border-b border-background p-4"
                onPress={() => setShowLeadPicker(!showLeadPicker)}
              >
                <Text className="text-foreground">Associated Lead</Text>
                <View className="flex-row items-center">
                  <Text className="text-muted-foreground">
                    {selectedLead?.name || "None"}
                  </Text>
                  <FontAwesome
                    name="chevron-down"
                    size={12}
                    color="#9ca3af"
                    style={{ marginLeft: 8 }}
                  />
                </View>
              </Pressable>
              {showLeadPicker && (
                <Picker
                  selectedValue={leadId}
                  onValueChange={(value) => {
                    setLeadId(value);
                    setShowLeadPicker(false);
                  }}
                >
                  <Picker.Item label="None" value="" />
                  {leads.map((lead) => (
                    <Picker.Item key={lead.id} label={lead.name} value={lead.id} />
                  ))}
                </Picker>
              )}

              {/* Value */}
              <View className="p-4">
                <Text className="mb-1 text-xs text-muted-foreground">Value ($)</Text>
                <TextInput
                  className="text-foreground"
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  value={value}
                  onChangeText={setValue}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Stage & Progress Section */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              STAGE & PROGRESS
            </Text>
            <View className="rounded-xl bg-muted">
              {/* Stage */}
              <Pressable
                className="flex-row items-center justify-between border-b border-background p-4"
                onPress={() => setShowStagePicker(!showStagePicker)}
              >
                <Text className="text-foreground">Stage</Text>
                <View className="flex-row items-center">
                  <View
                    className="rounded-full px-2 py-0.5"
                    style={{ backgroundColor: OPPORTUNITY_STAGE_COLORS[stage] + "20" }}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{ color: OPPORTUNITY_STAGE_COLORS[stage] }}
                    >
                      {getOpportunityStageLabel(stage)}
                    </Text>
                  </View>
                  <FontAwesome
                    name="chevron-down"
                    size={12}
                    color="#9ca3af"
                    style={{ marginLeft: 8 }}
                  />
                </View>
              </Pressable>
              {showStagePicker && (
                <Picker
                  selectedValue={stage}
                  onValueChange={(value) => {
                    setStage(value);
                    setShowStagePicker(false);
                  }}
                >
                  {DEAL_STAGES.map((s) => (
                    <Picker.Item
                      key={s}
                      label={getOpportunityStageLabel(s)}
                      value={s}
                    />
                  ))}
                </Picker>
              )}

              {/* Probability */}
              <View className="border-b border-background p-4">
                <Text className="mb-1 text-xs text-muted-foreground">
                  Probability (%)
                </Text>
                <TextInput
                  className="text-foreground"
                  placeholder="50"
                  placeholderTextColor="#9ca3af"
                  value={probability}
                  onChangeText={setProbability}
                  keyboardType="numeric"
                />
              </View>

              {/* Expected Close Date */}
              <Pressable
                className="flex-row items-center justify-between p-4"
                onPress={() => setShowDatePicker(!showDatePicker)}
              >
                <Text className="text-foreground">Expected Close Date</Text>
                <View className="flex-row items-center">
                  <Text className="text-muted-foreground">
                    {expectedCloseDate
                      ? expectedCloseDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Not set"}
                  </Text>
                  <FontAwesome
                    name="calendar"
                    size={14}
                    color="#9ca3af"
                    style={{ marginLeft: 8 }}
                  />
                </View>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={expectedCloseDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === "android") {
                      setShowDatePicker(false);
                    }
                    if (selectedDate) {
                      setExpectedCloseDate(selectedDate);
                    }
                  }}
                />
              )}
            </View>
          </View>

          {/* Notes Section */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              NOTES
            </Text>
            <View className="rounded-xl bg-muted p-4">
              <TextInput
                className="min-h-[100px] text-foreground"
                placeholder="Add notes about this deal..."
                placeholderTextColor="#9ca3af"
                value={notes}
                onChangeText={setNotes}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
