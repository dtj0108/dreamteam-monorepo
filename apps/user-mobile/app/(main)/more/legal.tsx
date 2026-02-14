import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as WebBrowser from "expo-web-browser";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { LEGAL_PRIVACY_URL, LEGAL_TERMS_URL } from "@/constants/legal-links";

const LEGAL_ITEMS = [
  {
    id: "terms",
    title: "Terms of Service",
    description: "Read the terms for using DreamTeam.",
    url: LEGAL_TERMS_URL,
    icon: "file-text-o" as const,
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    description: "See how data is collected and used.",
    url: LEGAL_PRIVACY_URL,
    icon: "shield" as const,
  },
];

export default function LegalScreen() {
  const handleOpenUrl = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <Text className="text-base font-semibold text-foreground">
            Legal Documents
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            Open the latest public legal PDFs.
          </Text>
        </View>

        <View className="mx-4 mt-4 rounded-2xl bg-white shadow-sm">
          {LEGAL_ITEMS.map((item, index) => (
            <View key={item.id}>
              <Pressable
                onPress={() => handleOpenUrl(item.url)}
                className="flex-row items-center px-4 py-3.5 active:bg-muted/50"
              >
                <View className="h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <FontAwesome
                    name={item.icon}
                    size={16}
                    color={Colors.mutedForeground}
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base text-foreground">{item.title}</Text>
                  <Text className="text-sm text-muted-foreground">
                    {item.description}
                  </Text>
                </View>
                <FontAwesome
                  name="external-link"
                  size={14}
                  color={Colors.mutedForeground}
                />
              </Pressable>
              {index < LEGAL_ITEMS.length - 1 ? <Divider /> : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Divider() {
  return <View className="ml-14 h-px bg-border" />;
}
