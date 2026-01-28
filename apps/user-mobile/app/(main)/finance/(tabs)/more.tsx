import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProductSwitcher } from "@/components/ProductSwitcher";
import { Colors } from "@/constants/Colors";

export default function MoreScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={["top"]} className="bg-background">
        <View className="px-4 py-2">
          <ProductSwitcher />
        </View>
      </SafeAreaView>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="py-4">
          <Text className="text-2xl font-bold text-foreground">More</Text>
          <Text className="text-muted-foreground">
            Additional finance features
          </Text>
        </View>

        {/* Menu Items */}
        <View className="gap-2">
          <MenuItem
            icon="bullseye"
            iconColor="#22c55e"
            title="Goals"
            subtitle="Track revenue, profit & exit planning"
            onPress={() => router.push("/(main)/finance/goals")}
          />
          <MenuItem
            icon="repeat"
            iconColor="#8b5cf6"
            title="Subscriptions"
            subtitle="Manage recurring payments"
            onPress={() => router.push("/(main)/finance/subscriptions")}
          />
          <MenuItem
            icon="bar-chart"
            iconColor="#0ea5e9"
            title="Analytics"
            subtitle="Reports & financial insights"
            onPress={() => router.push("/(main)/finance/analytics")}
          />
          <MenuItem
            icon="dashboard"
            iconColor="#f59e0b"
            title="KPIs"
            subtitle="Industry-specific metrics"
            onPress={() => {}}
          />

          <View className="my-4 h-px bg-border" />

          <MenuItem
            icon="tags"
            iconColor="#6b7280"
            title="Categories"
            subtitle="Manage transaction categories"
            onPress={() => router.push("/(main)/finance/categories")}
          />
          <MenuItem
            icon="refresh"
            iconColor="#8b5cf6"
            title="Recurring Rules"
            subtitle="Automate recurring transactions"
            onPress={() => router.push("/(main)/finance/recurring")}
          />
          <MenuItem
            icon="cog"
            iconColor="#6b7280"
            title="Finance Settings"
            subtitle="Customize your finance workspace"
            onPress={() => router.push("/(main)/finance/settings")}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function MenuItem({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-xl bg-muted p-4 active:opacity-70"
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: iconColor + "20" }}
      >
        <FontAwesome name={icon} size={18} color={iconColor} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-medium text-foreground">{title}</Text>
        <Text className="text-sm text-muted-foreground">{subtitle}</Text>
      </View>
      <FontAwesome name="chevron-right" size={14} color={Colors.mutedForeground} />
    </Pressable>
  );
}
