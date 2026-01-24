import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link } from "expo-router";
import { View, Text, Pressable } from "react-native";

import { Colors } from "@/constants/Colors";

interface MenuItemProps {
  href: string;
  icon?: React.ComponentProps<typeof FontAwesome>["name"];
  emoji?: string;
  title: string;
  description: string;
}

function MenuItem({ href, icon, emoji, title, description }: MenuItemProps) {
  return (
    <Link href={href as any} asChild>
      <Pressable className="flex-row items-center border-b border-border p-4">
        <View className="mr-4 h-10 w-10 items-center justify-center rounded-lg bg-secondary">
          {emoji ? (
            <Text style={{ fontSize: 20 }}>{emoji}</Text>
          ) : icon ? (
            <FontAwesome name={icon} size={20} color={Colors.primary} />
          ) : null}
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">
            {title}
          </Text>
          <Text className="text-sm text-muted-foreground">{description}</Text>
        </View>
        <FontAwesome name="chevron-right" size={14} color={Colors.mutedForeground} />
      </Pressable>
    </Link>
  );
}

export default function MoreScreen() {
  return (
    <View className="flex-1 bg-background">
      <MenuItem
        href="/(main)/more/knowledge"
        icon="book"
        title="Knowledge"
        description="Documents and wiki"
      />
      <MenuItem
        href="/(main)/more/settings"
        icon="cog"
        title="Settings"
        description="App preferences"
      />
    </View>
  );
}


