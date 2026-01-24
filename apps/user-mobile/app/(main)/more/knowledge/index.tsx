import FontAwesome from "@expo/vector-icons/FontAwesome";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PageCard } from "@/components/knowledge/PageCard";
import { Colors } from "@/constants/Colors";
import { usePages } from "@/lib/hooks/useKnowledge";

type FilterMode = "all" | "favorites";

export default function KnowledgeIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const {
    data: pagesData,
    isLoading,
    refetch,
  } = usePages({
    favorites_only: filterMode === "favorites",
    archived: false,
  });

  const pages = pagesData?.pages || [];

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handlePagePress = (pageId: string) => {
    router.push(`/(main)/more/knowledge/${pageId}`);
  };

  const handleCreatePage = () => {
    router.push("/(main)/more/knowledge/new");
  };

  const handleSearch = () => {
    router.push("/(main)/more/knowledge/search");
  };

  return (
    <View className="flex-1 bg-background">
      {/* Filter Bar */}
      <View className="flex-row items-center gap-2 px-4 pt-2">
        <View className="flex-1 flex-row rounded-lg bg-muted p-1">
          <Pressable
            onPress={() => setFilterMode("all")}
            className={`flex-1 items-center rounded-md py-2 ${
              filterMode === "all" ? "bg-background" : ""
            }`}
          >
            <Text
              className={`font-medium ${
                filterMode === "all"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              All Pages
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilterMode("favorites")}
            className={`flex-1 flex-row items-center justify-center rounded-md py-2 ${
              filterMode === "favorites" ? "bg-background" : ""
            }`}
          >
            <FontAwesome
              name="star"
              size={14}
              color={
                filterMode === "favorites"
                  ? Colors.warning
                  : Colors.mutedForeground
              }
              style={{ marginRight: 4 }}
            />
            <Text
              className={`font-medium ${
                filterMode === "favorites"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Favorites
            </Text>
          </Pressable>
        </View>
        <Pressable
          onPress={handleSearch}
          className="h-9 w-9 items-center justify-center rounded-full active:bg-muted"
        >
          <Ionicons name="search" size={20} color={Colors.foreground} />
        </Pressable>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : pages.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons
            name="document-text-outline"
            size={64}
            color={Colors.mutedForeground}
          />
          <Text className="mt-4 text-center text-lg font-semibold text-foreground">
            {filterMode === "favorites"
              ? "No favorite pages yet"
              : "No pages yet"}
          </Text>
          <Text className="mt-2 text-center text-muted-foreground">
            {filterMode === "favorites"
              ? "Star pages to add them to your favorites"
              : "Create your first page to get started with your knowledge base"}
          </Text>
          {filterMode === "all" && (
            <Pressable
              onPress={handleCreatePage}
              className="mt-6 rounded-lg bg-primary px-6 py-3 active:opacity-80"
            >
              <Text className="font-semibold text-white">Create Page</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          {pages.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              onPress={() => handlePagePress(page.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      <Pressable
        onPress={handleCreatePage}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-80"
        style={{
          bottom: insets.bottom + 24,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </Pressable>
    </View>
  );
}
