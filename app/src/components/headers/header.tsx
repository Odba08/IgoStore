import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { usePermissionsStore } from "@/presentation/store/usePermissions";

const PrincipalHeader = () => {
  const router = useRouter();
  const {locationStatus} = usePermissionsStore();

  const handleLocationPress = () => {
    if (locationStatus === "GRANTED"){
      router.replace('/map');
    } else if (locationStatus !== "CHECKING") {
      router.replace('/permissions');    
    }
  }

  return (
    <View style={styles.header}>
      <View style={styles.iconRow}>
        <Ionicons name='person-outline' size={25} color='#000' style={styles.icon} />
      </View>

      <View style={styles.locationBox}>
        <Ionicons name='location-outline' size={20} color='#6528FF' />

        <Pressable onPress={handleLocationPress}>

        <Text numberOfLines={1} style={styles.locationText}>
          Calle 1 con av. 23
        </Text>
        </Pressable>
        <Ionicons name='chevron-down' size={18} color='#5D5D5D' />
      </View>

      <View style={styles.iconRow}>
        <Ionicons name='cart-outline' size={30} color='#000' style={styles.icon} />
      </View>
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
