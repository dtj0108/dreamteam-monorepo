import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
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

import { Colors } from "@/constants/Colors";
import { useCreateAccount } from "@/lib/hooks/useAccounts";
import { ACCOUNT_TYPE_COLORS, AccountType } from "@/lib/types/finance";

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string }[] = [
  { value: "checking", label: "Checking", icon: "bank" },
  { value: "savings", label: "Savings", icon: "dollar" },
  { value: "credit_card", label: "Credit Card", icon: "credit-card" },
  { value: "cash", label: "Cash", icon: "money" },
  { value: "investment", label: "Investment", icon: "line-chart" },
  { value: "loan", label: "Loan", icon: "file-text" },
  { value: "other", label: "Other", icon: "ellipsis-h" },
];

export default function NewAccountScreen() {
  const router = useRouter();
  const createAccount = useCreateAccount();

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("checking");
  const [balance, setBalance] = useState("");
  const [institution, setInstitution] = useState("");
  const [lastFour, setLastFour] = useState("");

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter an account name");
      return;
    }

    try {
      await createAccount.mutateAsync({
        name: name.trim(),
        type,
        balance: balance ? parseFloat(balance) : 0,
        institution: institution.trim() || undefined,
        last_four: lastFour.trim() || undefined,
      });
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to create account. Please try again.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Pressable onPress={() => router.back()}>
            <Text className="text-primary">Cancel</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-foreground">
            Add Account
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={createAccount.isPending}
          >
            {createAccount.isPending ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text className="font-semibold text-primary">Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Account Name */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Account Name
            </Text>
            <TextInput
              className="rounded-xl bg-muted px-4 py-3 text-foreground"
              placeholder="e.g., Chase Checking"
              placeholderTextColor={Colors.mutedForeground}
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
                    style={isSelected ? { borderColor: color, backgroundColor: color + "20" } : {}}
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

          {/* Starting Balance */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Starting Balance
            </Text>
            <View className="flex-row items-center rounded-xl bg-muted px-4">
              <Text className="text-lg text-muted-foreground">$</Text>
              <TextInput
                className="flex-1 py-3 pl-2 text-lg text-foreground"
                placeholder="0.00"
                placeholderTextColor={Colors.mutedForeground}
                value={balance}
                onChangeText={setBalance}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Institution (Optional) */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Institution (Optional)
            </Text>
            <TextInput
              className="rounded-xl bg-muted px-4 py-3 text-foreground"
              placeholder="e.g., Chase, Bank of America"
              placeholderTextColor={Colors.mutedForeground}
              value={institution}
              onChangeText={setInstitution}
            />
          </View>

          {/* Last 4 Digits (Optional) */}
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Last 4 Digits (Optional)
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
