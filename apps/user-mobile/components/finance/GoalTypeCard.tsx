import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Pressable, Text, View } from "react-native";

import { Colors } from "@/constants/Colors";

interface GoalTypeCardProps {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
  count?: number;
  onPress: () => void;
}

export function GoalTypeCard({
  title,
  subtitle,
  icon,
  color,
  count,
  onPress,
}: GoalTypeCardProps) {
  return (
    <Pressable
      className="flex-row items-center rounded-xl bg-muted p-4 active:opacity-70"
      onPress={onPress}
    >
      <View
        className="h-12 w-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: color + "20" }}
      >
        <FontAwesome name={icon} size={20} color={color} />
      </View>
      <View className="ml-4 flex-1">
        <Text className="font-semibold text-foreground">{title}</Text>
        <Text className="text-sm text-muted-foreground">{subtitle}</Text>
      </View>
      {count !== undefined && count > 0 && (
        <View
          className="mr-2 h-6 min-w-[24px] items-center justify-center rounded-full px-2"
          style={{ backgroundColor: color }}
        >
          <Text className="text-xs font-bold text-white">{count}</Text>
        </View>
      )}
      <FontAwesome
        name="chevron-right"
        size={14}
        color={Colors.mutedForeground}
      />
    </Pressable>
  );
}
