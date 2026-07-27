import React, { useState, useMemo } from 'react'; 
import { View, Text, Image, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, FlatList, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// HOOKS
import { useMenuCategories } from '@/presentation/hooks/useMenuCategories';
import { useBusiness } from '@/presentation/hooks/useBusiness';
import { useCartStore } from '@/presentation/store/useCartStore';

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams();
  const businessId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const items = useCartStore((state) => state.items);
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  
  // 1. DATA
  const { data: business, isLoading: loadingBusiness } = useBusiness(businessId);
  const { categories, isLoading: loadingCategories } = useMenuCategories(businessId);

  // 2. ESTADOS
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    if (!business?.products) return [];
    
    // Filtramos solo productos aprobados en el cliente por seguridad
    let result = business.products.filter(p => p.isApproved);

    if (selectedCategoryId !== null) {
        result = result.filter(p => p.menuCategory?.id === selectedCategoryId);
    }

    if (searchQuery.length > 0) {
        const query = searchQuery.toLowerCase();
        result = result.filter(p => 
            p.title.toLowerCase().includes(query) || 
            (p.description && p.description.toLowerCase().includes(query))
        );
    }
    return result;
  }, [business, selectedCategoryId, searchQuery]);


  const handlePress = (productId: string) => {
    router.push({ pathname: "/product/[id]", params: { id: productId } });
  };

  const getProductImage = (image: any) => {
    if (!image) return require('../../assets/images/adaptive-icon.png');
    if (image.url.startsWith('http')) return { uri: image.url };
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.XX:3000/api'; 
    return { uri: `${API_URL}/files/product/${image.url}` };
  };

  // --- MEMORIZAMOS EL HEADER ---
  const headerComponent = useMemo(() => {
    if (!business) return null;

    const businessImage = business.images?.[0]?.url 
    ? { uri: business.images[0].url }
    : require('../../assets/images/adaptive-icon.png');

    return (
      <View>
        {/* PORTADA Y DATOS */}
        <View style={styles.imageContainer}>
            <Image source={businessImage} style={styles.headerImage} resizeMode="cover" />
            <View style={styles.overlay} />
        </View>
        
        <View style={styles.floatingInfoCard}>
           <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
               <Text style={styles.businessName}>{business.name}</Text>
               <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>⭐ 4.5</Text>
               </View>
           </View>
           <Text style={styles.businessMeta}>🥡 Delivery 30 min • 📍 875 mts</Text>
           <Text style={styles.businessCategory}>📂 {business.category?.name || "General"}</Text>
        </View>
        
        {/* BUSCADOR */}
        <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
                placeholder={`Buscar en ${business.name}...`}
                placeholderTextColor="#999"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery} 
                returnKeyType="search"
            />
            {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#ccc" />
                </TouchableOpacity>
            )}
        </View>

        {/* SELECTOR DE CATEGORÍAS */}
        <View style={{ marginBottom: 15 }}>
            <Text style={styles.menuTitle}>Menú</Text>
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.categoriesContainer}
            >
                <TouchableOpacity 
                    style={[styles.categoryChip, selectedCategoryId === null && styles.categoryChipSelected]}
                    onPress={() => setSelectedCategoryId(null)}
                >
                    <Text style={[styles.categoryText, selectedCategoryId === null && styles.categoryTextSelected]}>
                        Todos
                    </Text>
                    {selectedCategoryId === null && <View style={styles.activeLine} />}
                </TouchableOpacity>

                {categories.map((cat) => (
                    <TouchableOpacity 
                        key={cat.id} 
                        style={[
                            styles.categoryChip, 
                            selectedCategoryId === cat.id && styles.categoryChipSelected
                        ]}
                        onPress={() => setSelectedCategoryId(cat.id)}
                    >
                        <Text style={[
                            styles.categoryText,
                            selectedCategoryId === cat.id && styles.categoryTextSelected
                        ]}>
                            {cat.name}
                        </Text>
                        {selectedCategoryId === cat.id && <View style={styles.activeLine} />}
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
      </View>
    );
  }, [business, categories, selectedCategoryId, searchQuery]); 

  if (loadingBusiness || loadingCategories) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FFDB58" />
      </View>
    );
  }

  if (!business) return null;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} /> 

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={headerComponent} 
        renderItem={({ item }) => {
            const prodImage = getProductImage(item.images?.[0]);

            return (
                <TouchableOpacity 
                    style={styles.productCard}
                    onPress={() => handlePress(item.id)} 
                >
                    <Image source={prodImage} style={styles.productImage} />
                    
                    <View style={styles.productInfo}>
                        <Text style={styles.productTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.productDesc} numberOfLines={2}>
                            {item.description || "Sin descripción disponible."}
                        </Text>
                        
                        {item.isPromo ? (
                             <View>
                                <Text style={styles.oldPrice}>${item.price}</Text>
                                <Text style={styles.productPrice}>${item.discountPrice}</Text>
                             </View>
                        ) : (
                            <Text style={styles.productPrice}>${item.price}</Text>
                        )}
                    </View>

                    {/* ⚡ BOTÓN CORREGIDO Y BLINDADO */}
                    <TouchableOpacity 
                        style={styles.addButton}
                        onPress={() => {
                            // 1. EL CANDADO ANTES DE EJECUTAR (Bypass controlado para TypeScript)
                            const currentCart = useCartStore.getState().items;
                            const firstItem = currentCart[0] as any;
                            const cartBusinessId = currentCart.length > 0 ? (firstItem.businessId || firstItem.business_id) : null;
                            
                            if (cartBusinessId && cartBusinessId !== business.id) {
                                Alert.alert("Acción no permitida", "No puedes mezclar productos de diferentes negocios. Vacía tu carrito primero.");
                                return;
                            }

                            // 2. EXTRAEMOS PRECIO FINAL E IMAGEN (Blindaje numérico absoluto)
                            const calculatedPrice = item.isPromo ? item.discountPrice : item.price;
                            const finalPrice = Number(calculatedPrice) || 0; // Obligamos a que sea 'number' puro
                            const imageUri = prodImage.uri ? prodImage.uri : '';

                            // 3. INYECTAMOS EN ZUSTAND
                            addItem({
                                id: item.id, 
                                title: item.title,
                                price: finalPrice,
                                image: imageUri,
                                quantity: 1,
                                businessId: business.id
                            });

                            // 4. ÉXITO
                            Alert.alert("🛒 Carrito", `${item.title} añadido al carrito`);
                        }}
                    >
                        <Ionicons name="add" size={20} color="white" />
                    </TouchableOpacity>
                </TouchableOpacity>
            );
        }}

        ListEmptyComponent={
            <View style={{ padding: 20, alignItems: 'center', marginTop: 20 }}>
                <Ionicons name="search-outline" size={40} color="#ccc" />
                <Text style={styles.emptyText}>
                    {searchQuery.length > 0 
                        ? `No encontramos "${searchQuery}"`
                        : "No hay productos disponibles."}
                </Text>
            </View>
        }
      />
      {/* FLOATING CART BUTTON */}
      {totalItems > 0 && (
        <TouchableOpacity 
          style={styles.floatingCartButton} 
          onPress={() => router.push('/cart/cart')}
        >
          <Ionicons name="cart" size={20} color="#000" style={{ marginRight: 8 }} />
          <Text style={styles.floatingCartText}>Sigue con tu compra ({totalItems})</Text>
          <Ionicons name="arrow-forward" size={16} color="#000" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageContainer: { width: '100%', height: 220 },
  headerImage: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)' },
  
  backButton: {
    position: 'absolute', top: 50, left: 20, zIndex: 10, backgroundColor: 'white',
    padding: 8, borderRadius: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, elevation: 4
  },

  floatingInfoCard: {
    marginHorizontal: 20, marginTop: -40, backgroundColor: 'white', borderRadius: 20, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 8, marginBottom: 20,
  },
  businessName: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', flex: 1 },
  businessMeta: { color: '#666', marginTop: 5, fontSize: 13 },
  businessCategory: { color: '#888', marginTop: 2, fontSize: 13 },
  ratingBadge: { backgroundColor: '#F0F0F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingText: { fontSize: 12, fontWeight: 'bold' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 15,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#333', height: '100%' },

  menuTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginBottom: 15, color: '#333' },
  categoriesContainer: { paddingHorizontal: 20, paddingBottom: 10 },
  categoryChip: { marginRight: 20, alignItems: 'center' },
  categoryChipSelected: {  },
  categoryText: { fontSize: 16, color: '#999', fontWeight: '500' },
  categoryTextSelected: { fontWeight: 'bold', color: '#000' },
  activeLine: { height: 3, width: 20, backgroundColor: '#FFDB58', marginTop: 4, borderRadius: 2 },

  productCard: {
    flexDirection: 'row', backgroundColor: 'white', marginHorizontal: 20, marginBottom: 16, borderRadius: 16, padding: 12, alignItems: 'center',
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: '#F0F0F0'
  },
  productImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#eee' },
  productInfo: { flex: 1, marginLeft: 14, marginRight: 10 },
  productTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  productDesc: { fontSize: 12, color: '#888', marginBottom: 8, lineHeight: 16 },
  productPrice: { fontSize: 15, fontWeight: 'bold', color: '#00A86B' },
  oldPrice: { textDecorationLine: 'line-through', color: '#999', fontSize: 12 },
  addButton: {
    backgroundColor: '#FFDB58', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.1, elevation: 2
  },
  emptyText: { textAlign: 'center', marginTop: 10, color: '#999' },
  // --- FLOATING CART BUTTON ---
  floatingCartButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFDB58',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 99
  },
  floatingCartText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000'
  }
});