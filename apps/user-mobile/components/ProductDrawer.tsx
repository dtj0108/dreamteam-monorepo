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
import { useTeamUnreadCount } from "@/lib/hooks/useTeamUnreadCount";

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
  const teamUnreadCount = useTeamUnreadCount();

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
              <View className="mx-4 mb-2">
                <Pressable
                  onPress={handleHub}
                  className="flex-row items-center rounded-xl px-4 py-3 active:bg-muted/50"
                >
                  <View className="h-11 w-11 items-center justify-center rounded-xl bg-muted">
                    <Text className="text-xl">🏠</Text>
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-semibold text-foreground">
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
              <View className="gap-1">
                {PRODUCTS.filter((p) => p.id !== "hub").map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    isSelected={currentProduct?.id === product.id}
                    onSelect={() => handleSelectProduct(product)}
                    badgeCount={product.id === "team" ? teamUnreadCount : undefined}
                  />
                ))}
              </View>
            </ScrollView>

            {/* Bottom Section */}
            <View className="mx-4 mt-4 gap-1">
              {/* Workspace */}
              {currentWorkspace && (
                <Pressable
                  onPress={handleWorkspaces}
                  className="flex-row items-center rounded-xl px-4 py-3 active:bg-muted/50"
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
              )}

              {/* Profile/Settings */}
              <Pressable
                onPress={handleSettings}
                className="flex-row items-center rounded-xl px-4 py-3 active:bg-muted/50"
              >
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-gray-800">
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
  badgeCount?: number;
}

function ProductRow({ product, isSelected, onSelect, badgeCount }: ProductRowProps) {
  const showBadge = badgeCount !== undefined && badgeCount > 0;

  return (
    <Pressable
      onPress={onSelect}
      className={`flex-row items-center rounded-xl px-4 py-3 ${
        isSelected ? "bg-muted" : "active:bg-muted/50"
      }`}
    >
      <View className="relative">
        <View
          className={`h-11 w-11 items-center justify-center rounded-xl ${
            isSelected ? "bg-gray-800" : "bg-muted"
          }`}
        >
          <Text className="text-xl">{product.emoji}</Text>
        </View>
        {/* Unread badge on icon */}
        {showBadge && (
          <View className="absolute -right-1 -top-1 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5">
            <Text className="text-xs font-bold text-white">
              {badgeCount > 99 ? "99+" : badgeCount}
            </Text>
          </View>
        )}
      </View>

      <View className="ml-3 flex-1">
        <Text
          className={`text-base font-semibold text-foreground ${showBadge ? "font-bold" : ""}`}
          numberOfLines={1}
        >
          {product.name}
        </Text>
        <Text className="text-sm text-muted-foreground" numberOfLines={1}>
          {product.description}
        </Text>
      </View>

      {isSelected && (
        <View className="h-6 w-6 items-center justify-center rounded-full bg-gray-800">
          <FontAwesome name="check" size={12} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}
