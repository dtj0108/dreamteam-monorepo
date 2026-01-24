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

import { useCreateLead, useUpdateLead, useLead } from "../../../../lib/hooks/useLeads";
import { useLeadPipelines } from "../../../../lib/hooks/useLeadPipelines";
import {
  LeadStatus,
  LEAD_STATUS_COLORS,
  getLeadStatusLabel,
  CreateLeadInput,
} from "../../../../lib/types/sales";

const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "unqualified",
  "won",
  "lost",
];

export default function LeadFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    edit?: string;
    stage_id?: string;
    pipeline_id?: string;
  }>();

  const isEditing = params.edit === "true" && params.id;
  const { data: existingLead, isLoading: loadingLead } = useLead(params.id || "");
  const { data: pipelinesData } = useLeadPipelines();
  const createLeadMutation = useCreateLead();
  const updateLeadMutation = useUpdateLead();

  const pipelines = pipelinesData?.pipelines || [];

  // Form state
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [status, setStatus] = useState<LeadStatus>("new");
  const [pipelineId, setPipelineId] = useState<string>("");
  const [stageId, setStageId] = useState<string>("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [notes, setNotes] = useState("");

  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showPipelinePicker, setShowPipelinePicker] = useState(false);
  const [showStagePicker, setShowStagePicker] = useState(false);

  // Initialize form with existing lead data or URL params
  useEffect(() => {
    if (isEditing && existingLead) {
      setName(existingLead.name);
      setWebsite(existingLead.website || "");
      setIndustry(existingLead.industry || "");
      setStatus(existingLead.status);
      setPipelineId(existingLead.pipeline_id || "");
      setStageId(existingLead.stage_id || "");
      setAddress(existingLead.address || "");
      setCity(existingLead.city || "");
      setState(existingLead.state || "");
      setCountry(existingLead.country || "");
      setPostalCode(existingLead.postal_code || "");
      setNotes(existingLead.notes || "");
    } else if (params.pipeline_id || params.stage_id) {
      if (params.pipeline_id) setPipelineId(params.pipeline_id);
      if (params.stage_id) setStageId(params.stage_id);
    }
  }, [isEditing, existingLead, params.pipeline_id, params.stage_id]);

  // Get stages for selected pipeline
  const selectedPipeline = pipelines.find((p) => p.id === pipelineId);
  const stages = selectedPipeline?.stages?.sort((a, b) => a.position - b.position) || [];

  const handleCancel = () => {
    router.back();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Company name is required");
      return;
    }

    const leadData: CreateLeadInput = {
      name: name.trim(),
      website: website.trim() || undefined,
      industry: industry.trim() || undefined,
      status,
      pipeline_id: pipelineId || undefined,
      stage_id: stageId || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      country: country.trim() || undefined,
      postal_code: postalCode.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      if (isEditing && params.id) {
        await updateLeadMutation.mutateAsync({ id: params.id, data: leadData });
      } else {
        await createLeadMutation.mutateAsync(leadData);
      }
      router.back();
    } catch (error) {
      Alert.alert("Error", `Failed to ${isEditing ? "update" : "create"} lead`);
    }
  };

  const isSaving = createLeadMutation.isPending || updateLeadMutation.isPending;

  if (isEditing && loadingLead) {
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
          {isEditing ? "Edit Lead" : "New Lead"}
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
              BASIC INFORMATION
            </Text>
            <View className="rounded-xl bg-muted">
              {/* Company Name */}
              <View className="border-b border-background p-4">
                <Text className="mb-1 text-xs text-muted-foreground">
                  Company Name *
                </Text>
                <TextInput
                  className="text-foreground"
                  placeholder="Enter company name"
                  placeholderTextColor="#9ca3af"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              {/* Website */}
              <View className="border-b border-background p-4">
                <Text className="mb-1 text-xs text-muted-foreground">Website</Text>
                <TextInput
                  className="text-foreground"
                  placeholder="https://example.com"
                  placeholderTextColor="#9ca3af"
                  value={website}
                  onChangeText={setWebsite}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              {/* Industry */}
              <View className="p-4">
                <Text className="mb-1 text-xs text-muted-foreground">Industry</Text>
                <TextInput
                  className="text-foreground"
                  placeholder="e.g., Technology, Healthcare"
                  placeholderTextColor="#9ca3af"
                  value={industry}
                  onChangeText={setIndustry}
                  autoCapitalize="words"
                />
              </View>
            </View>
          </View>

          {/* Status & Pipeline Section */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              STATUS & PIPELINE
            </Text>
            <View className="rounded-xl bg-muted">
              {/* Status */}
              <Pressable
                className="flex-row items-center justify-between border-b border-background p-4"
                onPress={() => setShowStatusPicker(!showStatusPicker)}
              >
                <Text className="text-foreground">Status</Text>
                <View className="flex-row items-center">
                  <View
                    className="rounded-full px-2 py-0.5"
                    style={{ backgroundColor: LEAD_STATUS_COLORS[status] + "20" }}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{ color: LEAD_STATUS_COLORS[status] }}
                    >
                      {getLeadStatusLabel(status)}
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
              {showStatusPicker && (
                <Picker
                  selectedValue={status}
                  onValueChange={(value) => {
                    setStatus(value);
                    setShowStatusPicker(false);
                  }}
                >
                  {LEAD_STATUSES.map((s) => (
                    <Picker.Item
                      key={s}
                      label={getLeadStatusLabel(s)}
                      value={s}
                    />
                  ))}
                </Picker>
              )}

              {/* Pipeline */}
              <Pressable
                className="flex-row items-center justify-between border-b border-background p-4"
                onPress={() => setShowPipelinePicker(!showPipelinePicker)}
              >
                <Text className="text-foreground">Pipeline</Text>
                <View className="flex-row items-center">
                  <Text className="text-muted-foreground">
                    {selectedPipeline?.name || "Select pipeline"}
                  </Text>
                  <FontAwesome
                    name="chevron-down"
                    size={12}
                    color="#9ca3af"
                    style={{ marginLeft: 8 }}
                  />
                </View>
              </Pressable>
              {showPipelinePicker && (
                <Picker
                  selectedValue={pipelineId}
                  onValueChange={(value) => {
                    setPipelineId(value);
                    setStageId(""); // Reset stage when pipeline changes
                    setShowPipelinePicker(false);
                  }}
                >
                  <Picker.Item label="Select pipeline" value="" />
                  {pipelines.map((p) => (
                    <Picker.Item key={p.id} label={p.name} value={p.id} />
                  ))}
                </Picker>
              )}

              {/* Stage */}
              {pipelineId && stages.length > 0 && (
                <>
                  <Pressable
                    className="flex-row items-center justify-between p-4"
                    onPress={() => setShowStagePicker(!showStagePicker)}
                  >
                    <Text className="text-foreground">Stage</Text>
                    <View className="flex-row items-center">
                      <Text className="text-muted-foreground">
                        {stages.find((s) => s.id === stageId)?.name || "Select stage"}
                      </Text>
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
                      selectedValue={stageId}
                      onValueChange={(value) => {
                        setStageId(value);
                        setShowStagePicker(false);
                      }}
                    >
                      <Picker.Item label="Select stage" value="" />
                      {stages.map((s) => (
                        <Picker.Item key={s.id} label={s.name} value={s.id} />
                      ))}
                    </Picker>
                  )}
                </>
              )}
            </View>
          </View>

          {/* Address Section */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              ADDRESS
            </Text>
            <View className="rounded-xl bg-muted">
              <View className="border-b border-background p-4">
                <Text className="mb-1 text-xs text-muted-foreground">
                  Street Address
                </Text>
                <TextInput
                  className="text-foreground"
                  placeholder="123 Main St"
                  placeholderTextColor="#9ca3af"
                  value={address}
                  onChangeText={setAddress}
                />
              </View>
              <View className="flex-row border-b border-background">
                <View className="flex-1 border-r border-background p-4">
                  <Text className="mb-1 text-xs text-muted-foreground">City</Text>
                  <TextInput
                    className="text-foreground"
                    placeholder="City"
                    placeholderTextColor="#9ca3af"
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
                <View className="flex-1 p-4">
                  <Text className="mb-1 text-xs text-muted-foreground">State</Text>
                  <TextInput
                    className="text-foreground"
                    placeholder="State"
                    placeholderTextColor="#9ca3af"
                    value={state}
                    onChangeText={setState}
                  />
                </View>
              </View>
              <View className="flex-row">
                <View className="flex-1 border-r border-background p-4">
                  <Text className="mb-1 text-xs text-muted-foreground">Country</Text>
                  <TextInput
                    className="text-foreground"
                    placeholder="Country"
                    placeholderTextColor="#9ca3af"
                    value={country}
                    onChangeText={setCountry}
                  />
                </View>
                <View className="flex-1 p-4">
                  <Text className="mb-1 text-xs text-muted-foreground">
                    Postal Code
                  </Text>
                  <TextInput
                    className="text-foreground"
                    placeholder="Postal Code"
                    placeholderTextColor="#9ca3af"
                    value={postalCode}
                    onChangeText={setPostalCode}
                  />
                </View>
              </View>
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
                placeholder="Add notes about this lead..."
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
