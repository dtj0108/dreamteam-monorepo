import { View, Text, Pressable, Linking } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { Contact, getContactFullName } from "../../lib/types/sales";

interface LeadActionBarProps {
  contact: Contact | null;
}

export function LeadActionBar({ contact }: LeadActionBarProps) {
  const hasPhone = !!contact?.phone;
  const hasEmail = !!contact?.email;
  const contactName = contact ? getContactFullName(contact) : null;

  const handleCall = () => {
    if (contact?.phone) {
      Linking.openURL(`tel:${contact.phone}`);
    }
  };

  const handleText = () => {
    if (contact?.phone) {
      Linking.openURL(`sms:${contact.phone}`);
    }
  };

  const handleEmail = () => {
    if (contact?.email) {
      Linking.openURL(`mailto:${contact.email}`);
    }
  };

  return (
    <View className="border-b border-muted px-4 py-3">
      {contactName && (
        <Text className="mb-2 text-center text-xs text-muted-foreground">
          {contactName}
        </Text>
      )}
      <View className="flex-row justify-center gap-3">
        <Pressable
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 ${
            hasPhone ? "bg-foreground active:opacity-80" : "bg-muted"
          }`}
          onPress={handleCall}
          disabled={!hasPhone}
        >
          <FontAwesome
            name="phone"
            size={16}
            color={hasPhone ? "white" : "#9ca3af"}
          />
          <Text
            className={`font-medium ${hasPhone ? "text-white" : "text-muted-foreground"}`}
          >
            Call
          </Text>
        </Pressable>

        <Pressable
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 ${
            hasPhone ? "bg-foreground active:opacity-80" : "bg-muted"
          }`}
          onPress={handleText}
          disabled={!hasPhone}
        >
          <FontAwesome
            name="comment"
            size={16}
            color={hasPhone ? "white" : "#9ca3af"}
          />
          <Text
            className={`font-medium ${hasPhone ? "text-white" : "text-muted-foreground"}`}
          >
            Text
          </Text>
        </Pressable>

        <Pressable
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 ${
            hasEmail ? "bg-foreground active:opacity-80" : "bg-muted"
          }`}
          onPress={handleEmail}
          disabled={!hasEmail}
        >
          <FontAwesome
            name="envelope"
            size={16}
            color={hasEmail ? "white" : "#9ca3af"}
          />
          <Text
            className={`font-medium ${hasEmail ? "text-white" : "text-muted-foreground"}`}
          >
            Email
          </Text>
        </Pressable>
      </View>
      {!contact && (
        <Text className="mt-2 text-center text-xs text-muted-foreground">
          No contacts available
        </Text>
      )}
    </View>
  );
}
