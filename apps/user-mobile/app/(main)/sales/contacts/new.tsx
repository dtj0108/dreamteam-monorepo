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

import { useCreateContact, useUpdateContact, useContact } from "../../../../lib/hooks/useContacts";
import { useLeads } from "../../../../lib/hooks/useLeads";
import { CreateContactInput } from "../../../../lib/types/sales";

export default function ContactFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    edit?: string;
    lead_id?: string;
  }>();

  const isEditing = params.edit === "true" && params.id;
  const { data: existingContact, isLoading: loadingContact } = useContact(
    params.id || ""
  );
  const { data: leadsData } = useLeads();
  const createContactMutation = useCreateContact();
  const updateContactMutation = useUpdateContact();

  const leads = leadsData?.leads || [];

  // Form state
  const [leadId, setLeadId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const [showLeadPicker, setShowLeadPicker] = useState(false);

  // Initialize form with existing contact data or URL params
  useEffect(() => {
    if (isEditing && existingContact) {
      setLeadId(existingContact.lead_id);
      setFirstName(existingContact.first_name);
      setLastName(existingContact.last_name || "");
      setEmail(existingContact.email || "");
      setPhone(existingContact.phone || "");
      setTitle(existingContact.title || "");
      setNotes(existingContact.notes || "");
    } else if (params.lead_id) {
      setLeadId(params.lead_id);
    }
  }, [isEditing, existingContact, params.lead_id]);

  const selectedLead = leads.find((l) => l.id === leadId);

  const handleCancel = () => {
    router.back();
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert("Validation Error", "First name is required");
      return;
    }
    if (!leadId) {
      Alert.alert("Validation Error", "Please select a lead");
      return;
    }

    // Validate email format if provided
    if (email.trim() && !email.includes("@")) {
      Alert.alert("Validation Error", "Please enter a valid email address");
      return;
    }

    const contactData: CreateContactInput = {
      lead_id: leadId,
      first_name: firstName.trim(),
      last_name: lastName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      title: title.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      if (isEditing && params.id) {
        const { lead_id, ...updateData } = contactData;
        await updateContactMutation.mutateAsync({ id: params.id, data: updateData });
      } else {
        await createContactMutation.mutateAsync(contactData);
      }
      router.back();
    } catch (error) {
      Alert.alert("Error", `Failed to ${isEditing ? "update" : "create"} contact`);
    }
  };

  const isSaving = createContactMutation.isPending || updateContactMutation.isPending;

  if (isEditing && loadingContact) {
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
          {isEditing ? "Edit Contact" : "New Contact"}
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
          {/* Lead Selection */}
          <View className="mt-4">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              LEAD *
            </Text>
            <View className="rounded-xl bg-muted">
              <Pressable
                className="flex-row items-center justify-between p-4"
                onPress={() => setShowLeadPicker(!showLeadPicker)}
                disabled={!!isEditing} // Can't change lead when editing
              >
                <View className="flex-row items-center">
                  <FontAwesome name="building" size={16} color="#6b7280" />
                  <Text
                    className={`ml-2 ${
                      selectedLead ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {selectedLead?.name || "Select a lead"}
                  </Text>
                </View>
                {!isEditing && (
                  <FontAwesome name="chevron-down" size={12} color="#9ca3af" />
                )}
              </Pressable>
              {showLeadPicker && !isEditing && (
                <Picker
                  selectedValue={leadId}
                  onValueChange={(value) => {
                    setLeadId(value);
                    setShowLeadPicker(false);
                  }}
                >
                  <Picker.Item label="Select a lead" value="" />
                  {leads.map((lead) => (
                    <Picker.Item key={lead.id} label={lead.name} value={lead.id} />
                  ))}
                </Picker>
              )}
            </View>
          </View>

          {/* Name Section */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              NAME
            </Text>
            <View className="rounded-xl bg-muted">
              <View className="border-b border-background p-4">
                <Text className="mb-1 text-xs text-muted-foreground">
                  First Name *
                </Text>
                <TextInput
                  className="text-foreground"
                  placeholder="Enter first name"
                  placeholderTextColor="#9ca3af"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
              </View>
              <View className="p-4">
                <Text className="mb-1 text-xs text-muted-foreground">
                  Last Name
                </Text>
                <TextInput
                  className="text-foreground"
                  placeholder="Enter last name"
                  placeholderTextColor="#9ca3af"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </View>
            </View>
          </View>

          {/* Contact Info Section */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              CONTACT INFORMATION
            </Text>
            <View className="rounded-xl bg-muted">
              <View className="border-b border-background p-4">
                <Text className="mb-1 text-xs text-muted-foreground">Email</Text>
                <TextInput
                  className="text-foreground"
                  placeholder="email@example.com"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View className="p-4">
                <Text className="mb-1 text-xs text-muted-foreground">Phone</Text>
                <TextInput
                  className="text-foreground"
                  placeholder="+1 (555) 123-4567"
                  placeholderTextColor="#9ca3af"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

          {/* Job Title Section */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              JOB TITLE
            </Text>
            <View className="rounded-xl bg-muted p-4">
              <TextInput
                className="text-foreground"
                placeholder="e.g., CEO, CTO, Sales Manager"
                placeholderTextColor="#9ca3af"
                value={title}
                onChangeText={setTitle}
                autoCapitalize="words"
              />
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
                placeholder="Add notes about this contact..."
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
