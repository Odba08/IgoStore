import React, { useState, useMemo } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, FlatList, Image 
} from 'react-native';
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// TUS IMPORTS (Asegúrate que las rutas sean correctas)

import { useFavoritesStore } from '@/presentation/store/useFavoriteStore'; 
import { useBusinesses } from '@/presentation/hooks/useBusiness';
import { Business } from '@/core/entities/bussines.entity';
import { useCartStore } from '@/presentation/store/useCartStore';

export default function CategoryScreen() {
  const router = useRouter();
   const totalItems = useCartStore(state => state.items.reduce((total, item) => total + item.quantity, 0));
  
  // 1. RECIBIMOS LOS PARÁMETROS DE LA URL (ID y Nombre de la categoría)
  const { id, name } = useLocalSearchParams(); 
  const categoryId = Array.isArray(id) ? id[0] : id; // Aseguramos que sea string
  const categoryName = Array.isArray(name) ? name[0] : name;

  // 2. DATA GLOBAL Y STORE
  const { data: businesses, isLoading } = useBusinesses();
  const favorites = useFavoritesStore(state => state.favorites);
  const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);

  // 3. ESTADO DEL BUSCADOR
  const [searchText, setSearchText] = useState('');

  // 4. EL FILTRO MAESTRO (Categoría + Buscador)
  const filteredBusinesses = useMemo(() => {
    if (!businesses) return [];

    // Paso A: Filtramos solo los de esta categoría
    const byCategory = businesses.filter(b => b.categoryId === categoryId);

    // Paso B: Si hay texto en el buscador, filtramos esos resultados
    if (!searchText) return byCategory;

    return byCategory.filter(b => 
      b.name.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [businesses, categoryId, searchText]);

  // --- COMPONENTE DE TARJETA (Reutilizado) ---
  const StoreCard = ({ item, isFav }: { item: Business, isFav: boolean }) => {
    // Lógica para imagen o placeholder
    const imageSource = item.images && item.images.length > 0 
      ? { uri: item.images[0].url } 
      : require('../../assets/images/adaptive-icon.png'); // Ajusta tu ruta de imagen por defecto

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.9}
        onPress={() => router.push({ pathname: "/business/[id]", params: { id: item.id }})}
      >
        <Image source={imageSource} style={styles.cardImage} resizeMode="cover" />
        
        <TouchableOpacity 
          style={styles.favButton} 
          onPress={(e) => {
             e.stopPropagation();
             toggleFavorite(item.id);
          }}
        >
          <Ionicons 
            name={isFav ? "heart" : "heart-outline"} 
            size={20} 
            color={isFav ? "#FF453A" : "black"} 
          />
        </TouchableOpacity>

        <View style={styles.cardInfo}>
           <Text style={styles.cardTitle}>{item.name}</Text>
           <View style={styles.cardMeta}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.metaText}>4.5 • Envío Gratis</Text>
           </View>
           {/* <Text numberOfLines={2} style={styles.descriptionText}>
              {item.description || "Sin descripción disponible."}
           </Text> */}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#FFDB58"/></View>;
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar style='dark' />
      
      {/* Header Personalizado con Título de la Categoría */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
           <Ionicons name='chevron-back-outline' size={24} color='#000' />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>{categoryName || 'Categoría'}</Text>

        <TouchableOpacity style={styles.iconBtn}
         onPress={() => router.push('/cart/cart')}
        >
           <Ionicons name='cart-outline' size={24} color='#000' />
             {totalItems > 0 && (
               <View style={styles.badge}>
                 <Text style={styles.badgeText}>
                   {totalItems > 99 ? '99+' : totalItems}
                 </Text>
               </View>
             )}
        </TouchableOpacity>

      </View>

      {/* BUSCADOR */}
      <View style={styles.searchContainer}>
         <Ionicons name="search" size={20} color="#999" style={{marginRight: 10}} />
         <TextInput
             style={styles.searchInput}
             placeholder={`Buscar en ${categoryName}...`}
             placeholderTextColor="#999"
             value={searchText}
             onChangeText={setSearchText}
         />
         {searchText.length > 0 && (
             <TouchableOpacity onPress={() => setSearchText('')}>
                 <Ionicons name="close-circle" size={20} color="#999" />
             </TouchableOpacity>
         )}
      </View>

      {/* LISTA DE RESULTADOS */}
      <FlatList 
          data={filteredBusinesses}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 15 }}>
               <StoreCard 
                   item={item} 
                   isFav={favorites.includes(item.id)} 
               />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="storefront-outline" size={50} color="#ccc" />
                <Text style={styles.emptyText}>
                    No hay tiendas en {categoryName} por el momento.
                </Text>
            </View>
          }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F2F4F7' }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 50, paddingHorizontal: 20, marginBottom: 15,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', textTransform: 'capitalize' },
  iconBtn: {
    backgroundColor: 'white', padding: 10, borderRadius: 25,
    shadowColor: '#000', shadowOpacity: 0.1, elevation: 3
  },

  // Buscador
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: "white", paddingHorizontal: 15, height: 50,
    marginHorizontal: 20, marginBottom: 20, borderRadius: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 3
  },
  searchInput: { flex: 1, fontSize: 16, color: '#333' },

  // Tarjetas
  card: {
    backgroundColor: 'white', borderRadius: 16,
    flexDirection: 'row', padding: 10, alignItems: 'center',
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
  },
  cardImage: { width: 90, height: 90, borderRadius: 12, backgroundColor: '#eee' },
  cardInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  metaText: { fontSize: 12, color: '#666', fontWeight: '500' },
  descriptionText: { fontSize: 12, color: '#888' },
  favButton: { position: 'absolute', top: 10, right: 10, padding: 5, zIndex: 10 },

  // Empty State
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { textAlign: 'center', marginTop: 10, color: '#888', fontSize: 16 },
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
});