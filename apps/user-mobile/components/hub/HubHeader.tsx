import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/providers/auth-provider";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HubHeader() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Try to get first name from user metadata or email
  const firstName = user?.user_metadata?.first_name ||
    user?.user_metadata?.name?.split(" ")[0] ||
    user?.email?.split("@")[0];

  const greeting = getGreeting();

  return (
    <View
      style={{ paddingTop: insets.top + 24 }}
      className="px-6 pb-8"
    >
      <Text className="text-3xl font-bold text-foreground">
        {greeting}{firstName ? `, ${firstName}` : ""}
      </Text>
      <Text className="mt-2 text-base text-muted-foreground">
        What would you like to work on?
      </Text>
    </View>
  );
}
