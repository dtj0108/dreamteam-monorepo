import { Dimensions, Pressable, ScrollView, Text, View } from "react-native";
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

  const handleSupportPress = () => {
    router.push("/(main)/hub/support");
  };

  const handleSettingsPress = () => {
    router.push("/(main)/more/settings");
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

        <View className="flex-row items-center justify-center gap-3 px-5 pb-2 pt-6">
          <Pressable
            onPress={handleSettingsPress}
            className="rounded-full border border-border bg-muted px-4 py-2 active:opacity-80"
          >
            <Text className="text-sm font-medium text-muted-foreground">
              ⚙️ Settings
            </Text>
          </Pressable>
          <Pressable
            onPress={handleSupportPress}
            className="rounded-full border border-border bg-muted px-4 py-2 active:opacity-80"
          >
            <Text className="text-sm font-medium text-muted-foreground">
              🐛 Support & Bugs
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
