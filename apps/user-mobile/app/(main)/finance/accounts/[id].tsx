import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Loading } from "@/components/Loading";
import { Colors } from "@/constants/Colors";
import {
  useAccount,
  useDeleteAccount,
  useUpdateAccount,
} from "@/lib/hooks/useAccounts";
import { useTransactions } from "@/lib/hooks/useTransactions";
import {
  ACCOUNT_TYPE_COLORS,
  AccountType,
  getTransactionColor,
} from "@/lib/types/finance";

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string }[] = [
  { value: "checking", label: "Checking", icon: "bank" },
  { value: "savings", label: "Savings", icon: "dollar" },
  { value: "credit_card", label: "Credit Card", icon: "credit-card" },
  { value: "cash", label: "Cash", icon: "money" },
  { value: "investment", label: "Investment", icon: "line-chart" },
  { value: "loan", label: "Loan", icon: "file-text" },
  { value: "other", label: "Other", icon: "ellipsis-h" },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: account, isLoading } = useAccount(id);
  const { data: transactionsData } = useTransactions({ accountId: id, limit: 10 });
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("checking");
  const [institution, setInstitution] = useState("");
  const [lastFour, setLastFour] = useState("");

  const startEditing = () => {
    if (account) {
      setName(account.name);
      setType(account.type);
      setInstitution(account.institution || "");
      setLastFour(account.last_four || "");
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter an account name");
      return;
    }

    try {
      await updateAccount.mutateAsync({
        id,
        data: {
          name: name.trim(),
          type,
          institution: institution.trim() || undefined,
          last_four: lastFour.trim() || undefined,
        },
      });
      setIsEditing(false);
    } catch (error) {
      Alert.alert("Error", "Failed to update account. Please try again.");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete this account? This will also delete all transactions associated with it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount.mutateAsync(id);
              router.back();
            } catch (error) {
              Alert.alert("Error", "Failed to delete account.");
            }
          },
        },
      ]
    );
  };

  if (isLoading || !account) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Loading />
      </SafeAreaView>
    );
  }

  const typeColor = ACCOUNT_TYPE_COLORS[account.type] || Colors.mutedForeground;
  const transactions = transactionsData?.transactions ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Pressable onPress={() => router.back()}>
            <FontAwesome name="chevron-left" size={18} color={Colors.primary} />
          </Pressable>
          <Text className="text-lg font-semibold text-foreground">
            {isEditing ? "Edit Account" : "Account Details"}
          </Text>
          {isEditing ? (
            <Pressable onPress={handleSave} disabled={updateAccount.isPending}>
              {updateAccount.isPending ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text className="font-semibold text-primary">Save</Text>
              )}
            </Pressable>
          ) : (
            <Pressable onPress={startEditing}>
              <Text className="text-primary">Edit</Text>
            </Pressable>
          )}
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
          {isEditing ? (
            /* Edit Mode */
            <View className="px-4">
              {/* Account Name */}
              <View className="mt-6">
                <Text className="mb-2 text-sm font-medium text-muted-foreground">
                  Account Name
                </Text>
                <TextInput
                  className="rounded-xl bg-muted px-4 py-3 text-foreground"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Account Type */}
              <View className="mt-6">
                <Text className="mb-2 text-sm font-medium text-muted-foreground">
                  Account Type
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {ACCOUNT_TYPES.map((accountType) => {
                    const isSelected = type === accountType.value;
                    const color = ACCOUNT_TYPE_COLORS[accountType.value];
                    return (
                      <Pressable
                        key={accountType.value}
                        onPress={() => setType(accountType.value)}
                        className={`flex-row items-center rounded-full px-4 py-2 ${
                          isSelected ? "border-2" : "bg-muted"
                        }`}
                        style={
                          isSelected
                            ? { borderColor: color, backgroundColor: color + "20" }
                            : {}
                        }
                      >
                        <FontAwesome
                          name={accountType.icon as any}
                          size={14}
                          color={isSelected ? color : Colors.mutedForeground}
                        />
                        <Text
                          className={`ml-2 text-sm font-medium ${
                            isSelected ? "" : "text-muted-foreground"
                          }`}
                          style={isSelected ? { color } : {}}
                        >
                          {accountType.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Institution */}
              <View className="mt-6">
                <Text className="mb-2 text-sm font-medium text-muted-foreground">
                  Institution
                </Text>
                <TextInput
                  className="rounded-xl bg-muted px-4 py-3 text-foreground"
                  placeholder="e.g., Chase, Bank of America"
                  placeholderTextColor={Colors.mutedForeground}
                  value={institution}
                  onChangeText={setInstitution}
                />
              </View>

              {/* Last 4 Digits */}
              <View className="mt-6">
                <Text className="mb-2 text-sm font-medium text-muted-foreground">
                  Last 4 Digits
                </Text>
                <TextInput
                  className="rounded-xl bg-muted px-4 py-3 text-foreground"
                  placeholder="1234"
                  placeholderTextColor={Colors.mutedForeground}
                  value={lastFour}
                  onChangeText={setLastFour}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>

              {/* Delete Button */}
              <Pressable
                className="mt-8 items-center rounded-xl bg-red-500/10 py-4"
                onPress={handleDelete}
              >
                <Text className="font-medium text-red-500">Delete Account</Text>
              </Pressable>
            </View>
          ) : (
            /* View Mode */
            <>
              {/* Account Header */}
              <View className="items-center px-4 py-8">
                <View
                  className="h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: typeColor + "20" }}
                >
                  <FontAwesome name="university" size={28} color={typeColor} />
                </View>
                <Text className="mt-4 text-xl font-bold text-foreground">
                  {account.name}
                </Text>
                {account.institution && (
                  <Text className="mt-1 text-muted-foreground">
                    {account.institution}
                    {account.last_four && ` ••••${account.last_four}`}
                  </Text>
                )}
                <Text className="mt-4 text-3xl font-bold text-foreground">
                  {formatCurrency(account.balance)}
                </Text>
              </View>

              {/* Recent Transactions */}
              <View className="px-4">
                <Text className="mb-3 text-sm font-medium uppercase text-muted-foreground">
                  Recent Transactions
                </Text>
                {transactions.length > 0 ? (
                  transactions.map((txn) => (
                    <Pressable
                      key={txn.id}
                      className="mb-2 flex-row items-center rounded-xl bg-muted p-4"
                      onPress={() => router.push(`/finance/transactions/${txn.id}`)}
                    >
                      <View className="flex-1">
                        <Text className="font-medium text-foreground">
                          {txn.description}
                        </Text>
                        <Text className="text-sm text-muted-foreground">
                          {formatDate(txn.date)}
                          {txn.category && ` • ${txn.category.name}`}
                        </Text>
                      </View>
                      <Text
                        className="text-lg font-semibold"
                        style={{ color: getTransactionColor(txn.amount) }}
                      >
                        {txn.amount > 0 ? "+" : ""}
                        {formatCurrency(txn.amount)}
                      </Text>
                    </Pressable>
                  ))
                ) : (
                  <View className="items-center py-8">
                    <FontAwesome
                      name="exchange"
                      size={32}
                      color={Colors.mutedForeground}
                    />
                    <Text className="mt-2 text-muted-foreground">
                      No transactions yet
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
