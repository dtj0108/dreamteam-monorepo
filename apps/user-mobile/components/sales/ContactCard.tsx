import { View, Text, Pressable, Linking, Alert } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { Contact, getContactFullName } from "../../lib/types/sales";

interface ContactCardProps {
  contact: Contact;
  onPress?: () => void;
  showLead?: boolean;
}

export function ContactCard({ contact, onPress, showLead = true }: ContactCardProps) {
  const fullName = getContactFullName(contact);
  const initials = contact.first_name[0] + (contact.last_name?.[0] || "");

  const handleCall = () => {
    if (contact.phone) {
      Linking.openURL(`tel:${contact.phone}`);
    }
  };

  const handleEmail = () => {
    if (contact.email) {
      Linking.openURL(`mailto:${contact.email}`);
    }
  };

  const handleActions = () => {
    const options = [];
    if (contact.phone) {
      options.push({ text: `Call ${contact.phone}`, onPress: handleCall });
    }
    if (contact.email) {
      options.push({ text: `Email ${contact.email}`, onPress: handleEmail });
    }
    if (options.length === 0) {
      options.push({ text: "No contact methods available" });
    }
    options.push({ text: "Cancel", style: "cancel" as const });

    Alert.alert(fullName, undefined, options);
  };

  return (
    <Pressable
      className="mb-2 flex-row items-center rounded-xl bg-muted p-4 active:opacity-70"
      onPress={onPress || handleActions}
    >
      {/* Avatar */}
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: "#8b5cf620" }}
      >
        <Text className="text-sm font-semibold" style={{ color: "#8b5cf6" }}>
          {initials.toUpperCase()}
        </Text>
      </View>

      {/* Content */}
      <View className="ml-3 flex-1">
        <Text className="font-medium text-foreground" numberOfLines={1}>
          {fullName}
        </Text>
        <View className="mt-0.5 flex-row items-center flex-wrap">
          {contact.title && (
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {contact.title}
            </Text>
          )}
          {contact.title && showLead && contact.lead && (
            <Text className="mx-1.5 text-muted-foreground">·</Text>
          )}
          {showLead && contact.lead && (
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {contact.lead.name}
            </Text>
          )}
        </View>
      </View>

      {/* Quick action icons */}
      <View className="flex-row items-center gap-3">
        {contact.phone && (
          <Pressable
            className="h-8 w-8 items-center justify-center rounded-full bg-green-100 active:opacity-70"
            onPress={handleCall}
          >
            <FontAwesome name="phone" size={14} color="#22c55e" />
          </Pressable>
        )}
        {contact.email && (
          <Pressable
            className="h-8 w-8 items-center justify-center rounded-full bg-blue-100 active:opacity-70"
            onPress={handleEmail}
          >
            <FontAwesome name="envelope" size={14} color="#3b82f6" />
          </Pressable>
        )}
        <FontAwesome name="chevron-right" size={12} color="#9ca3af" />
      </View>
    </Pressable>
  );
}
