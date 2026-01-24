import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

import {
  useLead,
  useDeleteLead,
  useUpdateLeadTask,
  useDeleteLeadTask,
  useDeleteLeadOpportunity,
  useCreateLeadActivity,
} from "../../../../lib/hooks/useLeads";
import {
  LeadTask,
  LeadOpportunity,
  ActivityType,
  getContactFullName,
  formatCurrency,
  getOpportunityStageLabel,
  OPPORTUNITY_STAGE_COLORS,
} from "../../../../lib/types/sales";
import { StatusBadge } from "../../../../components/sales/StatusBadge";
import { ActivityTimeline } from "../../../../components/sales/ActivityTimeline";
import { QuickLogMenu } from "../../../../components/sales/QuickLogMenu";
import { LeadActionBar } from "../../../../components/sales/LeadActionBar";

export default function LeadDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<"activity" | "details">("activity");

  const { data: lead, isLoading, error, refetch } = useLead(id);
  const primaryContact = lead?.contacts?.[0] || null;
  const deleteLeadMutation = useDeleteLead();
  const updateTaskMutation = useUpdateLeadTask();
  const deleteTaskMutation = useDeleteLeadTask();
  const deleteOpportunityMutation = useDeleteLeadOpportunity();
  const createActivityMutation = useCreateLeadActivity();

  const handleBack = () => {
    router.back();
  };

  const handleEdit = () => {
    router.push({
      pathname: "/(main)/sales/leads/new",
      params: { id: lead?.id, edit: "true" },
    });
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Lead",
      `Are you sure you want to delete "${lead?.name}"? This will also delete all associated contacts, tasks, and opportunities.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteLeadMutation.mutateAsync(id);
              router.back();
            } catch (error) {
              Alert.alert("Error", "Failed to delete lead");
            }
          },
        },
      ]
    );
  };

  const handleToggleTask = async (task: LeadTask) => {
    try {
      await updateTaskMutation.mutateAsync({
        leadId: id,
        taskId: task.id,
        data: { is_completed: !task.is_completed },
      });
    } catch (error) {
      Alert.alert("Error", "Failed to update task");
    }
  };

  const handleDeleteTask = (task: LeadTask) => {
    Alert.alert("Delete Task", `Delete "${task.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTaskMutation.mutateAsync({ leadId: id, taskId: task.id });
          } catch (error) {
            Alert.alert("Error", "Failed to delete task");
          }
        },
      },
    ]);
  };

  const handleDeleteOpportunity = (opp: LeadOpportunity) => {
    Alert.alert("Delete Opportunity", `Delete "${opp.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteOpportunityMutation.mutateAsync({
              leadId: id,
              opportunityId: opp.id,
            });
          } catch (error) {
            Alert.alert("Error", "Failed to delete opportunity");
          }
        },
      },
    ]);
  };

  const handleQuickLogActivity = async (type: ActivityType) => {
    try {
      await createActivityMutation.mutateAsync({
        leadId: id,
        data: {
          type,
          subject: `Quick ${type}`,
        },
      });
    } catch (error) {
      Alert.alert("Error", "Failed to log activity");
    }
  };

  const handleCustomLogActivity = () => {
    router.push({
      pathname: "/(main)/sales/activities/new",
      params: { lead_id: id },
    });
  };

  const handleLogActivityWithType = (type: ActivityType) => {
    router.push({
      pathname: "/(main)/sales/activities/new",
      params: { lead_id: id, type },
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (error || !lead) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <FontAwesome name="exclamation-circle" size={48} color="#ef4444" />
        <Text className="mt-4 text-lg text-foreground">Lead not found</Text>
        <Pressable
          className="mt-4 rounded-full bg-primary px-4 py-2"
          onPress={handleBack}
        >
          <Text className="font-medium text-white">Go Back</Text>
        </Pressable>
      </View>
    );
  }

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

      {/* Lead header with tabs */}
      <View className="border-b border-muted px-4 py-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground">{lead.name}</Text>
            <View className="mt-1 flex-row items-center gap-2">
              {lead.industry && (
                <Text className="text-sm text-muted-foreground">
                  {lead.industry}
                </Text>
              )}
              <StatusBadge status={lead.status} stage={lead.stage} />
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable
              className={`rounded-full px-3 py-1 ${activeTab === "activity" ? "bg-foreground" : "bg-muted"}`}
              onPress={() => setActiveTab("activity")}
            >
              <Text className={`text-sm font-medium ${activeTab === "activity" ? "text-white" : "text-muted-foreground"}`}>
                Activity
              </Text>
            </Pressable>
            <Pressable
              className={`rounded-full px-3 py-1 ${activeTab === "details" ? "bg-foreground" : "bg-muted"}`}
              onPress={() => setActiveTab("details")}
            >
              <Text className={`text-sm font-medium ${activeTab === "details" ? "text-white" : "text-muted-foreground"}`}>
                Details
              </Text>
            </Pressable>
          </View>
        </View>
        {lead.website && (
          <Pressable
            className="mt-2 flex-row items-center"
            onPress={() => Linking.openURL(lead.website!)}
          >
            <FontAwesome name="globe" size={12} color="#0ea5e9" />
            <Text className="ml-2 text-sm text-primary">{lead.website}</Text>
          </Pressable>
        )}
      </View>

      {/* Action Bar - Call, Text, Email */}
      <LeadActionBar contact={primaryContact} />

      {/* Tab Content */}
      {activeTab === "activity" ? (
        <View className="flex-1">
          <ActivityTimeline
            activities={lead.activities || []}
            onLogActivity={handleCustomLogActivity}
            onRefresh={() => refetch()}
          />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <DetailsTab
            lead={lead}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onDeleteOpportunity={handleDeleteOpportunity}
          />
        </ScrollView>
      )}

      {/* Quick Log FAB - only on activity tab */}
      {activeTab === "activity" && (
        <QuickLogMenu
          onLogActivity={handleLogActivityWithType}
          onCustomLog={handleCustomLogActivity}
        />
      )}
    </SafeAreaView>
  );
}

// Details Tab Component
function DetailsTab({
  lead,
  onToggleTask,
  onDeleteTask,
  onDeleteOpportunity,
}: {
  lead: any;
  onToggleTask: (task: LeadTask) => void;
  onDeleteTask: (task: LeadTask) => void;
  onDeleteOpportunity: (opp: LeadOpportunity) => void;
}) {
  return (
    <View className="px-4 py-4">
      {/* About section */}
      <View className="mb-6">
        <Text className="mb-2 text-lg font-semibold text-foreground">About</Text>
        <View className="rounded-xl bg-muted p-4">
          {lead.address && (
            <View className="mb-3">
              <Text className="text-xs text-muted-foreground">Address</Text>
              <Text className="text-foreground">
                {[lead.address, lead.city, lead.state, lead.postal_code, lead.country]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            </View>
          )}
          {lead.notes && (
            <View>
              <Text className="text-xs text-muted-foreground">Notes</Text>
              <Text className="text-foreground">{lead.notes}</Text>
            </View>
          )}
          {!lead.address && !lead.notes && (
            <Text className="text-muted-foreground">No additional details</Text>
          )}
        </View>
      </View>

      {/* Tasks section */}
      <View className="mb-6">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-foreground">Tasks</Text>
          <View className="rounded-full bg-muted px-2 py-0.5">
            <Text className="text-xs text-muted-foreground">
              {lead.tasks?.length || 0}
            </Text>
          </View>
        </View>
        {lead.tasks && lead.tasks.length > 0 ? (
          <View className="rounded-xl bg-muted">
            {lead.tasks.map((task: LeadTask, index: number) => (
              <Pressable
                key={task.id}
                className={`flex-row items-center p-4 ${
                  index < lead.tasks.length - 1 ? "border-b border-background" : ""
                }`}
                onPress={() => onToggleTask(task)}
                onLongPress={() => onDeleteTask(task)}
              >
                <FontAwesome
                  name={task.is_completed ? "check-square" : "square-o"}
                  size={18}
                  color={task.is_completed ? "#22c55e" : "#9ca3af"}
                />
                <View className="ml-3 flex-1">
                  <Text
                    className={`${
                      task.is_completed
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }`}
                  >
                    {task.title}
                  </Text>
                  {task.due_date && (
                    <Text className="text-xs text-muted-foreground">
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View className="items-center rounded-xl bg-muted p-6">
            <FontAwesome name="check-square-o" size={24} color="#d1d5db" />
            <Text className="mt-2 text-sm text-muted-foreground">No tasks</Text>
          </View>
        )}
      </View>

      {/* Opportunities section */}
      <View className="mb-6">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-foreground">
            Opportunities
          </Text>
          <View className="rounded-full bg-muted px-2 py-0.5">
            <Text className="text-xs text-muted-foreground">
              {lead.opportunities?.length || 0}
            </Text>
          </View>
        </View>
        {lead.opportunities && lead.opportunities.length > 0 ? (
          <View className="rounded-xl bg-muted">
            {lead.opportunities.map((opp: LeadOpportunity, index: number) => (
              <Pressable
                key={opp.id}
                className={`p-4 ${
                  index < lead.opportunities.length - 1
                    ? "border-b border-background"
                    : ""
                }`}
                onLongPress={() => onDeleteOpportunity(opp)}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="font-medium text-foreground">{opp.name}</Text>
                  {opp.value && (
                    <Text className="font-semibold text-foreground">
                      {formatCurrency(opp.value)}
                    </Text>
                  )}
                </View>
                <View className="mt-1 flex-row items-center">
                  <View
                    className="rounded-full px-2 py-0.5"
                    style={{
                      backgroundColor: OPPORTUNITY_STAGE_COLORS[opp.stage] + "20",
                    }}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{ color: OPPORTUNITY_STAGE_COLORS[opp.stage] }}
                    >
                      {getOpportunityStageLabel(opp.stage)}
                    </Text>
                  </View>
                  <Text className="ml-2 text-xs text-muted-foreground">
                    {opp.probability}% probability
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View className="items-center rounded-xl bg-muted p-6">
            <FontAwesome name="dollar" size={24} color="#d1d5db" />
            <Text className="mt-2 text-sm text-muted-foreground">
              No opportunities
            </Text>
          </View>
        )}
      </View>

      {/* Contacts section */}
      <View className="mb-6">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-foreground">Contacts</Text>
          <View className="rounded-full bg-muted px-2 py-0.5">
            <Text className="text-xs text-muted-foreground">
              {lead.contacts?.length || 0}
            </Text>
          </View>
        </View>
        {lead.contacts && lead.contacts.length > 0 ? (
          <View className="rounded-xl bg-muted">
            {lead.contacts.map((contact: any, index: number) => (
              <Pressable
                key={contact.id}
                className={`flex-row items-center p-4 ${
                  index < lead.contacts.length - 1 ? "border-b border-background" : ""
                }`}
                onPress={() => {
                  const options = [];
                  if (contact.phone) {
                    options.push({
                      text: `Call ${contact.phone}`,
                      onPress: () => Linking.openURL(`tel:${contact.phone}`),
                    });
                  }
                  if (contact.email) {
                    options.push({
                      text: `Email ${contact.email}`,
                      onPress: () => Linking.openURL(`mailto:${contact.email}`),
                    });
                  }
                  options.push({ text: "Cancel", style: "cancel" as const });
                  Alert.alert(getContactFullName(contact), contact.title, options);
                }}
              >
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: "#8b5cf620" }}
                >
                  <Text className="text-sm font-semibold" style={{ color: "#8b5cf6" }}>
                    {contact.first_name[0]}
                    {contact.last_name?.[0] || ""}
                  </Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-medium text-foreground">
                    {getContactFullName(contact)}
                  </Text>
                  {contact.title && (
                    <Text className="text-sm text-muted-foreground">
                      {contact.title}
                    </Text>
                  )}
                </View>
                <View className="flex-row gap-2">
                  {contact.phone && (
                    <FontAwesome name="phone" size={14} color="#22c55e" />
                  )}
                  {contact.email && (
                    <FontAwesome name="envelope" size={14} color="#3b82f6" />
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View className="items-center rounded-xl bg-muted p-6">
            <FontAwesome name="user" size={24} color="#d1d5db" />
            <Text className="mt-2 text-sm text-muted-foreground">No contacts</Text>
          </View>
        )}
      </View>
    </View>
  );
}

