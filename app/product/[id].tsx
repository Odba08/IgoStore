import React, { useState } from 'react';
import { 
  View, Text, Image, StyleSheet, ScrollView, 
  TouchableOpacity, ActivityIndicator, Alert, 
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useProduct } from '@/presentation/hooks/useProducts';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCartStore } from '@/presentation/store/useCartStore';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams(); 
  const router = useRouter();
  
  // 🧠 CONEXIÓN A LA BÓVEDA
  const addItem = useCartStore((state) => state.addItem);
  
  // Estados
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const { data: product, isLoading } = useProduct(id as string);

  // --- HELPER DE IMÁGENES ---
  const getProductImage = (image: any) => {
    if (!image) return require('../../assets/images/adaptive-icon.png');
    if (image.url.startsWith('http')) return { uri: image.url };
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.XX:3000/api'; 
    return { uri: `${API_URL}/files/product/${image.url}` };
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FFDB58" />
      </View>
    );
  }

  if (!product) return null;

  // --- LÓGICA DE PRECIOS Y OFERTAS ---
  const finalUnitTestPrice = (product.isPromo && product.discountPrice)
    ? product.discountPrice 
    : product.price;

  const discountPercent = (product.isPromo && product.discountPrice)
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  const totalPrice = finalUnitTestPrice * quantity;

  // --- LÓGICA DE STOCK ---
  const handleIncrement = () => {
    if (quantity < product.stock) setQuantity(prev => prev + 1);
    else Alert.alert("Stock límite", `Solo quedan ${product.stock} unidades.`);
  };

  const handleDecrement = () => {
    if (quantity > 1) setQuantity(prev => prev - 1);
  };

  const mainImage = getProductImage(product.images?.[0]);

  return (
   <View style={styles.container}>
      <StatusBar style="dark" />
      
      <Stack.Screen options={{ headerShown: false }} />

      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>
        
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.imageContainer}>
             <Image source={mainImage} style={styles.productImage} resizeMode="contain" />
        </View>

        <View style={styles.detailsContainer}>
            
            <View style={{ marginBottom: 15 }}>
                <Text style={styles.sellerName}>
                    Vendido por {product.business.name}
                </Text>
                
                <Text style={styles.title}>{product.title}</Text>

                <View style={styles.priceContainer}>
                    {product.isPromo && product.discountPrice ? (
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Text style={styles.price}>${product.discountPrice}</Text>
                            <Text style={styles.oldPrice}>${product.price}</Text>
                            <View style={styles.discountBadge}>
                                <Text style={styles.discountText}>-{discountPercent}%</Text>
                            </View>
                        </View>
                    ) : (
                        <Text style={styles.price}>${product.price}</Text>
                    )}
                </View>
            </View>

            <View style={styles.divider} />

            {product.options && product.options.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Selecciona Talla:</Text>
                    <View style={styles.sizesGrid}>
                        {product.options.map((size: string) => (
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

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Descripción</Text>
                <Text style={styles.descriptionText}>
                    {product.description || "El vendedor no ha añadido una descripción detallada para este producto."}
                </Text>
            </View>

            {product.tags && product.tags.length > 0 && (
                 <View style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: 10}}>
                    {product.tags.map((tag, index) => (
                        <Text key={`${tag}-${index}`} style={styles.tag}>#{tag}</Text>
                    ))}
                 </View>
            )}

        </View>
      </ScrollView>

      <View style={styles.footer}>
          
          <View style={styles.quantityControl}>
              <TouchableOpacity onPress={handleDecrement} style={styles.qtyButton}>
                  <Ionicons name="remove" size={20} color="black" />
              </TouchableOpacity>
              
              <Text style={styles.qtyText}>{quantity}</Text>
              
              <TouchableOpacity onPress={handleIncrement} style={styles.qtyButton}>
                  <Ionicons name="add" size={20} color="black" />
              </TouchableOpacity>
          </View>

          {/* ⚡ LA INYECCIÓN DE DATOS (EL CEREBRO EN ACCIÓN) */}
          <TouchableOpacity 
            style={[
                styles.addToCartButton, 
                product.stock === 0 && styles.disabledButton
            ]}
            disabled={product.stock === 0}
            onPress={() => {
                // 1. Validar Talla (Si aplica)
                if (!selectedSize && product.options?.length > 0) {
                    Alert.alert("Falta Talla", "Por favor selecciona una talla para continuar.");
                    return;
                }

                // 2. Construir Identificador Único
                const cartItemId = selectedSize ? `${product.id}-${selectedSize}` : product.id;
                const cartItemTitle = selectedSize ? `${product.title} (${selectedSize})` : product.title;
                const imageUrl = product.images?.[0]?.url || ''; 

                // 3. Ejecutar Acción en Zustand
                addItem({
                    id: cartItemId,
                    title: cartItemTitle,
                    price: finalUnitTestPrice,
                    image: imageUrl,
                    quantity: quantity
                });

                // 4. Feedback y Salida
                Alert.alert("🛒 Carrito", `Agregaste ${quantity}x ${cartItemTitle}`);
                router.back(); 
            }}
          >
              <Text style={styles.addToCartText}>
                  {product.stock === 0 ? "Agotado" : `Agregar • $${totalPrice.toFixed(2)}`}
              </Text>
          </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 140 }, 

  roundButton: {
    width: 40, height: 40, backgroundColor: 'white', 
    borderRadius: 20, justifyContent: 'center', alignItems: 'center',
    marginLeft: 10, shadowColor: "#000", shadowOpacity: 0.1, elevation: 5
  },
  
  imageContainer: { 
    width: '100%', height: 380, backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center',
    borderBottomRightRadius: 30, borderBottomLeftRadius: 30, overflow: 'hidden'
  },
  productImage: { width: '85%', height: '85%' },

  detailsContainer: { padding: 20, paddingTop: 25 },
  sellerName: { fontSize: 13, color: '#888', marginBottom: 5, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', marginBottom: 8, lineHeight: 30 },
  
  priceContainer: { marginTop: 5 },
  price: { fontSize: 28, fontWeight: '900', color: '#1a1a1a' },
  oldPrice: { fontSize: 16, color: '#999', textDecorationLine: 'line-through', marginLeft: 10, marginBottom: 5 },
  discountBadge: { backgroundColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 10, marginBottom: 5 },
  discountText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 20 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  
  sizesGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  sizeChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', marginRight: 10, marginBottom: 10, backgroundColor: 'white' },
  sizeChipSelected: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  sizeText: { fontSize: 14, color: '#333', fontWeight: '500' },
  sizeTextSelected: { color: 'white', fontWeight: 'bold' },

  descriptionText: { fontSize: 15, color: '#555', lineHeight: 24 },
  
  tag: { color: '#007AFF', backgroundColor: '#F0F8FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 8, fontSize: 12, overflow: 'hidden', marginTop: 5 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 35,
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
    shadowColor: "#000", shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.05, elevation: 20
  },
  
  quantityControl: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F5F5F5', borderRadius: 15,
    paddingHorizontal: 5, height: 50, width: 110, marginRight: 15
  },
  qtyButton: { width: 35, height: '100%', justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 18, fontWeight: 'bold' },

  addToCartButton: {
    flex: 1, backgroundColor: '#FFDB58', height: 50, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: "#FFDB58", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, elevation: 5
  },
  disabledButton: { backgroundColor: '#E0E0E0', shadowOpacity: 0 },
  addToCartText: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  backButton: {
    position: 'absolute', 
    top: 50,              
    left: 20,
    zIndex: 10,           
    backgroundColor: 'white',
    width: 40, 
    height: 40,
    borderRadius: 20,     
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.2, 
    elevation: 5
  },
});