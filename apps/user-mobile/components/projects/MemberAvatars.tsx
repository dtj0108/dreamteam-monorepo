import { View, Text, Image } from "react-native";
import { ProjectUser } from "../../lib/types/projects";

interface MemberAvatarsProps {
  members: ProjectUser[];
  maxDisplay?: number;
  size?: "sm" | "md" | "lg";
}

export function MemberAvatars({ members, maxDisplay = 3, size = "md" }: MemberAvatarsProps) {
  const displayMembers = members.slice(0, maxDisplay);
  const overflow = members.length - maxDisplay;

  const sizeConfig = {
    sm: { container: "h-6 w-6", text: "text-[10px]", overlap: -6 },
    md: { container: "h-8 w-8", text: "text-xs", overlap: -8 },
    lg: { container: "h-10 w-10", text: "text-sm", overlap: -10 },
  };

  const config = sizeConfig[size];

  // Generate initials from name
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Generate a consistent color based on user id
  const getAvatarColor = (id: string) => {
    const colors = [
      "#6366f1", // indigo
      "#8b5cf6", // violet
      "#ec4899", // pink
      "#ef4444", // red
      "#f97316", // orange
      "#22c55e", // green
      "#14b8a6", // teal
      "#0ea5e9", // sky
      "#3b82f6", // blue
    ];
    const index = id.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (members.length === 0) {
    return null;
  }

  return (
    <View className="flex-row items-center">
      {displayMembers.map((member, index) => (
        <View
          key={member.id}
          className={`${config.container} items-center justify-center rounded-full border-2 border-white`}
          style={{
            marginLeft: index > 0 ? config.overlap : 0,
            zIndex: displayMembers.length - index,
            backgroundColor: member.avatar_url ? undefined : getAvatarColor(member.id),
          }}
        >
          {member.avatar_url ? (
            <Image
              source={{ uri: member.avatar_url }}
              className={`${config.container} rounded-full`}
            />
          ) : (
            <Text className={`font-medium text-white ${config.text}`}>
              {getInitials(member.name)}
            </Text>
          )}
        </View>
      ))}
      {overflow > 0 && (
        <View
          className={`${config.container} items-center justify-center rounded-full border-2 border-white bg-gray-200`}
          style={{ marginLeft: config.overlap, zIndex: 0 }}
        >
          <Text className={`font-medium text-gray-600 ${config.text}`}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}
