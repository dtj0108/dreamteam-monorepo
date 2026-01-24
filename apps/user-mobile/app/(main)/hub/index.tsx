import { Dimensions, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HubHeader } from "@/components/hub/HubHeader";
import { ProductCard } from "@/components/hub/ProductCard";
import { PRODUCTS } from "@/providers/product-provider";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 16;
const HORIZONTAL_PADDING = 20;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

export default function HubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleProductPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View className="flex-1 bg-gray-50">
      <LinearGradient
        colors={["#ffffff", "#f8fafc", "#f1f5f9"]}
        className="absolute inset-0"
      />

      {/* Main content */}
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <HubHeader />

        {/* 3x2 Grid of all products */}
        <View
          className="flex-row flex-wrap"
          style={{
            paddingHorizontal: HORIZONTAL_PADDING,
            gap: CARD_GAP,
          }}
        >
          {PRODUCTS.filter((p) => p.id !== "hub").map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              cardWidth={CARD_WIDTH}
              onPress={() => handleProductPress(product.route)}
              animationDelay={0}
            />
          ))}
        </View>

      </ScrollView>
    </View>
  );
}
