import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

// Mapeo de tus iconos actuales a etiquetas legibles
const CATEGORIES = [
  { id: 1, label: 'Hamburguesas', icon: require('../../../../assets/Icons/opciones/burger.png') },
  { id: 2, label: 'Mascotas', icon: require('../../../../assets/Icons/opciones/dog.png') },
  { id: 3, label: 'Bebidas', icon: require('../../../../assets/Icons/opciones/drink.png') },
  { id: 4, label: 'Farmacia', icon: require('../../../../assets/Icons/opciones/farm.png') },
  { id: 5, label: 'Helados', icon: require('../../../../assets/Icons/opciones/green.png') },
  { id: 6, label: 'Pizza', icon: require('../../../../assets/Icons/opciones/keys.png') },
  { id: 7, label: 'Delivery', icon: require('../../../../assets/Icons/opciones/rider.png') },

  // Añade más si necesitas
];

export const CategoryList = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Categorías</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity key={cat.id} style={styles.itemContainer}>
            <View style={styles.iconCircle}>
              <Image source={cat.icon} style={styles.icon} resizeMode="contain" />
            </View>
            <Text style={styles.label}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginBottom: 15, color: '#1a1a1a' },
  scrollContent: { paddingHorizontal: 15 },
  itemContainer: { alignItems: 'center', marginRight: 20 },
  iconCircle: {
    width: 80, height: 80,
    backgroundColor: '#F5F5F5', // Fondo gris sutil para resaltar el 3D
    borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2
  },
  icon: { width: 70, height: 70 },
  label: { fontSize: 12, fontWeight: '600', color: '#555' }
});