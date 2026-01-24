import { View, Text, Pressable, Image } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";
import { SearchResult, formatMessageTime } from "@/lib/types/team";

interface SearchResultItemProps {
  result: SearchResult;
  onPress: () => void;
}

export function SearchResultItem({ result, onPress }: SearchResultItemProps) {
  const { message } = result;

  // Parse highlighted content (assumes {keyword} format from API)
  const renderHighlightedContent = (content: string) => {
    // Simple highlight rendering - replace {word} with highlighted word
    const parts = content.split(/\{([^}]+)\}/g);
    return parts.map((part, index) => {
      // Odd indices are the matched words
      if (index % 2 === 1) {
        return (
          <Text key={index} className="bg-yellow-200 font-semibold">
            {part}
          </Text>
        );
      }
      return part;
    });
  };

  return (
    <Pressable
      className="mb-2 rounded-xl bg-muted p-3 active:opacity-70"
      onPress={onPress}
    >
      <View className="flex-row">
        {/* Avatar */}
        {message.user.avatar_url ? (
          <Image
            source={{ uri: message.user.avatar_url }}
            className="h-10 w-10 rounded-full"
          />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-background">
            <FontAwesome name="user" size={16} color={Colors.mutedForeground} />
          </View>
        )}

        {/* Content */}
        <View className="ml-3 flex-1">
          {/* Header */}
          <View className="flex-row items-center flex-wrap">
            <Text className="font-semibold text-foreground">
              {message.user.name}
            </Text>
            {message.channel && (
              <>
                <Text className="mx-1 text-muted-foreground">in</Text>
                <View className="flex-row items-center">
                  <FontAwesome
                    name="hashtag"
                    size={10}
                    color={Colors.mutedForeground}
                  />
                  <Text className="ml-1 text-muted-foreground">
                    {message.channel.name}
                  </Text>
                </View>
              </>
            )}
            {message.dm && (
              <Text className="mx-1 text-muted-foreground">
                in Direct Message
              </Text>
            )}
            <Text className="ml-auto text-xs text-muted-foreground">
              {formatMessageTime(message.created_at)}
            </Text>
          </View>

          {/* Message content with highlights */}
          <Text className="mt-1 text-foreground" numberOfLines={3}>
            {message.highlighted_content
              ? renderHighlightedContent(message.highlighted_content)
              : message.content}
          </Text>
        </View>

        {/* Chevron */}
        <View className="ml-2 justify-center">
          <FontAwesome
            name="chevron-right"
            size={12}
            color={Colors.mutedForeground}
          />
        </View>
      </View>
    </Pressable>
  );
}
