import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Loading } from "@/components/Loading";
import { Colors } from "@/constants/Colors";
import { useDisconnectBank, usePlaidAccounts, useSyncPlaidItem } from "@/lib/hooks/usePlaid";
import { PlaidItem, PlaidItemStatus } from "@/lib/types/finance";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
};

const STATUS_CONFIG: Record<
  PlaidItemStatus,
  { color: string; icon: string; label: string }
> = {
  good: { color: "#22c55e", icon: "check-circle", label: "Connected" },
  error: { color: "#ef4444", icon: "exclamation-circle", label: "Error" },
  pending: { color: "#f59e0b", icon: "clock-o", label: "Update Required" },
};

export default function ConnectedBanksScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = usePlaidAccounts();
  const syncPlaidItem = useSyncPlaidItem();
  const disconnectBank = useDisconnectBank();

  const items = data?.items ?? [];

  const handleSync = async (item: PlaidItem) => {
    try {
      const result = await syncPlaidItem.mutateAsync(item.id);
      Alert.alert(
        "Sync Complete",
        `Added ${result.added} transactions, updated ${result.modified}.`
      );
    } catch (error) {
      Alert.alert("Sync Failed", "Unable to sync transactions. Please try again.");
    }
  };

  const handleDisconnect = (item: PlaidItem) => {
    Alert.alert(
      "Disconnect Bank",
      `Are you sure you want to disconnect ${item.institution_name}? Your accounts will be kept but won't sync automatically.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              await disconnectBank.mutateAsync(item.id);
            } catch (error) {
              Alert.alert("Error", "Failed to disconnect bank.");
            }
          },
        },
      ]
    );
  };

  const handleFixConnection = (item: PlaidItem) => {
    // Navigate to connect screen with accessToken param for update mode
    router.push({
      pathname: "/finance/banks/connect",
      params: { itemId: item.id },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Pressable onPress={() => router.back()}>
          <FontAwesome name="chevron-left" size={18} color={Colors.primary} />
        </Pressable>
        <Text className="text-lg font-semibold text-foreground">Connected Banks</Text>
        <Pressable onPress={() => router.push("/finance/banks/connect")}>
          <FontAwesome name="plus" size={18} color={Colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {isLoading && <Loading />}

        {!isLoading && items.length === 0 && (
          <View className="mt-16 items-center">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-muted">
              <FontAwesome name="university" size={36} color={Colors.mutedForeground} />
            </View>
            <Text className="mt-4 text-lg font-medium text-foreground">
              No banks connected
            </Text>
            <Text className="mt-1 text-center text-muted-foreground">
              Connect your bank to automatically sync transactions
            </Text>
            <Pressable
              className="mt-6 rounded-xl bg-primary px-6 py-3"
              onPress={() => router.push("/finance/banks/connect")}
            >
              <Text className="font-medium text-white">Connect Bank</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && items.length > 0 && (
          <View className="mt-4">
            {items.map((item) => (
              <BankCard
                key={item.id}
                item={item}
                onSync={() => handleSync(item)}
                onDisconnect={() => handleDisconnect(item)}
                onFixConnection={() => handleFixConnection(item)}
                isSyncing={syncPlaidItem.isPending}
              />
            ))}

            <Pressable
              className="mt-4 flex-row items-center justify-center rounded-xl border-2 border-dashed border-border py-4"
              onPress={() => router.push("/finance/banks/connect")}
            >
              <FontAwesome name="plus" size={16} color={Colors.primary} />
              <Text className="ml-2 font-medium text-primary">Connect Another Bank</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BankCard({
  item,
  onSync,
  onDisconnect,
  onFixConnection,
  isSyncing,
}: {
  item: PlaidItem;
  onSync: () => void;
  onDisconnect: () => void;
  onFixConnection: () => void;
  isSyncing: boolean;
}) {
  const statusConfig = STATUS_CONFIG[item.status];

  return (
    <View className="mb-3 rounded-xl bg-muted p-4">
      {/* Bank Header */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="h-10 w-10 items-center justify-center rounded-lg bg-background">
            <FontAwesome name="university" size={18} color={Colors.primary} />
          </View>
          <View className="ml-3">
            <Text className="font-semibold text-foreground">{item.institution_name}</Text>
            <View className="mt-1 flex-row items-center">
              <FontAwesome
                name={statusConfig.icon as any}
                size={12}
                color={statusConfig.color}
              />
              <Text
                className="ml-1 text-xs font-medium"
                style={{ color: statusConfig.color }}
              >
                {statusConfig.label}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Error Message */}
      {item.status === "error" && item.error_message && (
        <View className="mt-3 rounded-lg bg-red-500/10 px-3 py-2">
          <Text className="text-sm text-red-500">{item.error_message}</Text>
        </View>
      )}

      {/* Accounts */}
      {item.accounts.length > 0 && item.status === "good" && (
        <View className="mt-3 border-t border-border pt-3">
          {item.accounts.map((account) => (
            <View key={account.id} className="flex-row items-center justify-between py-1">
              <Text className="text-sm text-muted-foreground">
                {account.name}
                {account.last_four && ` ••••${account.last_four}`}
              </Text>
              <Text className="text-sm font-medium text-foreground">
                {formatCurrency(account.balance)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Last Sync */}
      {item.last_successful_update && item.status === "good" && (
        <Text className="mt-2 text-xs text-muted-foreground">
          Last synced: {formatRelativeTime(item.last_successful_update)}
        </Text>
      )}

      {/* Actions */}
      <View className="mt-3 flex-row gap-2">
        {item.status === "error" || item.status === "pending" ? (
          <Pressable
            className="flex-1 flex-row items-center justify-center rounded-lg bg-primary py-2"
            onPress={onFixConnection}
          >
            <FontAwesome name="refresh" size={14} color="white" />
            <Text className="ml-2 font-medium text-white">Fix Connection</Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              className="flex-1 flex-row items-center justify-center rounded-lg bg-background py-2"
              onPress={onSync}
              disabled={isSyncing}
            >
              <FontAwesome name="refresh" size={14} color={Colors.primary} />
              <Text className="ml-2 font-medium text-primary">
                {isSyncing ? "Syncing..." : "Sync"}
              </Text>
            </Pressable>
            <Pressable
              className="flex-row items-center justify-center rounded-lg bg-background px-4 py-2"
              onPress={onDisconnect}
            >
              <FontAwesome name="unlink" size={14} color={Colors.mutedForeground} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
