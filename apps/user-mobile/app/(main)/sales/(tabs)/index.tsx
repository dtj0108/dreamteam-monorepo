import { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useLeads } from "../../../../lib/hooks/useLeads";
import { Lead } from "../../../../lib/types/sales";
import { LeadCard } from "../../../../components/sales/LeadCard";
import { StatsCard } from "../../../../components/sales/StatsCard";
import { ProductSwitcher } from "../../../../components/ProductSwitcher";

export default function LeadsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch data
  const { data: leadsData, isLoading, refetch } = useLeads();
  const leads = leadsData?.leads || [];

  // Filter leads by search query
  const filteredLeads = useMemo(() => {
    if (!searchQuery) return leads;
    const query = searchQuery.toLowerCase();
    return leads.filter(
      (lead) =>
        lead.name.toLowerCase().includes(query) ||
        lead.industry?.toLowerCase().includes(query)
    );
  }, [leads, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = leads.length;
    const newCount = leads.filter((l) => l.status === "new").length;
    const qualifiedCount = leads.filter((l) => l.status === "qualified").length;
    const contactCount = leads.reduce(
      (sum, l) => sum + ((l as any).contactCount || 0),
      0
    );
    return { total, newCount, qualifiedCount, contactCount };
  }, [leads]);

  // Handlers
  const handleLeadPress = (lead: Lead) => {
    router.push(`/(main)/sales/leads/${lead.id}`);
  };

  const handleAddLead = () => {
    router.push("/(main)/sales/leads/new");
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
            <Text className="text-2xl font-bold text-foreground">Leads</Text>
            <Text className="text-sm text-muted-foreground">
              Manage your prospects
            </Text>
          </View>
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full bg-primary active:opacity-70"
            onPress={handleAddLead}
          >
            <FontAwesome name="plus" size={16} color="white" />
          </Pressable>
        </View>
      </View>

      {/* Stats */}
      <View className="flex-row gap-2 px-4 py-2">
        <StatsCard label="Total" value={stats.total} icon="building" iconColor="#0ea5e9" />
        <StatsCard label="New" value={stats.newCount} icon="star" iconColor="#6b7280" />
        <StatsCard label="Qualified" value={stats.qualifiedCount} icon="check" iconColor="#22c55e" />
        <StatsCard label="Contacts" value={stats.contactCount} icon="user" iconColor="#8b5cf6" />
      </View>

      {/* Search */}
      <View className="px-4 py-2">
        <View className="flex-row items-center rounded-lg bg-muted px-3 py-2">
          <FontAwesome name="search" size={14} color="#9ca3af" />
          <TextInput
            className="ml-2 flex-1 text-foreground"
            placeholder="Search leads..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <FontAwesome name="times-circle" size={14} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} />
          }
        >
          {filteredLeads.length === 0 ? (
            <View className="flex-1 items-center justify-center py-12">
              <FontAwesome name="building" size={48} color="#d1d5db" />
              <Text className="mt-4 text-lg font-medium text-foreground">
                {searchQuery ? "No leads found" : "No leads yet"}
              </Text>
              <Text className="mt-1 text-center text-muted-foreground">
                {searchQuery
                  ? "Try a different search term"
                  : "Start adding leads to track your\nsales pipeline"}
              </Text>
              {!searchQuery && (
                <Pressable
                  className="mt-4 flex-row items-center rounded-full bg-primary px-4 py-2 active:opacity-70"
                  onPress={handleAddLead}
                >
                  <FontAwesome name="plus" size={12} color="white" />
                  <Text className="ml-2 font-medium text-white">Add Lead</Text>
                </Pressable>
              )}
            </View>
          ) : (
            filteredLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead as any}
                onPress={() => handleLeadPress(lead)}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
