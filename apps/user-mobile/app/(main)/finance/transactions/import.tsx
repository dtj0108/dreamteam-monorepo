import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
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
import { useAccounts } from "@/lib/hooks/useAccounts";
import {
  useCheckDuplicates,
  useImportTransactions,
} from "@/lib/hooks/useTransactions";
import { ImportTransactionInput } from "@/lib/api/transactions";
import { Account } from "@/lib/types/finance";

interface PendingTransaction {
  id: string;
  date: string;
  amount: string;
  description: string;
  isDuplicate?: boolean;
}

export default function ImportTransactionsScreen() {
  const router = useRouter();
  const { data: accountsData, isLoading: accountsLoading } = useAccounts();
  const importMutation = useImportTransactions();
  const checkDuplicatesMutation = useCheckDuplicates();

  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [transactions, setTransactions] = useState<PendingTransaction[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [duplicatesChecked, setDuplicatesChecked] = useState(false);

  const accounts = accountsData?.accounts ?? [];

  // Add a blank transaction
  const addTransaction = () => {
    const newTxn: PendingTransaction = {
      id: Date.now().toString(),
      date: new Date().toISOString().split("T")[0],
      amount: "",
      description: "",
    };
    setTransactions([...transactions, newTxn]);
    setDuplicatesChecked(false);
  };

  // Update a transaction field
  const updateTransaction = (
    id: string,
    field: keyof PendingTransaction,
    value: string
  ) => {
    setTransactions(
      transactions.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
    setDuplicatesChecked(false);
  };

  // Remove a transaction
  const removeTransaction = (id: string) => {
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  // Parse amount (handle negative for expenses)
  const parseAmount = (amountStr: string): number => {
    const cleaned = amountStr.replace(/[$,]/g, "").trim();
    return parseFloat(cleaned) || 0;
  };

  // Check for duplicates
  const handleCheckDuplicates = async () => {
    if (!selectedAccount || transactions.length === 0) {
      Alert.alert("Error", "Please select an account and add transactions");
      return;
    }

    const validTransactions = transactions.filter(
      (t) => t.description && t.amount
    );
    if (validTransactions.length === 0) {
      Alert.alert("Error", "Please fill in at least one complete transaction");
      return;
    }

    try {
      const result = await checkDuplicatesMutation.mutateAsync({
        account_id: selectedAccount.id,
        transactions: validTransactions.map((t) => ({
          date: t.date,
          amount: parseAmount(t.amount),
          description: t.description,
        })),
      });

      // Mark duplicates
      const updatedTransactions = validTransactions.map((t, index) => ({
        ...t,
        isDuplicate: result.results[index]?.isDuplicate ?? false,
      }));
      setTransactions(updatedTransactions);
      setDuplicatesChecked(true);

      if (result.duplicateCount > 0) {
        Alert.alert(
          "Duplicates Found",
          `${result.duplicateCount} potential duplicate(s) found. These will be ${skipDuplicates ? "skipped" : "imported anyway"}.`
        );
      } else {
        Alert.alert("No Duplicates", "All transactions appear to be unique.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to check for duplicates");
    }
  };

  // Import transactions
  const handleImport = async () => {
    if (!selectedAccount) {
      Alert.alert("Error", "Please select an account");
      return;
    }

    const validTransactions = transactions.filter(
      (t) => t.description && t.amount && t.date
    );
    if (validTransactions.length === 0) {
      Alert.alert("Error", "Please add at least one valid transaction");
      return;
    }

    const importData: ImportTransactionInput[] = validTransactions.map((t) => ({
      date: t.date,
      amount: parseAmount(t.amount),
      description: t.description,
    }));

    try {
      const result = await importMutation.mutateAsync({
        account_id: selectedAccount.id,
        skip_duplicates: skipDuplicates,
        transactions: importData,
      });

      Alert.alert(
        "Import Complete",
        `Successfully imported ${result.imported} of ${result.total} transactions.${result.skipped_duplicates > 0 ? ` (${result.skipped_duplicates} duplicates skipped)` : ""}`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to import transactions. Please try again.");
    }
  };

  if (accountsLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <Loading />
      </SafeAreaView>
    );
  }

  const duplicateCount = transactions.filter((t) => t.isDuplicate).length;
  const validCount = transactions.filter(
    (t) => t.description && t.amount
  ).length;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between py-4">
            <View className="flex-row items-center">
              <Pressable onPress={() => router.back()} className="mr-3">
                <FontAwesome
                  name="chevron-left"
                  size={18}
                  color={Colors.primary}
                />
              </Pressable>
              <View>
                <Text className="text-2xl font-bold text-foreground">
                  Import Transactions
                </Text>
                <Text className="text-muted-foreground">
                  Bulk add multiple transactions
                </Text>
              </View>
            </View>
          </View>

          {/* Account Selector */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-foreground">
              Account
            </Text>
            <Pressable
              className="flex-row items-center justify-between rounded-xl bg-muted p-4"
              onPress={() => setShowAccountPicker(!showAccountPicker)}
            >
              <Text
                className={
                  selectedAccount ? "text-foreground" : "text-muted-foreground"
                }
              >
                {selectedAccount?.name || "Select an account"}
              </Text>
              <FontAwesome
                name={showAccountPicker ? "chevron-up" : "chevron-down"}
                size={14}
                color={Colors.mutedForeground}
              />
            </Pressable>

            {showAccountPicker && (
              <View className="mt-2 rounded-xl bg-muted">
                {accounts.map((account) => (
                  <Pressable
                    key={account.id}
                    className="flex-row items-center border-b border-border p-4 last:border-b-0"
                    onPress={() => {
                      setSelectedAccount(account);
                      setShowAccountPicker(false);
                      setDuplicatesChecked(false);
                    }}
                  >
                    <FontAwesome
                      name="university"
                      size={16}
                      color={Colors.primary}
                    />
                    <Text className="ml-3 flex-1 text-foreground">
                      {account.name}
                    </Text>
                    {selectedAccount?.id === account.id && (
                      <FontAwesome
                        name="check"
                        size={14}
                        color={Colors.primary}
                      />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Skip Duplicates Toggle */}
          <Pressable
            className="mb-4 flex-row items-center justify-between rounded-xl bg-muted p-4"
            onPress={() => setSkipDuplicates(!skipDuplicates)}
          >
            <View className="flex-row items-center">
              <FontAwesome name="copy" size={16} color={Colors.mutedForeground} />
              <Text className="ml-3 text-foreground">Skip duplicates</Text>
            </View>
            <View
              className={`h-6 w-10 items-center justify-center rounded-full ${
                skipDuplicates ? "bg-primary" : "bg-border"
              }`}
            >
              <View
                className={`h-4 w-4 rounded-full bg-white ${
                  skipDuplicates ? "ml-4" : "mr-4"
                }`}
              />
            </View>
          </Pressable>

          {/* Transactions List */}
          <View className="mb-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-foreground">
                Transactions ({transactions.length})
              </Text>
              <Pressable
                className="flex-row items-center rounded-lg bg-primary px-3 py-2"
                onPress={addTransaction}
              >
                <FontAwesome name="plus" size={12} color="white" />
                <Text className="ml-2 text-sm font-medium text-white">Add</Text>
              </Pressable>
            </View>

            {transactions.length === 0 ? (
              <View className="items-center rounded-xl bg-muted py-8">
                <FontAwesome
                  name="download"
                  size={36}
                  color={Colors.mutedForeground}
                />
                <Text className="mt-2 text-muted-foreground">
                  No transactions to import
                </Text>
                <Pressable
                  className="mt-4 rounded-lg bg-primary px-4 py-2"
                  onPress={addTransaction}
                >
                  <Text className="font-medium text-white">
                    Add Transaction
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View className="gap-3">
                {transactions.map((txn, index) => (
                  <TransactionRow
                    key={txn.id}
                    transaction={txn}
                    index={index}
                    onUpdate={(field, value) =>
                      updateTransaction(txn.id, field, value)
                    }
                    onRemove={() => removeTransaction(txn.id)}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Summary */}
          {transactions.length > 0 && (
            <View className="mb-4 rounded-xl bg-muted p-4">
              <Text className="mb-2 font-medium text-foreground">Summary</Text>
              <View className="flex-row justify-between">
                <Text className="text-muted-foreground">
                  Valid transactions:
                </Text>
                <Text className="font-medium text-foreground">{validCount}</Text>
              </View>
              {duplicatesChecked && (
                <View className="mt-1 flex-row justify-between">
                  <Text className="text-muted-foreground">
                    Potential duplicates:
                  </Text>
                  <Text
                    className={`font-medium ${duplicateCount > 0 ? "text-amber-500" : "text-green-500"}`}
                  >
                    {duplicateCount}
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Bottom Actions */}
        <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-background p-4">
          <View className="flex-row gap-3">
            <Pressable
              className={`flex-1 items-center rounded-xl py-3 ${
                checkDuplicatesMutation.isPending
                  ? "bg-muted"
                  : "bg-amber-500/10"
              }`}
              onPress={handleCheckDuplicates}
              disabled={
                checkDuplicatesMutation.isPending ||
                !selectedAccount ||
                transactions.length === 0
              }
            >
              {checkDuplicatesMutation.isPending ? (
                <Text className="font-medium text-muted-foreground">
                  Checking...
                </Text>
              ) : (
                <Text className="font-medium text-amber-600">
                  Check Duplicates
                </Text>
              )}
            </Pressable>
            <Pressable
              className={`flex-1 items-center rounded-xl py-3 ${
                importMutation.isPending || !selectedAccount || validCount === 0
                  ? "bg-primary/50"
                  : "bg-primary"
              }`}
              onPress={handleImport}
              disabled={
                importMutation.isPending ||
                !selectedAccount ||
                validCount === 0
              }
            >
              <Text className="font-medium text-white">
                {importMutation.isPending
                  ? "Importing..."
                  : `Import ${validCount}`}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TransactionRow({
  transaction,
  index,
  onUpdate,
  onRemove,
}: {
  transaction: PendingTransaction;
  index: number;
  onUpdate: (field: keyof PendingTransaction, value: string) => void;
  onRemove: () => void;
}) {
  return (
    <View
      className={`rounded-xl p-4 ${
        transaction.isDuplicate ? "bg-amber-500/10" : "bg-muted"
      }`}
    >
      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Text className="font-medium text-foreground">
            Transaction {index + 1}
          </Text>
          {transaction.isDuplicate && (
            <View className="ml-2 rounded-full bg-amber-500 px-2 py-0.5">
              <Text className="text-xs font-medium text-white">Duplicate?</Text>
            </View>
          )}
        </View>
        <Pressable onPress={onRemove}>
          <FontAwesome name="trash" size={16} color={Colors.destructive} />
        </Pressable>
      </View>

      {/* Date */}
      <View className="mb-2">
        <Text className="mb-1 text-xs text-muted-foreground">Date</Text>
        <TextInput
          className="rounded-lg bg-background p-3 text-foreground"
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.mutedForeground}
          value={transaction.date}
          onChangeText={(v) => onUpdate("date", v)}
        />
      </View>

      {/* Amount */}
      <View className="mb-2">
        <Text className="mb-1 text-xs text-muted-foreground">
          Amount (negative for expense)
        </Text>
        <TextInput
          className="rounded-lg bg-background p-3 text-foreground"
          placeholder="-50.00"
          placeholderTextColor={Colors.mutedForeground}
          value={transaction.amount}
          onChangeText={(v) => onUpdate("amount", v)}
          keyboardType="numeric"
        />
      </View>

      {/* Description */}
      <View>
        <Text className="mb-1 text-xs text-muted-foreground">Description</Text>
        <TextInput
          className="rounded-lg bg-background p-3 text-foreground"
          placeholder="Coffee at Starbucks"
          placeholderTextColor={Colors.mutedForeground}
          value={transaction.description}
          onChangeText={(v) => onUpdate("description", v)}
        />
      </View>
    </View>
  );
}
