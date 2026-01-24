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

import { useContacts } from "../../../../lib/hooks/useContacts";
import { ContactCard } from "../../../../components/sales/ContactCard";
import { ProductSwitcher } from "../../../../components/ProductSwitcher";

export default function ContactsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: contactsData, isLoading, refetch } = useContacts();
  const contacts = contactsData?.contacts || [];

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(
      (contact) =>
        contact.first_name.toLowerCase().includes(query) ||
        contact.last_name?.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.title?.toLowerCase().includes(query) ||
        contact.lead?.name.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  const handleAddContact = () => {
    router.push("/(main)/sales/contacts/new");
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
            <Text className="text-2xl font-bold text-foreground">Contacts</Text>
            <Text className="text-sm text-muted-foreground">
              {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full bg-primary active:opacity-70"
            onPress={handleAddContact}
          >
            <FontAwesome name="plus" size={16} color="white" />
          </Pressable>
        </View>
      </View>

      {/* Search */}
      <View className="px-4 py-2">
        <View className="flex-row items-center rounded-lg bg-muted px-3 py-2">
          <FontAwesome name="search" size={14} color="#9ca3af" />
          <TextInput
            className="ml-2 flex-1 text-foreground"
            placeholder="Search contacts..."
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
          {filteredContacts.length === 0 ? (
            <View className="flex-1 items-center justify-center py-12">
              <FontAwesome name="user" size={48} color="#d1d5db" />
              <Text className="mt-4 text-lg font-medium text-foreground">
                {searchQuery ? "No contacts found" : "No contacts yet"}
              </Text>
              <Text className="mt-1 text-center text-muted-foreground">
                {searchQuery
                  ? "Try a different search term"
                  : "Add contacts to your leads to\nstart tracking relationships"}
              </Text>
              {!searchQuery && (
                <Pressable
                  className="mt-4 flex-row items-center rounded-full bg-primary px-4 py-2 active:opacity-70"
                  onPress={handleAddContact}
                >
                  <FontAwesome name="plus" size={12} color="white" />
                  <Text className="ml-2 font-medium text-white">Add Contact</Text>
                </Pressable>
              )}
            </View>
          ) : (
            filteredContacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} showLead />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
