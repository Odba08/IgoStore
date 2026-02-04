import React, { useState, useMemo } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, ActivityIndicator, FlatList, Image 
} from 'react-native';
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useBusinesses } from '@/presentation/hooks/Bussiness';
import { Business } from '@/infrastructure/interfaces/bussines-response';
// IMPORTAMOS EL STORE GLOBAL
import { useFavoritesStore } from '../../../../presentation/store/useFavoriteStore'; 

export default function Productos() {
  const router = useRouter();
  
  // 1. MUNICIÓN: Traemos todos los negocios del backend
  const { data: businesses, isLoading } = useBusinesses();
  
  // 2. CONEXIÓN AL CEREBRO GLOBAL (Zustand)
  // Reemplazamos useState por esto:
  const favorites = useFavoritesStore(state => state.favorites);
  const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);

  // 3. ESTADO LOCAL (Solo para el buscador, que sí es temporal)
  const [searchText, setSearchText] = useState('');

  // 4. LÓGICA DE FILTRADO
  const filteredBusinesses = useMemo(() => {
    if (!businesses) return [];
    if (!searchText) return businesses;
    return businesses.filter(b => 
      b.name.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [businesses, searchText]);

  // 5. LÓGICA DE FAVORITOS (Usando la data global)
  const favoriteBusinesses = useMemo(() => {
    if (!businesses) return [];
    return businesses.filter(b => favorites.includes(b.id));
  }, [businesses, favorites]);


  // --- SUB-COMPONENTES (Sin cambios mayores, solo usan la lógica nueva) ---

  const StoreCard = ({ item, isFav }: { item: Business, isFav: boolean }) => {
    const image = item.images.length > 0 
      ? { uri: item.images[0].url } 
      : require('../../../../assets/images/adaptive-icon.png');

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.9}
        onPress={() => router.push({ pathname: "/business/[id]", params: { id: item.id }})}
      >
        <Image source={image} style={styles.cardImage} resizeMode="cover" />
        
        <TouchableOpacity 
          style={styles.favButton} 
          onPress={(e) => {
             e.stopPropagation();
             toggleFavorite(item.id); // Llama a la acción global
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
              <Text style={styles.metaText}>4.5 • 30 min • Envío Gratis</Text>
           </View>
        </View>
      </TouchableOpacity>
    );
  };

  const FavCard = ({ item }: { item: Business }) => {
    const image = item.images.length > 0 
      ? { uri: item.images[0].url } 
      : require('../../../../assets/images/adaptive-icon.png');

    return (
      <TouchableOpacity 
        style={styles.favCard}
        onPress={() => router.push({ pathname: "/business/[id]", params: { id: item.id }})}
      >
        <Image source={image} style={styles.favImage} />
        <View style={styles.favOverlay} />
        <Text style={styles.favTitle} numberOfLines={1}>{item.name}</Text>
        <View style={styles.removeFavButton}>
            <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
                <Ionicons name="heart" size={16} color="white" />
            </TouchableOpacity>
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
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
           <Ionicons name='chevron-back-outline' size={24} color='#000' />
        </TouchableOpacity>

        <View style={styles.locationBox}>
          <Ionicons name='location-outline' size={18} color='#6528FF' />
          <Text numberOfLines={1} style={styles.locationText}>Calle 1 con av. 23</Text>
          <Ionicons name='chevron-down' size={16} color='#5D5D5D' />
        </View>

        <TouchableOpacity style={styles.iconBtn}>
           <Ionicons name='cart-outline' size={24} color='#000' />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* BUSCADOR */}
        <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={{marginRight: 10}} />
            <TextInput
                style={styles.searchInput}
                placeholder='Buscar tiendas...'
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

        {/* SECCIÓN FAVORITOS (Persistente en sesión) */}
        {favoriteBusinesses.length > 0 && (
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Tus Favoritos </Text>
                <FlatList 
                    horizontal
                    data={favoriteBusinesses}
                    keyExtractor={item => item.id}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => <FavCard item={item} />}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                />
            </View>
        )}

        {/* LISTA FILTRADA */}
        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
                {searchText ? `Resultados para "${searchText}"` : 'Todas las Tiendas'}
            </Text>
            
            {filteredBusinesses.length === 0 ? (
                <Text style={styles.emptyText}>No encontramos tiendas.</Text>
            ) : (
                filteredBusinesses.map((item) => (
                    <View key={item.id} style={{ marginHorizontal: 20, marginBottom: 15 }}>
                        <StoreCard 
                            item={item} 
                            isFav={favorites.includes(item.id)} 
                        />
                    </View>
                ))
            )}
        </View>

      </ScrollView>
    </View>
  );
}

// ... Estilos igual que antes ...
const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F2F4F7' }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 50, paddingHorizontal: 20, marginBottom: 10,
  },
  locationBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: "white",
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  locationText: { marginHorizontal: 5, fontSize: 14, fontWeight: "600", color: "#333" },
  iconBtn: {
    backgroundColor: 'white', padding: 10, borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.1, elevation: 3
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: "white",
    paddingHorizontal: 15, height: 50,
    marginHorizontal: 20, marginTop: 10, marginBottom: 20,
    borderRadius: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 3
  },
  searchInput: { flex: 1, fontSize: 16, color: '#333' },
  sectionContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: "800", marginLeft: 20, marginBottom: 15, color: '#1a1a1a' },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#888', fontStyle: 'italic' },
  card: {
    backgroundColor: 'white', borderRadius: 16,
    flexDirection: 'row', padding: 10, alignItems: 'center',
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
  },
  cardImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#eee' },
  cardInfo: { flex: 1, marginLeft: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#666' },
  favButton: { position: 'absolute', top: 10, right: 10, padding: 5 },
  favCard: {
    width: 140, height: 140, marginRight: 15,
    borderRadius: 50, overflow: 'hidden', position: 'relative',
    backgroundColor: 'black'
  },
  favImage: { width: '100%', height: '100%', opacity: 0.8 },
  favOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  favTitle: {
    position: 'absolute', bottom: 15, left: 10, right: 10,
    color: 'white', fontWeight: 'bold', fontSize: 14, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3
  },
  removeFavButton: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 6
  }
});