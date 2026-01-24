import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Colors } from "@/constants/Colors";
import { useCurrentProduct } from "@/providers/product-provider";

import { ProductDrawer } from "./ProductDrawer";

export function ProductSwitcher() {
  const currentProduct = useCurrentProduct();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Don't render if no product selected (e.g., on Hub screen)
  if (!currentProduct) return null;

  return (
    <>
      <Pressable
        onPress={() => setIsDrawerOpen(true)}
        className="flex-row items-center active:opacity-70"
      >
        <View className="h-9 w-9 items-center justify-center rounded-lg bg-gray-700">
          <Text className="text-lg">{currentProduct.emoji}</Text>
        </View>
        <Text
          className="ml-2 text-lg font-semibold text-foreground"
          numberOfLines={1}
        >
          {currentProduct.name}
        </Text>
        <FontAwesome
          name="chevron-right"
          size={12}
          color={Colors.mutedForeground}
          style={{ marginLeft: 6 }}
        />
      </Pressable>

      <ProductDrawer
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
}
