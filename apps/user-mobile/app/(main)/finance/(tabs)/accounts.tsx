import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Loading } from "@/components/Loading";
import { ProductSwitcher } from "@/components/ProductSwitcher";
import { Colors } from "@/constants/Colors";
import { useAccounts } from "@/lib/hooks/useAccounts";
import { Account, ACCOUNT_TYPE_COLORS, AccountType } from "@/lib/types/finance";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export default function AccountsScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useAccounts();

  const accounts = data?.accounts ?? [];
  const totals = data?.totals ?? { netWorth: 0, assets: 0, liabilities: 0 };

  const checkingAndCash = accounts.filter((a) =>
    ["checking", "cash"].includes(a.type)
  );
  const savingsAndInvestments = accounts.filter((a) =>
    ["savings", "investment"].includes(a.type)
  );
  const creditsAndLoans = accounts.filter((a) =>
    ["credit_card", "loan"].includes(a.type)
  );
  const other = accounts.filter((a) => a.type === "other");

  const hasAccounts = accounts.length > 0;

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={["top"]} className="bg-background">
        <View className="px-4 py-2">
          <ProductSwitcher />
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <View>
            <Text className="text-2xl font-bold text-foreground">Accounts</Text>
            <Text className="text-muted-foreground">Manage your accounts</Text>
          </View>
          <View className="flex-row gap-2">
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full bg-muted"
              onPress={() => router.push("/finance/banks")}
            >
              <FontAwesome name="university" size={16} color={Colors.primary} />
            </Pressable>
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full bg-primary"
              onPress={() => router.push("/finance/accounts/new")}
            >
              <FontAwesome name="plus" size={18} color="white" />
            </Pressable>
          </View>
        </View>

        {/* Loading State */}
        {isLoading && <Loading />}

        {/* Content */}
        {!isLoading && (
          <>
            {/* Balance Summary */}
            <View className="mb-4 rounded-xl bg-muted p-4">
              {/* Net Worth - Hero */}
              <View className="mb-3 items-center">
                <Text className="text-sm text-muted-foreground">Net Worth</Text>
                <Text className="text-3xl font-bold text-foreground">
                  {formatCurrency(totals.netWorth)}
                </Text>
              </View>

              {/* Assets & Liabilities Row */}
              <View className="flex-row justify-between border-t border-border pt-3">
                <View>
                  <Text className="text-sm text-muted-foreground">Assets</Text>
                  <Text className="text-lg font-semibold text-green-500">
                    {formatCurrency(totals.assets)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-sm text-muted-foreground">Liabilities</Text>
                  <Text className="text-lg font-semibold text-red-500">
                    {formatCurrency(totals.liabilities)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Account Sections */}
            {hasAccounts ? (
              <>
                <AccountSection
                  title="Cash & Checking"
                  accounts={checkingAndCash}
                  onPress={(id) => router.push(`/finance/accounts/${id}`)}
                />
                <AccountSection
                  title="Savings & Investments"
                  accounts={savingsAndInvestments}
                  onPress={(id) => router.push(`/finance/accounts/${id}`)}
                />
                <AccountSection
                  title="Credit Cards & Loans"
                  accounts={creditsAndLoans}
                  onPress={(id) => router.push(`/finance/accounts/${id}`)}
                />
                <AccountSection
                  title="Other"
                  accounts={other}
                  onPress={(id) => router.push(`/finance/accounts/${id}`)}
                />
              </>
            ) : (
              /* Empty State */
              <View className="my-8 items-center">
                <FontAwesome
                  name="university"
                  size={48}
                  color={Colors.mutedForeground}
                />
                <Text className="mt-4 text-lg font-medium text-foreground">
                  No accounts yet
                </Text>
                <Text className="mt-1 text-center text-muted-foreground">
                  Add your first account to start tracking your finances
                </Text>
                <Pressable
                  className="mt-4 rounded-lg bg-primary px-6 py-3"
                  onPress={() => router.push("/finance/accounts/new")}
                >
                  <Text className="font-medium text-white">Add Account</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function AccountSection({
  title,
  accounts,
  onPress,
}: {
  title: string;
  accounts: Account[];
  onPress: (id: string) => void;
}) {
  if (accounts.length === 0) return null;

  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium uppercase text-muted-foreground">
        {title}
      </Text>
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          onPress={() => onPress(account.id)}
        />
      ))}
    </View>
  );
}

function AccountCard({
  account,
  onPress,
}: {
  account: Account;
  onPress: () => void;
}) {
  const typeColor =
    ACCOUNT_TYPE_COLORS[account.type as AccountType] || Colors.mutedForeground;
  const isLiability = ["credit_card", "loan"].includes(account.type);

  return (
    <Pressable
      className="mb-2 flex-row items-center rounded-xl bg-muted p-4 active:opacity-70"
      onPress={onPress}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: typeColor + "20" }}
      >
        <FontAwesome name="university" size={18} color={typeColor} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-medium text-foreground">{account.name}</Text>
        {account.institution && (
          <Text className="text-sm text-muted-foreground">
            {account.institution}
            {account.last_four && ` ••••${account.last_four}`}
          </Text>
        )}
      </View>
      <Text
        className={`text-lg font-semibold ${
          isLiability ? "text-red-500" : "text-foreground"
        }`}
      >
        {formatCurrency(account.balance)}
      </Text>
    </Pressable>
  );
}
