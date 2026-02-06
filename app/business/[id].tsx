import React, { useState, useMemo } from 'react'; // <--- ASEGÚRATE DE TENER useMemo
import { View, Text, Image, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, FlatList, TextInput } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// HOOKS
import { useBusiness } from '@/presentation/hooks/Bussiness';
import { useMenuCategories } from '@/presentation/hooks/useMenuCategories';

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams();
  const businessId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();

  // 1. DATA
  const { data: business, isLoading: loadingBusiness } = useBusiness(businessId);
  const { categories, isLoading: loadingCategories } = useMenuCategories(businessId);

  // 2. ESTADOS
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 3. LÓGICA DE FILTRADO
  const filteredProducts = useMemo(() => {
    if (!business?.products) return [];
    let result = business.products;

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

  // --- SOLUCIÓN AL TECLADO: MEMORIZAMOS EL HEADER ---
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
        
        {/* BUSCADOR (Ahora dentro del useMemo) */}
        <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
                placeholder={`Buscar en ${business.name}...`}
                placeholderTextColor="#999"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery} // Esto actualiza el estado fuera del memo
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
  // ^^^ IMPORTANTE: Agregamos las dependencias para que se actualice visualmente cuando escribas

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
        
        // --- AQUÍ ESTÁ EL CAMBIO ---
        // Pasamos la variable memorizada, NO una función anónima () => ...
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

                    <TouchableOpacity style={styles.addButton}>
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
    </View>
  );
}

// ... TUS ESTILOS ...
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

  // === ESTILOS DEL BUSCADOR ===
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
  emptyText: { textAlign: 'center', marginTop: 10, color: '#999' }
});