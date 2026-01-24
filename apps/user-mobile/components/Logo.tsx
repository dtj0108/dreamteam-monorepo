import { Text, View } from "react-native";

interface LogoProps {
  size?: "sm" | "md" | "lg";
}

export function Logo({ size = "md" }: LogoProps) {
  const textClass = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-4xl",
  }[size];

  return (
    <View className="flex-row items-center justify-center">
      <Text className={`${textClass} font-bold text-foreground`}>dreamteam</Text>
      <Text className={`${textClass} font-bold text-primary`}>.ai</Text>
    </View>
  );
}
