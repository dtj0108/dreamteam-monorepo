import { View, Text, Pressable, Image } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";
import { Mention, formatMessageTime } from "@/lib/types/team";

interface MentionItemProps {
  mention: Mention;
  onPress: () => void;
  onMarkRead: () => void;
}

export function MentionItem({ mention, onPress, onMarkRead }: MentionItemProps) {
  const { message } = mention;
  const isUnread = !mention.is_read;

  // Highlight @mentions in the content
  const highlightMentions = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <Text key={index} className="font-semibold text-primary">
            {part}
          </Text>
        );
      }
      return part;
    });
  };

  return (
    <Pressable
      className={`mb-2 rounded-xl p-3 ${
        isUnread ? "bg-primary/5" : "bg-muted"
      } active:opacity-70`}
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
          <View className="flex-row items-center">
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
            <Text className="ml-auto text-xs text-muted-foreground">
              {formatMessageTime(mention.created_at)}
            </Text>
          </View>

          {/* Message content with highlighted mentions */}
          <Text className="mt-1 text-foreground" numberOfLines={2}>
            {highlightMentions(message.content)}
          </Text>
        </View>

        {/* Unread indicator / Actions */}
        <View className="ml-2 items-center justify-center">
          {isUnread ? (
            <Pressable
              className="h-6 w-6 items-center justify-center rounded-full bg-primary"
              onPress={(e) => {
                e.stopPropagation();
                onMarkRead();
              }}
            >
              <View className="h-2 w-2 rounded-full bg-white" />
            </Pressable>
          ) : (
            <FontAwesome
              name="chevron-right"
              size={12}
              color={Colors.mutedForeground}
            />
          )}
        </View>
      </View>
    </Pressable>
  );
}
