import { useEffect, useRef } from "react";
import { Animated, Easing, Image, View } from "react-native";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: 40,
  md: 60,
  lg: 80,
};

export function Loading({ size = "md" }: LoadingProps) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();

    return () => animation.stop();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const dimension = SIZES[size];

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Image
          source={require("../dreamteamlogo.png")}
          style={{ width: dimension, height: dimension }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}
