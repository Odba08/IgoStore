import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Text, Pressable, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePermissionsStore } from "@/presentation/store/usePermissions";
import { useAuthStore } from "@/presentation/store/useAuthStore";
import { useCartStore } from "@/presentation/store/useCartStore";
import { useLocationStore } from "@/presentation/store/useLocationStore";
import { useThemeStore } from "@/presentation/store/useThemeStore";

const PrincipalHeader = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locationStatus } = usePermissionsStore();
  const { user } = useAuthStore();
  const { colors, isDark } = useThemeStore();
  const isEmployee = user?.roles.includes('empleado') || user?.roles.includes('worker');

  const totalItems = useCartStore(state => state.items.reduce((total, item) => total + item.quantity, 0));
  const deliveryLocation = useLocationStore(state => state.deliveryLocation);

  const handleLocationPress = () => {
    if (isEmployee) return;
    if (locationStatus === "GRANTED") {
      router.push('/map' as any);
    } else {
      router.push('/permissions' as any);
    }
  };

  return (
    <View
      style={[
        styles.header,
        { paddingTop: Math.max(insets.top + 6, Platform.OS === 'ios' ? 44 : 20) },
      ]}
    >
      {/* Botón de Perfil */}
      <TouchableOpacity
        style={[
          styles.circleButton,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          },
        ]}
        onPress={() => router.push('./profile/profile')}
        activeOpacity={0.8}
      >
        <Ionicons name="person-outline" size={20} color={colors.text} />
      </TouchableOpacity>

      {/* Pill de Ubicación de Entrega */}
      <Pressable
        onPress={handleLocationPress}
        style={[
          styles.locationPill,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          },
        ]}
      >
        <View style={[styles.locationIconBox, { backgroundColor: isDark ? '#2D1D58' : '#FFFBEA' }]}>
          <Ionicons name="location" size={16} color={isDark ? '#FFC93C' : '#0F0330'} />
        </View>

        <View style={styles.locationTextCol}>
          <Text style={[styles.locationSubtitle, { color: colors.textMuted }]}>ENTREGAR EN</Text>
          <Text numberOfLines={1} style={[styles.locationAddressText, { color: colors.text }]}>
            {deliveryLocation ? deliveryLocation.address : "Selecciona tu dirección"}
          </Text>
        </View>

        {!isEmployee && (
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} style={{ marginLeft: 4 }} />
        )}
      </Pressable>

      {/* Botón de Carrito */}
      {!isEmployee ? (
        <TouchableOpacity
          style={[
            styles.circleButton,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
          onPress={() => router.push('./cart/cart')}
          activeOpacity={0.8}
        >
          <Ionicons name="cart-outline" size={22} color={colors.text} />
          {totalItems > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {totalItems > 99 ? '99+' : totalItems}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <View style={{ width: 44 }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "transparent",
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0F0330",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    position: "relative",
  },
  locationPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 22,
    marginHorizontal: 10,
    borderWidth: 1.2,
    shadowColor: "#0F0330",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  locationIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFC93C",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  locationTextCol: {
    flex: 1,
  },
  locationSubtitle: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  locationAddressText: {
    fontSize: 13,
    fontWeight: "700",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FFC93C",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  badgeText: {
    color: "#0F0330",
    fontSize: 10,
    fontWeight: "800",
  },
});

export default PrincipalHeader;
