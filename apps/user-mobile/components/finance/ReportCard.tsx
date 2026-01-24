import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Pressable, Text, View } from "react-native";

import { Colors } from "@/constants/Colors";

interface ReportCardProps {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  iconColor: string;
  title: string;
  subtitle: string;
  value?: string;
  valueColor?: string;
  onPress: () => void;
}

export function ReportCard({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  valueColor,
  onPress,
}: ReportCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-xl bg-muted p-4 active:opacity-70"
    >
      <View
        className="h-12 w-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: iconColor + "20" }}
      >
        <FontAwesome name={icon} size={20} color={iconColor} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-semibold text-foreground">{title}</Text>
        <Text className="text-sm text-muted-foreground">{subtitle}</Text>
      </View>
      {value && (
        <Text
          className="mr-2 font-semibold"
          style={{ color: valueColor || Colors.foreground }}
        >
          {value}
        </Text>
      )}
      <FontAwesome name="chevron-right" size={14} color={Colors.mutedForeground} />
    </Pressable>
  );
}
