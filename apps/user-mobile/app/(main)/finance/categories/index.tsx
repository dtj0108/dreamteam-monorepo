import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Loading } from "@/components/Loading";
import { Colors } from "@/constants/Colors";
import { useCategories } from "@/lib/hooks/useCategories";
import { Category } from "@/lib/types/finance";

type TabType = "expense" | "income";

export default function CategoriesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("expense");
  const { data, isLoading, refetch, isRefetching } = useCategories();

  const categories = data?.categories ?? [];
  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");
  const displayedCategories =
    activeTab === "expense" ? expenseCategories : incomeCategories;

  // Separate system and custom categories
  const systemCategories = displayedCategories.filter((c) => c.is_system);
  const customCategories = displayedCategories.filter((c) => !c.is_system);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
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
                Categories
              </Text>
              <Text className="text-muted-foreground">
                Organize your transactions
              </Text>
            </View>
          </View>
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full bg-primary"
            onPress={() => router.push("/(main)/finance/categories/new")}
          >
            <FontAwesome name="plus" size={18} color="white" />
          </Pressable>
        </View>

        {/* Summary */}
        <View className="mb-4 flex-row gap-3">
          <View className="flex-1 rounded-xl bg-muted p-3">
            <Text className="text-sm text-muted-foreground">Expense</Text>
            <Text className="text-xl font-bold text-foreground">
              {expenseCategories.length}
            </Text>
          </View>
          <View className="flex-1 rounded-xl bg-muted p-3">
            <Text className="text-sm text-muted-foreground">Income</Text>
            <Text className="text-xl font-bold text-foreground">
              {incomeCategories.length}
            </Text>
          </View>
          <View className="flex-1 rounded-xl bg-muted p-3">
            <Text className="text-sm text-muted-foreground">Custom</Text>
            <Text className="text-xl font-bold text-foreground">
              {categories.filter((c) => !c.is_system).length}
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View className="mb-4 flex-row gap-2">
          <TabButton
            label={`Expense (${expenseCategories.length})`}
            active={activeTab === "expense"}
            onPress={() => setActiveTab("expense")}
          />
          <TabButton
            label={`Income (${incomeCategories.length})`}
            active={activeTab === "income"}
            onPress={() => setActiveTab("income")}
          />
        </View>

        {/* Loading State */}
        {isLoading && <Loading />}

        {/* Category Lists */}
        {!isLoading && (
          <>
            {/* Custom Categories */}
            {customCategories.length > 0 && (
              <View className="mb-6">
                <Text className="mb-3 text-sm font-medium uppercase text-muted-foreground">
                  Custom Categories
                </Text>
                <View className="gap-2">
                  {customCategories.map((category) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      onPress={() =>
                        router.push(`/(main)/finance/categories/${category.id}`)
                      }
                    />
                  ))}
                </View>
              </View>
            )}

            {/* System Categories */}
            {systemCategories.length > 0 && (
              <View className="mb-6">
                <Text className="mb-3 text-sm font-medium uppercase text-muted-foreground">
                  System Categories
                </Text>
                <View className="gap-2">
                  {systemCategories.map((category) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      isSystem
                      onPress={() =>
                        router.push(`/(main)/finance/categories/${category.id}`)
                      }
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Empty State */}
            {displayedCategories.length === 0 && (
              <View className="items-center py-8">
                <FontAwesome
                  name="tags"
                  size={48}
                  color={Colors.mutedForeground}
                />
                <Text className="mt-4 text-lg font-medium text-foreground">
                  No {activeTab} categories
                </Text>
                <Text className="mt-1 text-center text-muted-foreground">
                  Create a custom category to get started
                </Text>
                <Pressable
                  className="mt-4 rounded-lg bg-primary px-6 py-3"
                  onPress={() => router.push("/(main)/finance/categories/new")}
                >
                  <Text className="font-medium text-white">Add Category</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CategoryCard({
  category,
  isSystem,
  onPress,
}: {
  category: Category;
  isSystem?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="flex-row items-center rounded-xl bg-muted p-4"
      onPress={onPress}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: category.color || Colors.primary }}
      >
        <FontAwesome
          name={(category.icon as "tag") || "tag"}
          size={16}
          color="white"
        />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-medium text-foreground">{category.name}</Text>
        <Text className="text-sm text-muted-foreground">
          {category.type === "expense" ? "Expense" : "Income"}
          {isSystem && " • System"}
        </Text>
      </View>
      <FontAwesome name="chevron-right" size={14} color={Colors.mutedForeground} />
    </Pressable>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`rounded-full px-4 py-2 ${active ? "bg-primary" : "bg-muted"}`}
      onPress={onPress}
    >
      <Text
        className={`text-sm font-medium ${
          active ? "text-white" : "text-muted-foreground"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
