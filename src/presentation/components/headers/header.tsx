import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Text, Pressable, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { usePermissionsStore } from "@/presentation/store/usePermissions";
import { useCartStore } from "@/presentation/store/useCartStore";

const PrincipalHeader = () => {
  const router = useRouter();
  const {locationStatus} = usePermissionsStore();

  const totalItems = useCartStore(state => state.items.reduce((total, item) => total + item.quantity, 0));

  const handleLocationPress = () => {
    if (locationStatus === "GRANTED"){
      router.replace('./map');
    } else if (locationStatus !== "CHECKING") {
      router.replace('./permissions');    
    }
  }

  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.iconRow}
        onPress={() => router.push('./profile/profile') }
      >
        <Ionicons name='person-outline' size={25} color='#000' style={styles.icon} />
      </TouchableOpacity>

      <View style={styles.locationBox}>
        
        <Ionicons name='location-outline' size={20} color='#6528FF' />

        <Pressable onPress={handleLocationPress}>

        <Text numberOfLines={1} style={styles.locationText}>
          Busca tu negocio
        </Text>
        </Pressable>
        <Ionicons name='chevron-down' size={18} color='#5D5D5D' />
      </View>

      <TouchableOpacity style={styles.iconRow}
        onPress={() => router.push('./cart/cart')}
      >
        <Ionicons name='cart-outline' size={30} color='#000' style={styles.icon} />
        {totalItems > 0 && (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>
        {totalItems > 99 ? '99+' : totalItems}
      </Text>
    </View>
  )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 50,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  locationBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    maxWidth: "70%",
  },
  locationText: {
    marginHorizontal: 5,
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30', // Rojo alerta estándar de iOS
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFF', // Borde blanco para separarlo del icono oscuro
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  icon: {
  borderRadius: 50,
  backgroundColor: 'white',
  borderColor: 'black',
  padding: 12,
  // Sombra para iOS
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.25, 
  shadowRadius: 3.84,
  // Sombra para Android
  elevation: 5,
  
}

});

export default PrincipalHeader;
