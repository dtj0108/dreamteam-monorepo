import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";

type SettingsItem = {
  id: string;
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  iconColor: string;
  title: string;
  subtitle: string;
  route?: string;
  comingSoon?: boolean;
};

const SETTINGS_SECTIONS: {
  title: string;
  items: SettingsItem[];
}[] = [
  {
    title: "Customization",
    items: [
      {
        id: "categories",
        icon: "tags",
        iconColor: "#8b5cf6",
        title: "Categories",
        subtitle: "Manage income & expense categories",
        route: "/(main)/finance/categories",
      },
      {
        id: "recurring",
        icon: "refresh",
        iconColor: "#0ea5e9",
        title: "Recurring Rules",
        subtitle: "Automate recurring transactions",
        route: "/(main)/finance/recurring",
      },
    ],
  },
  {
    title: "Notifications",
    items: [
      {
        id: "budget-alerts",
        icon: "bell",
        iconColor: "#f59e0b",
        title: "Budget Alerts",
        subtitle: "Get notified when approaching limits",
        route: "/(main)/finance/settings/notifications",
      },
    ],
  },
  {
    title: "Data & Privacy",
    items: [
      {
        id: "export",
        icon: "download",
        iconColor: "#22c55e",
        title: "Export Data",
        subtitle: "Download your financial data",
        comingSoon: true,
      },
      {
        id: "import",
        icon: "upload",
        iconColor: "#3b82f6",
        title: "Import Data",
        subtitle: "Import from CSV or other apps",
        route: "/(main)/finance/transactions/import",
      },
    ],
  },
  {
    title: "Integrations",
    items: [
      {
        id: "banks",
        icon: "bank",
        iconColor: "#6366f1",
        title: "Connected Banks",
        subtitle: "Manage Plaid connections",
        route: "/(main)/finance/banks",
      },
    ],
  },
  {
    title: "Coming Soon",
    items: [
      {
        id: "security",
        icon: "lock",
        iconColor: "#6b7280",
        title: "Security",
        subtitle: "Privacy & security settings",
        comingSoon: true,
      },
      {
        id: "billing",
        icon: "credit-card",
        iconColor: "#6b7280",
        title: "Billing",
        subtitle: "Manage subscription & payments",
        comingSoon: true,
      },
    ],
  },
];

export default function FinanceSettingsScreen() {
  const router = useRouter();

  const handleItemPress = (item: SettingsItem) => {
    if (item.comingSoon) {
      // Show a toast or alert
      return;
    }
    if (item.route) {
      router.push(item.route as any);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View className="flex-row items-center py-4">
          <Pressable onPress={() => router.back()} className="mr-3">
            <FontAwesome name="chevron-left" size={18} color={Colors.primary} />
          </Pressable>
          <View>
            <Text className="text-2xl font-bold text-foreground">
              Finance Settings
            </Text>
            <Text className="text-muted-foreground">
              Customize your finance workspace
            </Text>
          </View>
        </View>

        {/* Settings Sections */}
        {SETTINGS_SECTIONS.map((section) => (
          <View key={section.title} className="mb-6">
            <Text className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
              {section.title}
            </Text>
            <View className="gap-2">
              {section.items.map((item) => (
                <SettingsMenuItem
                  key={item.id}
                  item={item}
                  onPress={() => handleItemPress(item)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsMenuItem({
  item,
  onPress,
}: {
  item: SettingsItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center rounded-xl bg-muted p-4 active:opacity-70 ${
        item.comingSoon ? "opacity-50" : ""
      }`}
      disabled={item.comingSoon}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: item.iconColor + "20" }}
      >
        <FontAwesome name={item.icon} size={18} color={item.iconColor} />
      </View>
      <View className="ml-3 flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="font-medium text-foreground">{item.title}</Text>
          {item.comingSoon && (
            <View className="rounded-full bg-muted-foreground/20 px-2 py-0.5">
              <Text className="text-xs text-muted-foreground">Soon</Text>
            </View>
          )}
        </View>
        <Text className="text-sm text-muted-foreground">{item.subtitle}</Text>
      </View>
      <FontAwesome
        name="chevron-right"
        size={14}
        color={Colors.mutedForeground}
      />
    </Pressable>
  );
}
