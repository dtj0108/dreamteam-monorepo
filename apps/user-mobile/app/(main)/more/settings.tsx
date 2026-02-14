import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { ScrollView, View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const userName = user?.user_metadata?.name || "User";
  const userEmail = user?.email || "";
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      {/* Profile Card */}
      <View className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <View className="flex-row items-center">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Text className="text-xl font-bold text-white">{initials}</Text>
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-lg font-semibold text-foreground">
              {userName}
            </Text>
            <Text className="text-sm text-muted-foreground">{userEmail}</Text>
            {currentWorkspace && (
              <View className="mt-1 flex-row items-center">
                <View className="h-2 w-2 rounded-full bg-green-500" />
                <Text className="ml-1.5 text-xs text-muted-foreground">
                  {currentWorkspace.name}
                </Text>
              </View>
            )}
          </View>
          <Pressable className="rounded-full p-2 active:bg-muted">
            <FontAwesome name="pencil" size={16} color={Colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      {/* Account Section */}
      <View className="mx-4 mt-6">
        <Text className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Account
        </Text>
        <View className="rounded-2xl bg-white shadow-sm">
          <SettingsRow
            icon="user"
            label="Edit Profile"
            showChevron
          />
          <Divider />
          <SettingsRow
            icon="bell"
            label="Notifications"
            showChevron
            onPress={() => router.push("/(main)/more/notifications")}
          />
          <Divider />
          <SettingsRow
            icon="lock"
            label="Privacy & Security"
            showChevron
            onPress={() => router.push("/(main)/more/legal")}
          />
        </View>
      </View>

      {/* Preferences Section */}
      <View className="mx-4 mt-6">
        <Text className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Preferences
        </Text>
        <View className="rounded-2xl bg-white shadow-sm">
          <SettingsRow
            icon="moon-o"
            label="Appearance"
            value="System"
            showChevron
          />
          <Divider />
          <SettingsRow
            icon="globe"
            label="Language"
            value="English"
            showChevron
          />
        </View>
      </View>

      {/* Support Section */}
      <View className="mx-4 mt-6">
        <Text className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Support
        </Text>
        <View className="rounded-2xl bg-white shadow-sm">
          <SettingsRow
            icon="question-circle"
            label="Help Center"
            showChevron
          />
          <Divider />
          <SettingsRow
            icon="comment"
            label="Send Feedback"
            showChevron
          />
          <Divider />
          <SettingsRow
            icon="info-circle"
            label="About"
            value="v1.0.6"
            showChevron
          />
        </View>
      </View>

      {/* Sign Out */}
      <View className="mx-4 mt-8">
        <Pressable
          onPress={signOut}
          className="flex-row items-center justify-center rounded-2xl bg-white p-4 shadow-sm active:bg-red-50"
        >
          <FontAwesome name="sign-out" size={18} color={Colors.destructive} />
          <Text className="ml-2 font-semibold text-destructive">Sign Out</Text>
        </Pressable>
      </View>

      {/* Footer */}
      <View className="mt-8 items-center">
        <Text className="text-xs text-muted-foreground">
          dreamteam.ai
        </Text>
        <Text className="mt-1 text-xs text-muted-foreground">
          Made with 💙 for founders
        </Text>
      </View>
    </ScrollView>
  );
}

interface SettingsRowProps {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  label: string;
  value?: string;
  showChevron?: boolean;
  onPress?: () => void;
}

function SettingsRow({ icon, label, value, showChevron, onPress }: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-3.5 active:bg-muted/50"
    >
      <View className="h-8 w-8 items-center justify-center rounded-lg bg-muted">
        <FontAwesome name={icon} size={16} color={Colors.mutedForeground} />
      </View>
      <Text className="ml-3 flex-1 text-base text-foreground">{label}</Text>
      {value && (
        <Text className="mr-2 text-sm text-muted-foreground">{value}</Text>
      )}
      {showChevron && (
        <FontAwesome name="chevron-right" size={12} color={Colors.mutedForeground} />
      )}
    </Pressable>
  );
}

function Divider() {
  return <View className="ml-14 h-px bg-border" />;
}
