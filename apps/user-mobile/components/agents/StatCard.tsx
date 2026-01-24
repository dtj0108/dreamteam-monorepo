import { View, Text, Pressable } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { Colors } from "@/constants/Colors";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  href: string;
  color?: string;
  showAlert?: boolean;
}

export function StatCard({
  label,
  value,
  icon,
  href,
  color = Colors.primary,
  showAlert,
}: StatCardProps) {
  const router = useRouter();

  return (
    <Pressable
      className="relative flex-1 active:opacity-80"
      onPress={() => router.push(href as any)}
    >
      {/* Folder tab at top */}
      <View
        className="absolute left-0 top-0 h-4 w-14 rounded-t-xl"
        style={{ backgroundColor: "#e5e5e5" }}
      />

      {/* Main folder body */}
      <View
        className="mt-2 rounded-2xl rounded-tl-none p-4"
        style={{ backgroundColor: "#f5f5f5" }}
      >
        {/* Icon */}
        <View
          className="h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: color + "20" }}
        >
          <FontAwesome name={icon} size={18} color={color} />
        </View>

        {/* Label */}
        <Text className="mt-3 text-sm font-medium text-muted-foreground">{label}</Text>

        {/* Value */}
        <Text className="text-2xl font-bold text-foreground">{value}</Text>

        {/* Alert indicator */}
        {showAlert && (
          <View
            className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
      </View>
    </Pressable>
  );
}
