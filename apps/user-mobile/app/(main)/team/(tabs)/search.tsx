import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { ProductSwitcher } from "@/components/ProductSwitcher";

import { Colors } from "@/constants/Colors";
import { useMessageSearch, useChannels } from "@/lib/hooks/useTeam";
import { SearchFilters, SearchResult } from "@/lib/types/team";
import { SearchResultItem } from "@/components/team/SearchResultItem";

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch channels for filter dropdown
  const { data: channelsData } = useChannels({ joined: true });
  const channels = channelsData?.channels || [];

  // Search
  const {
    data: searchData,
    isLoading,
    isFetching,
  } = useMessageSearch(debouncedQuery, filters);

  const results = searchData?.results || [];
  const hasSearched = debouncedQuery.length >= 2;

  // Handlers
  const handleResultPress = (result: SearchResult) => {
    if (result.message.channel) {
      router.push(`/(main)/team/channels/${result.message.channel.id}`);
    } else if (result.message.dm) {
      router.push(`/(main)/team/dm/${result.message.dm.id}`);
    }
  };

  const handleClear = () => {
    setQuery("");
    setDebouncedQuery("");
    setFilters({});
  };

  const handleChannelFilter = (channelId: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      channel_id: channelId,
    }));
  };

  const handleAttachmentsFilter = () => {
    setFilters((prev) => ({
      ...prev,
      has_attachments: !prev.has_attachments,
    }));
  };

  const activeFiltersCount = [
    filters.channel_id,
    filters.from_user_id,
    filters.has_attachments,
    filters.after,
    filters.before,
  ].filter(Boolean).length;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header with ProductSwitcher */}
      <View className="px-4 py-2">
        <ProductSwitcher />
      </View>

      {/* Search Bar */}
      <View className="border-b border-border px-4 py-4">
        <View className="flex-row items-center">
          {/* Search Input */}
          <View className="flex-1 flex-row items-center rounded-lg bg-muted px-3 py-2">
            <FontAwesome name="search" size={14} color="#9ca3af" />
            <TextInput
              className="ml-2 flex-1 text-foreground"
              placeholder="Search messages..."
              placeholderTextColor="#9ca3af"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={handleClear}>
                <FontAwesome name="times-circle" size={14} color="#9ca3af" />
              </Pressable>
            )}
          </View>

          {/* Filter button */}
          <Pressable
            className={`ml-2 h-10 w-10 items-center justify-center rounded-lg ${
              activeFiltersCount > 0 ? "bg-primary" : "bg-muted"
            }`}
            onPress={() => setShowFilters(!showFilters)}
          >
            <FontAwesome
              name="sliders"
              size={16}
              color={activeFiltersCount > 0 ? "white" : Colors.foreground}
            />
          </Pressable>
        </View>

        {/* Filters */}
        {showFilters && (
          <View className="mt-3">
            {/* Channel filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="-mx-4 px-4"
            >
              <Pressable
                className={`mr-2 rounded-full px-3 py-1.5 ${
                  !filters.channel_id ? "bg-primary" : "bg-muted"
                }`}
                onPress={() => handleChannelFilter(undefined)}
              >
                <Text
                  className={`text-sm font-medium ${
                    !filters.channel_id ? "text-white" : "text-foreground"
                  }`}
                >
                  All channels
                </Text>
              </Pressable>
              {channels.map((channel) => (
                <Pressable
                  key={channel.id}
                  className={`mr-2 flex-row items-center rounded-full px-3 py-1.5 ${
                    filters.channel_id === channel.id ? "bg-primary" : "bg-muted"
                  }`}
                  onPress={() => handleChannelFilter(channel.id)}
                >
                  <FontAwesome
                    name="hashtag"
                    size={10}
                    color={
                      filters.channel_id === channel.id
                        ? "white"
                        : Colors.mutedForeground
                    }
                  />
                  <Text
                    className={`ml-1 text-sm font-medium ${
                      filters.channel_id === channel.id
                        ? "text-white"
                        : "text-foreground"
                    }`}
                  >
                    {channel.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Other filters */}
            <View className="mt-2 flex-row gap-2">
              <Pressable
                className={`flex-row items-center rounded-full px-3 py-1.5 ${
                  filters.has_attachments ? "bg-primary" : "bg-muted"
                }`}
                onPress={handleAttachmentsFilter}
              >
                <FontAwesome
                  name="paperclip"
                  size={12}
                  color={
                    filters.has_attachments ? "white" : Colors.mutedForeground
                  }
                />
                <Text
                  className={`ml-1.5 text-sm font-medium ${
                    filters.has_attachments ? "text-white" : "text-foreground"
                  }`}
                >
                  Has files
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Results */}
      {!hasSearched ? (
        <View className="flex-1 items-center justify-center px-4">
          <FontAwesome name="search" size={48} color="#d1d5db" />
          <Text className="mt-4 text-lg font-medium text-foreground">
            Search messages
          </Text>
          <Text className="mt-1 text-center text-muted-foreground">
            Enter at least 2 characters to search
          </Text>
        </View>
      ) : isLoading || isFetching ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text className="mt-2 text-muted-foreground">Searching...</Text>
        </View>
      ) : results.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <FontAwesome name="search" size={48} color="#d1d5db" />
          <Text className="mt-4 text-lg font-medium text-foreground">
            No results
          </Text>
          <Text className="mt-1 text-center text-muted-foreground">
            No messages match "{debouncedQuery}"
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 16 }}
        >
          <Text className="mb-3 text-sm font-medium text-muted-foreground">
            {searchData?.total || results.length} result
            {(searchData?.total || results.length) !== 1 ? "s" : ""}
          </Text>
          {results.map((result, index) => (
            <SearchResultItem
              key={`${result.message.id}-${index}`}
              result={result}
              onPress={() => handleResultPress(result)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
