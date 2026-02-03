import React, { useState } from 'react';
import { 
  View, Text, Image, StyleSheet, ScrollView, 
  TouchableOpacity, ActivityIndicator, Alert 
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useProduct } from '../../presentation/hooks/useProducts'; // Asegúrate que la ruta sea correcta
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams(); 
  // Estados para la interacción del usuario
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // Cargamos el producto individual
  const { data: product, isLoading } = useProduct(id as string);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FFDB58" />
      </View>
    );
  }

  if (!product) return null;

  // Lógica de Cantidad
  const handleIncrement = () => {
    if (quantity < product.stock) setQuantity(prev => prev + 1);
    else Alert.alert("Stock máximo", "No puedes agregar más unidades de las disponibles.");
  };

  const handleDecrement = () => {
    if (quantity > 1) setQuantity(prev => prev - 1);
  };

  // Imagen Principal (Defensivo: si no hay imagen, usa placeholder)
  const mainImage = product.images?.[0]?.url 
    ? { uri: product.images[0].url }
    : require('../../assets/images/adaptive-icon.png');

  // Cálculo del total en tiempo real
  const totalPrice = product.price * quantity;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* HEADER: Título y Botón Atrás */}
      <Stack.Screen 
        options={{ 
            headerTitle: '', // Dejamos limpio para que luzca la imagen
            headerTransparent: true,
            headerTintColor: 'black',
            headerBackTitle: 'Volver',
        }} 
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* 1. IMAGEN DEL PRODUCTO (Carrusel simple si hay más, por ahora principal) */}
        <View style={styles.imageContainer}>
             <Image source={mainImage} style={styles.productImage} resizeMode="contain" />
        </View>

        <View style={styles.detailsContainer}>
            {/* Título y Precio Unitario */}
            <View style={styles.headerRow}>
                <Text style={styles.title}>{product.title}</Text>
                <Text style={styles.price}>${product.price}</Text>
            </View>

            {/* Negocio Vendedor (Link de regreso visual) */}
            <Text style={styles.sellerName}>
                Vendido por: <Text style={{fontWeight:'bold'}}>{product.business.name}</Text>
            </Text>

            <View style={styles.divider} />

            {/* 2. SELECTOR DE TALLAS (Si existen) */}
            {product.sizes && product.sizes.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Selecciona Talla:</Text>
                    <View style={styles.sizesGrid}>
                        {product.sizes.map((size: string) => (
                            <TouchableOpacity 
                                key={size}
                                style={[
                                    styles.sizeChip,
                                    selectedSize === size && styles.sizeChipSelected
                                ]}
                                onPress={() => setSelectedSize(size)}
                            >
                                <Text style={[
                                    styles.sizeText,
                                    selectedSize === size && styles.sizeTextSelected
                                ]}>
                                    {size}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* 3. DESCRIPCIÓN */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Descripción</Text>
                <Text style={styles.descriptionText}>
                    {product.description || "Sin descripción disponible."}
                </Text>
            </View>

            {/* Stock Info */}
            <Text style={styles.stockInfo}>
                {product.stock > 0 ? `🟢 Disponible (${product.stock} unidades)` : "🔴 Agotado"}
            </Text>

        </View>
      </ScrollView>

      {/* 4. FOOTER FIJO (Sticky Bottom) - La zona de conversión */}
      <View style={styles.footer}>
          
          {/* Selector de Cantidad */}
          <View style={styles.quantityControl}>
              <TouchableOpacity onPress={handleDecrement} style={styles.qtyButton}>
                  <Ionicons name="remove" size={24} color="black" />
              </TouchableOpacity>
              
              <Text style={styles.qtyText}>{quantity}</Text>
              
              <TouchableOpacity onPress={handleIncrement} style={styles.qtyButton}>
                  <Ionicons name="add" size={24} color="black" />
              </TouchableOpacity>
          </View>

          {/* Botón de Agregar al Carrito */}
          <TouchableOpacity 
            style={[styles.addToCartButton, product.stock === 0 && styles.disabledButton]}
            disabled={product.stock === 0}
            onPress={() => {
                if (!selectedSize && product.sizes?.length > 0) {
                    Alert.alert("Atención", "Por favor selecciona una talla.");
                    return;
                }
                Alert.alert("Éxito", `Agregaste ${quantity} items al carrito.`);
                // AQUÍ VA TU LÓGICA DE ZUSTAND/CONTEXT PARA EL CARRITO
            }}
          >
              <Text style={styles.addToCartText}>
                  Agregar • ${totalPrice.toFixed(2)}
              </Text>
          </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 120 }, // Espacio para que el footer no tape contenido
  
  // Imagen
  imageContainer: { 
    width: '100%', 
    height: 350, 
    backgroundColor: '#F9F9F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomRightRadius: 30,
    borderBottomLeftRadius: 30,
    overflow: 'hidden'
  },
  productImage: { width: '80%', height: '80%' },

  // Detalles
  detailsContainer: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333', flex: 1, marginRight: 10 },
  price: { fontSize: 24, fontWeight: 'bold', color: '#00A86B' },
  sellerName: { fontSize: 14, color: '#888', marginBottom: 15 },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 15 },

  // Secciones
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  
  // Tallas
  sizesGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  sizeChip: { 
    paddingHorizontal: 16, paddingVertical: 8, 
    borderRadius: 8, borderWidth: 1, borderColor: '#DDD', 
    marginRight: 10, marginBottom: 10, backgroundColor: 'white'
  },
  sizeChipSelected: { 
    backgroundColor: '#333', borderColor: '#333' 
  },
  sizeText: { fontSize: 14, color: '#333' },
  sizeTextSelected: { color: 'white', fontWeight: 'bold' },

  descriptionText: { fontSize: 15, color: '#666', lineHeight: 22 },
  stockInfo: { fontSize: 12, color: '#666', marginTop: 10 },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white',
    padding: 20, paddingBottom: 35, // Para iPhone X+
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
    shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, 
    shadowOpacity: 0.1, elevation: 10
  },
  
  // Cantidad
  quantityControl: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F5F5', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5,
    marginRight: 15
  },
  qtyButton: { padding: 10 },
  qtyText: { fontSize: 18, fontWeight: 'bold', paddingHorizontal: 10 },

  // Botón Principal
  addToCartButton: {
    flex: 1, backgroundColor: '#FFDB58',
    paddingVertical: 16, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center'
  },
  disabledButton: { backgroundColor: '#CCC' },
  addToCartText: { fontSize: 16, fontWeight: 'bold', color: 'black' }
});