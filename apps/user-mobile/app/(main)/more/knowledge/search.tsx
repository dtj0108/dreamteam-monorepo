import FontAwesome from "@expo/vector-icons/FontAwesome";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PageCard } from "@/components/knowledge/PageCard";
import { Colors } from "@/constants/Colors";
import { usePages } from "@/lib/hooks/useKnowledge";
import { KnowledgePage, Block, InlineContent } from "@/lib/types/knowledge";

export default function KnowledgeSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { data: pagesData, isLoading } = usePages({ archived: false });
  const pages = pagesData?.pages || [];

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Filter pages based on search query
  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return [];
    }

    const lowerQuery = debouncedQuery.toLowerCase();

    return pages.filter((page) => {
      // Search in title
      if (page.title.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // Search in content (extract text from BlockNote)
      const contentText = extractTextFromContent(page.content);
      if (contentText.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // Search in category names
      if (page.categories.some((cat) =>
        cat.name.toLowerCase().includes(lowerQuery)
      )) {
        return true;
      }

      return false;
    });
  }, [pages, debouncedQuery]);

  const handleBack = () => {
    router.back();
  };

  const handleClear = () => {
    setQuery("");
  };

  const handlePagePress = (pageId: string) => {
    router.push(`/(main)/more/knowledge/${pageId}`);
  };

  const hasSearched = debouncedQuery.trim().length > 0;

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View
        className="border-b border-border bg-background px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center">
          <Pressable
            onPress={handleBack}
            className="mr-3 h-8 w-8 items-center justify-center rounded-full active:bg-muted"
          >
            <Ionicons name="chevron-back" size={24} color={Colors.foreground} />
          </Pressable>

          {/* Search Input */}
          <View className="flex-1 flex-row items-center rounded-lg bg-muted px-3 py-2">
            <FontAwesome name="search" size={14} color={Colors.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search pages..."
              placeholderTextColor={Colors.mutedForeground}
              className="ml-2 flex-1 text-foreground"
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={handleClear} hitSlop={8}>
                <FontAwesome
                  name="times-circle"
                  size={16}
                  color={Colors.mutedForeground}
                />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Content */}
      {!hasSearched ? (
        // Initial state - prompt to search
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons
            name="search"
            size={64}
            color={Colors.mutedForeground}
          />
          <Text className="mt-4 text-center text-lg font-semibold text-foreground">
            Search your knowledge base
          </Text>
          <Text className="mt-2 text-center text-muted-foreground">
            Find pages by title, content, or category
          </Text>
        </View>
      ) : isLoading ? (
        // Loading state
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : searchResults.length === 0 ? (
        // No results
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons
            name="document-text-outline"
            size={64}
            color={Colors.mutedForeground}
          />
          <Text className="mt-4 text-center text-lg font-semibold text-foreground">
            No results found
          </Text>
          <Text className="mt-2 text-center text-muted-foreground">
            Try a different search term or create a new page
          </Text>
        </View>
      ) : (
        // Results
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 16 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-3 flex-row">
            <View className="rounded-full bg-muted px-3 py-1">
              <Text className="text-sm font-medium text-muted-foreground">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>
          {searchResults.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              onPress={() => handlePagePress(page.id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// Helper function to extract text from BlockNote content
function extractTextFromContent(content: Block[]): string {
  if (!content || !Array.isArray(content)) {
    return "";
  }

  return content
    .map((block) => {
      const blockText = extractTextFromInlineContent(block.content);
      const childrenText = block.children
        ? extractTextFromContent(block.children)
        : "";
      return `${blockText} ${childrenText}`;
    })
    .join(" ")
    .trim();
}

function extractTextFromInlineContent(content: InlineContent[]): string {
  if (!content || !Array.isArray(content)) {
    return "";
  }

  return content
    .map((item) => item.text || "")
    .join("")
    .trim();
}
