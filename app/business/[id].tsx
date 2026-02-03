import React, { useState } from 'react';
import { View, Text, Image, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useBusiness } from '@/presentation/hooks/Bussiness';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons'; // Asegúrate de tener esto instalado

// Categorías estáticas para simular el diseño (luego las traeremos del backend)
const CATEGORIES = ["Promos", "Hamburguesas", "Bebidas", "Postres", "Extras"];

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("Promos");

const handlePress = (productId: string) => {
  router.push({
    pathname: "/product/[id]", // La ruta tal cual como se llama el archivo
    params: { id: productId } // Los parámetros van separados
  });
};
  
  const { data: business, isLoading } = useBusiness(id as string);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FFDB58" />
      </View>
    );
  }

  if (!business) return null;

  const businessImage = business.images?.[0]?.url 
    ? { uri: business.images[0].url }
    : require('../../assets/images/adaptive-icon.png');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} /> 

      {/* Botón de Atrás Flotante (Personalizado para mejor estética) */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>

      <FlatList
        data={business.products}
        // SOLUCIÓN AL ERROR DE KEY: Usamos ID + Index para garantizar unicidad
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={{ paddingBottom: 40 }}
        
        ListHeaderComponent={() => (
          <View>
            {/* 1. IMAGEN DE PORTADA */}
            <View style={styles.imageContainer}>
                <Image source={businessImage} style={styles.headerImage} resizeMode="cover" />
                <View style={styles.overlay} />
            </View>
            
            {/* 2. TARJETA FLOTANTE DE INFO (Overlap) */}
            <View style={styles.floatingInfoCard}>
               <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                   <Text style={styles.businessName}>{business.name}</Text>
                   <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>⭐ 4.5</Text>
                   </View>
               </View>
               <Text style={styles.businessMeta}>🥡 Delivery 30 min • 📍 875 mts</Text>
               <Text style={styles.businessCategory}>📂 Comida Rápida</Text>
            </View>
            
            {/* 3. SELECTOR DE CATEGORÍAS (Horizontal) */}
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.categoriesContainer}
            >
                {CATEGORIES.map((cat, index) => (
                    <TouchableOpacity 
                        key={index} 
                        style={[
                            styles.categoryChip, 
                            selectedCategory === cat && styles.categoryChipSelected
                        ]}
                        onPress={() => setSelectedCategory(cat)}
                    >
                        <Text style={[
                            styles.categoryText,
                            selectedCategory === cat && styles.categoryTextSelected
                        ]}>
                            {cat}
                        </Text>
                        {selectedCategory === cat && <View style={styles.activeLine} />}
                    </TouchableOpacity>
                ))}
            </ScrollView>
            
            <Text style={styles.sectionTitle}>Menú</Text>
          </View>
        )}

        renderItem={({ item }) => {
            const prodImage = item.images?.[0]?.url
                ? { uri: item.images[0].url }
                : require('../../assets/images/adaptive-icon.png');

            return (
                <TouchableOpacity 
                    style={styles.productCard}
                    // AQUÍ CONECTAMOS LA NAVEGACIÓN AL PRODUCTO
                    // Asegúrate de crear el archivo app/product/[id].tsx
                     onPress={() => handlePress(item.id)} 
                     
                >
                    {/* Imagen cuadrada a la izquierda */}
                    <Image source={prodImage} style={styles.productImage} />
                    
                    {/* Info Central */}
                    <View style={styles.productInfo}>
                        <Text style={styles.productTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.productDesc} numberOfLines={2}>
                            {item.description || "Ingredientes frescos y seleccionados."}
                        </Text>
                        <Text style={styles.productPrice}>${item.price}</Text>
                    </View>

                    {/* Botón de Acción (+) */}
                    <TouchableOpacity style={styles.addButton}>
                        <Ionicons name="add" size={20} color="white" />
                    </TouchableOpacity>
                </TouchableOpacity>
            );
        }}
        ListEmptyComponent={
            <Text style={styles.emptyText}>No hay productos disponibles.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' }, // Fondo gris muy claro
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header Image
  imageContainer: { width: '100%', height: 220 },
  headerImage: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)' },
  
  // Botón Atrás
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, elevation: 4
  },

  // Tarjeta Flotante Info
  floatingInfoCard: {
    marginHorizontal: 20,
    marginTop: -40, // Esto hace el efecto de solapamiento
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 20,
  },
  businessName: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', flex: 1 },
  businessMeta: { color: '#666', marginTop: 5, fontSize: 13 },
  businessCategory: { color: '#888', marginTop: 2, fontSize: 13 },
  ratingBadge: { backgroundColor: '#F0F0F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingText: { fontSize: 12, fontWeight: 'bold' },

  // Categorías
    categoriesContainer: { paddingHorizontal: 20, paddingBottom: 10 },
    categoryChip: { marginRight: 20, alignItems: 'center' },
    categoryChipSelected: {  },
    categoryText: { fontSize: 16, color: '#999', fontWeight: '500' },
    categoryTextSelected: { fontWeight: 'bold', color: '#000' }, // Color activo
    activeLine: { height: 3, width: 20, backgroundColor: '#FFDB58', marginTop: 4, borderRadius: 2 },

  // Títulos de Sección
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginBottom: 15, color: '#333' },

  // Tarjeta de Producto
  productCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    // Sombra sutil
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  productImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#eee' },
  productInfo: { flex: 1, marginLeft: 14, marginRight: 10 },
  productTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  productDesc: { fontSize: 12, color: '#888', marginBottom: 8, lineHeight: 16 },
  productPrice: { fontSize: 15, fontWeight: 'bold', color: '#00A86B' },

  addButton: {
    backgroundColor: '#FFDB58',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000", shadowOpacity: 0.1, elevation: 2
  },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#999' }
});