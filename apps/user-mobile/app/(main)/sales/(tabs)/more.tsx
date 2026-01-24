import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { ProductSwitcher } from "../../../../components/ProductSwitcher";

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
            Additional sales features
          </Text>
        </View>

        {/* Menu Items */}
        <View className="gap-2">
          <MenuItem
            icon="bar-chart"
            iconColor="#8b5cf6"
            title="Reports"
            subtitle="Pipeline & activity analytics"
            onPress={() => router.push("/(main)/sales/reports")}
          />
          <MenuItem
            icon="envelope"
            iconColor="#8b5cf6"
            title="Communications"
            subtitle="SMS & call history"
            onPress={() => {}}
            comingSoon
          />
          <MenuItem
            icon="inbox"
            iconColor="#f59e0b"
            title="Inbox"
            subtitle="Task triage & follow-ups"
            onPress={() => {}}
            comingSoon
          />

          <View className="my-4 h-px bg-border" />

          <MenuItem
            icon="code-fork"
            iconColor="#0ea5e9"
            title="Workflows"
            subtitle="Sales automation"
            onPress={() => {}}
            comingSoon
          />
          <MenuItem
            icon="sliders"
            iconColor="#6b7280"
            title="Customize"
            subtitle="Fields, statuses & pipelines"
            onPress={() => {}}
            comingSoon
          />
          <MenuItem
            icon="cog"
            iconColor="#6b7280"
            title="Settings"
            subtitle="Phone numbers & integrations"
            onPress={() => {}}
            comingSoon
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
  comingSoon,
}: {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  comingSoon?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-xl bg-muted p-4 active:opacity-70"
      disabled={comingSoon}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: iconColor + "20" }}
      >
        <FontAwesome name={icon} size={18} color={iconColor} />
      </View>
      <View className="ml-3 flex-1">
        <View className="flex-row items-center">
          <Text className="font-medium text-foreground">{title}</Text>
          {comingSoon && (
            <View className="ml-2 rounded bg-muted-foreground/20 px-1.5 py-0.5">
              <Text className="text-[10px] text-muted-foreground">SOON</Text>
            </View>
          )}
        </View>
        <Text className="text-sm text-muted-foreground">{subtitle}</Text>
      </View>
      <FontAwesome name="chevron-right" size={14} color={Colors.mutedForeground} />
    </Pressable>
  );
}
