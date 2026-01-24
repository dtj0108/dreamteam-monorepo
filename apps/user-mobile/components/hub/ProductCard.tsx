import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Product } from "@/providers/product-provider";

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  index: number;
  cardWidth: number;
  isFullWidth?: boolean;
  animationDelay?: number; // Additional delay before animation starts (for splash sync)
}

export function ProductCard({
  product,
  onPress,
  index,
  cardWidth,
  isFullWidth = false,
  animationDelay,
}: ProductCardProps) {
  // Entrance animation
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  // Press animation
  const pressScale = useRef(new Animated.Value(1)).current;
  const pressTranslateY = useRef(new Animated.Value(0)).current;

  // Track if animation has run
  const hasAnimated = useRef(false);

  useEffect(() => {
    // If animationDelay is undefined, don't animate yet (splash still showing)
    if (animationDelay === undefined) return;

    // Don't re-animate if already done
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const delay = animationDelay + index * 80;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 80,
        friction: 10,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 10,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, animationDelay]);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(pressScale, {
        toValue: 0.97,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.spring(pressTranslateY, {
        toValue: 2,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(pressScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 8,
      }),
      Animated.spring(pressTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 200,
        friction: 8,
      }),
    ]).start();
  };

  const CardContent = (
    <View className={`items-center justify-center ${isFullWidth ? "py-8" : "py-10"}`}>
      {/* Emoji with frosted circular background */}
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-gray-100">
        <Text style={styles.emoji}>{product.emoji}</Text>
      </View>
      <Text className="text-xl font-bold text-foreground">
        {product.name}
      </Text>
      <Text className="mt-1.5 text-center text-sm text-muted-foreground">
        {product.description}
      </Text>
    </View>
  );

  return (
    <Animated.View
      style={{
        opacity,
        transform: [
          { scale: Animated.multiply(scale, pressScale) },
          { translateY: Animated.add(translateY, pressTranslateY) },
        ],
        width: cardWidth,
      }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={80}
            tint="light"
            style={[styles.glassCard, isFullWidth && styles.fullWidthCard]}
          >
            {CardContent}
          </BlurView>
        ) : (
          <View style={[styles.androidCard, isFullWidth && styles.fullWidthCard]}>
            {CardContent}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  emoji: {
    fontSize: 40,
  },
  glassCard: {
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  androidCard: {
    borderRadius: 28,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  fullWidthCard: {
    borderRadius: 24,
  },
});
