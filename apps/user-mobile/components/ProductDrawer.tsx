import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter, usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { Product, PRODUCTS, useCurrentProduct } from "@/providers/product-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import { useAuth } from "@/providers/auth-provider";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.88;

interface ProductDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export function ProductDrawer({ visible, onClose }: ProductDrawerProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const currentProduct = useCurrentProduct();
  const isOnHub = pathname.startsWith("/hub");
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  const userName = user?.user_metadata?.name || "User";
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Animation values
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 180,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  const handleSelectProduct = (product: Product) => {
    router.push(product.route as any);
    onClose();
  };

  const handleHub = () => {
    router.push("/(main)/hub");
    onClose();
  };

  const handleSettings = () => {
    onClose();
    router.push("/(main)/more/settings");
  };

  const handleWorkspaces = () => {
    onClose();
    router.push("/(main)/more/workspaces");
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 180,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1 }}>
        {/* Backdrop */}
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            opacity: backdropAnim,
          }}
        >
          <Pressable onPress={handleClose} style={{ flex: 1 }} />
        </Animated.View>

        {/* Drawer */}
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: DRAWER_WIDTH,
            transform: [{ translateX: slideAnim }],
            backgroundColor: "#f5f5f5",
            borderTopRightRadius: 28,
            borderBottomRightRadius: 28,
            shadowColor: "#000",
            shadowOffset: { width: 4, height: 0 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 12,
          }}
        >
          <View
            style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 8 }}
            className="flex-1"
          >
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 pb-4">
              <View className="flex-row items-center">
                <Text className="text-xl font-bold text-foreground">dreamteam</Text>
                <Text className="text-xl font-bold text-primary">.ai</Text>
              </View>
              <Pressable
                onPress={handleClose}
                className="h-8 w-8 items-center justify-center rounded-full bg-white"
              >
                <FontAwesome name="times" size={16} color={Colors.mutedForeground} />
              </Pressable>
            </View>

            {/* Hub Card - only show when not on Hub */}
            {!isOnHub && (
              <View className="mx-4 mb-4 rounded-2xl bg-white shadow-sm">
                <Pressable
                  onPress={handleHub}
                  className="flex-row items-center rounded-2xl p-4 active:bg-muted/50"
                >
                  <View className="h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                    <Text className="text-2xl">🏠</Text>
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-lg font-semibold text-foreground">
                      Hub
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      Your home dashboard
                    </Text>
                  </View>
                </Pressable>
              </View>
            )}

            {/* Products Section */}
            <View className="mx-4 mb-2">
              <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Products
              </Text>
            </View>

            <ScrollView
              className="flex-1 px-4"
              showsVerticalScrollIndicator={false}
            >
              <View className="rounded-2xl bg-white shadow-sm">
                {PRODUCTS.filter((p) => p.id !== "hub").map((product, index, arr) => (
                  <View key={product.id}>
                    <ProductRow
                      product={product}
                      isSelected={currentProduct?.id === product.id}
                      onSelect={() => handleSelectProduct(product)}
                    />
                    {index < arr.length - 1 && (
                      <View className="mx-4 h-px bg-border" />
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Bottom Section */}
            <View className="mx-4 mt-4 rounded-2xl bg-white shadow-sm">
              {/* Workspace */}
              {currentWorkspace && (
                <>
                  <Pressable
                    onPress={handleWorkspaces}
                    className="flex-row items-center p-4 active:bg-muted/50"
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-xl bg-muted">
                      <Text className="text-xl">🙋</Text>
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-sm text-muted-foreground">Workspace</Text>
                      <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                        {currentWorkspace.name}
                      </Text>
                    </View>
                    <FontAwesome
                      name="chevron-right"
                      size={12}
                      color={Colors.mutedForeground}
                    />
                  </Pressable>
                  <View className="mx-4 h-px bg-border" />
                </>
              )}

              {/* Profile/Settings */}
              <Pressable
                onPress={handleSettings}
                className="flex-row items-center p-4 active:bg-muted/50"
              >
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-gray-700">
                  <Text className="text-sm font-bold text-white">{initials}</Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm text-muted-foreground">Account</Text>
                  <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                    {userName}
                  </Text>
                </View>
                <View className="h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <FontAwesome name="cog" size={14} color={Colors.mutedForeground} />
                </View>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

interface ProductRowProps {
  product: Product;
  isSelected: boolean;
  onSelect: () => void;
}

function ProductRow({ product, isSelected, onSelect }: ProductRowProps) {
  return (
    <Pressable
      onPress={onSelect}
      className={`flex-row items-center p-4 ${
        isSelected ? "bg-gray-100" : "active:bg-muted/50"
      }`}
    >
      <View
        className={`h-12 w-12 items-center justify-center rounded-xl ${
          isSelected ? "bg-gray-700" : "bg-muted"
        }`}
      >
        <Text className="text-xl">{product.emoji}</Text>
      </View>

      <View className="ml-3 flex-1">
        <Text
          className="text-base font-semibold text-foreground"
          numberOfLines={1}
        >
          {product.name}
        </Text>
        <Text className="text-sm text-muted-foreground" numberOfLines={1}>
          {product.description}
        </Text>
      </View>

      {isSelected && (
        <View className="h-6 w-6 items-center justify-center rounded-full bg-gray-700">
          <FontAwesome name="check" size={12} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}
