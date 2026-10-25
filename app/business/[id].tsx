import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { useMenuCategories } from '@/presentation/hooks/useMenuCategories';
import { useBusiness } from '@/presentation/hooks/useBusiness';
import { useCartStore } from '@/presentation/store/useCartStore';
import { useLocationStore } from '@/presentation/store/useLocationStore';
import { useFavoritesStore } from '@/presentation/store/useFavoriteStore';
import { useThemeStore } from '@/presentation/store/useThemeStore';
import { Skeleton, ProductCardSkeleton } from '@/presentation/components/shared/Skeleton';
import {
  calculateDistanceKm,
  formatDistance,
  estimateDeliveryTime,
} from '@/presentation/utils/distanceCalculator';

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams();
  const businessId = (Array.isArray(id) ? id[0] : id) || '';
  const router = useRouter();
  const { colors, isDark } = useThemeStore();

  const addItem = useCartStore((state) => state.addItem);
  const items = useCartStore((state) => state.items);
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  const { lastKnowLocation } = useLocationStore();
  const { favorites, toggleFavorite } = useFavoritesStore();
  const isFav = favorites.includes(businessId);

  // 1. DATA
  const { data: business, isLoading: loadingBusiness } = useBusiness(businessId);
  const { categories, isLoading: loadingCategories } = useMenuCategories(businessId);

  // 2. ESTADOS
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 3. CÁLCULO DE DISTANCIA Y TIEMPO DINÁMICO
  const userCoords = lastKnowLocation
    ? { latitude: lastKnowLocation.latitude, longitude: lastKnowLocation.longitude }
    : null;

  const businessCoords =
    business?.latitude && business?.longitude
      ? { latitude: business.latitude, longitude: business.longitude }
      : null;

  const distanceKm = calculateDistanceKm(userCoords, businessCoords);
  const formattedDistance = formatDistance(distanceKm);
  const deliveryTime = estimateDeliveryTime(distanceKm);

  const filteredProducts = useMemo(() => {
    if (!business?.products) return [];

    let result = business.products.filter((p) => p.isApproved);

    if (selectedCategoryId !== null) {
      result = result.filter((p) => p.menuCategory?.id === selectedCategoryId);
    }

    if (searchQuery.length > 0) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
      );
    }
    return result;
  }, [business, selectedCategoryId, searchQuery]);

  const handlePress = (productId: string) => {
    router.push({ pathname: '/product/[id]', params: { id: productId } });
  };

  const getProductImage = (image: any) => {
    if (!image) return require('../../assets/images/adaptive-icon.png');
    if (image.url.startsWith('http')) return { uri: image.url };
    const API_URL = process.env.EXPO_PUBLIC_API_URL;
    return { uri: `${API_URL}/api/files/product/${image.url}` };
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

        <View style={[styles.floatingInfoCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.businessName, { color: colors.text }]}>{business.name}</Text>
            </View>

            {/* Rating Real Dinámico */}
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={13} color="#0F0330" style={{ marginRight: 3 }} />
              <Text style={styles.ratingText}>
                {business.rating ? Number(business.rating).toFixed(1) : 'Nuevo'}
                {business.reviewsCount && business.reviewsCount > 0
                  ? ` (${business.reviewsCount})`
                  : ''}
              </Text>
            </View>
          </View>

          {/* Delivery y Distancia Dinámica */}
          <View style={styles.metaRow}>
            <Ionicons name="bicycle" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[styles.businessMeta, { color: colors.textSecondary }]}>Delivery {deliveryTime}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Ionicons name="location-sharp" size={14} color={colors.textSecondary} style={{ marginRight: 3 }} />
            <Text style={[styles.businessMeta, { color: colors.textSecondary }]}>{formattedDistance}</Text>
          </View>

          <View style={styles.categoryRow}>
            <Ionicons name="pricetag-outline" size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.businessCategory, { color: colors.textMuted }]}>
              {business.category?.name || 'General'}
            </Text>
          </View>
        </View>

        {/* BUSCADOR */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder={`Buscar en ${business.name}...`}
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* SELECTOR DE CATEGORÍAS */}
        <View style={{ marginBottom: 15 }}>
          <Text style={[styles.menuTitle, { color: colors.text }]}>Menú</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategoryId === null && styles.categoryChipSelected,
              ]}
              onPress={() => setSelectedCategoryId(null)}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: selectedCategoryId === null ? colors.text : colors.textMuted },
                  selectedCategoryId === null && styles.categoryTextSelected,
                ]}
              >
                Todos
              </Text>
              {selectedCategoryId === null && <View style={styles.activeLine} />}
            </TouchableOpacity>

            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  selectedCategoryId === cat.id && styles.categoryChipSelected,
                ]}
                onPress={() => setSelectedCategoryId(cat.id)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: selectedCategoryId === cat.id ? colors.text : colors.textMuted },
                    selectedCategoryId === cat.id && styles.categoryTextSelected,
                  ]}
                >
                  {cat.name}
                </Text>
                {selectedCategoryId === cat.id && <View style={styles.activeLine} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }, [business, categories, selectedCategoryId, searchQuery, deliveryTime, formattedDistance, colors, isDark]);

  if (loadingBusiness || loadingCategories) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.imageContainer}>
          <Skeleton width="100%" height="100%" borderRadius={0} />
        </View>
        <View style={[styles.floatingInfoCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
          <Skeleton width="60%" height={24} borderRadius={6} />
          <Skeleton width="40%" height={14} borderRadius={4} style={{ marginTop: 10 }} />
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          <ProductCardSkeleton />
          <ProductCardSkeleton />
          <ProductCardSkeleton />
        </View>
      </View>
    );
  }

  if (!business) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Botón Volver */}
      <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.card }]} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </TouchableOpacity>

      {/* Botón Favorito en la esquina superior derecha */}
      <TouchableOpacity
        style={[styles.favoriteButton, { backgroundColor: colors.card }]}
        onPress={() => toggleFavorite(business.id)}
        activeOpacity={0.8}
      >
        <Ionicons
          name={isFav ? 'heart' : 'heart-outline'}
          size={22}
          color={isFav ? '#E11D48' : colors.text}
        />
      </TouchableOpacity>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={headerComponent || undefined}
        renderItem={({ item }) => {
          const prodImage = getProductImage(item.images?.[0]);

          return (
            <TouchableOpacity
              style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}
              onPress={() => handlePress(item.id)}
              activeOpacity={0.85}
            >
              <Image source={prodImage} style={[styles.productImage, { backgroundColor: isDark ? '#231254' : '#eee' }]} />

              <View style={styles.productInfo}>
                <Text style={[styles.productTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.productDesc, { color: colors.textMuted }]} numberOfLines={2}>
                  {item.description || 'Sin descripción disponible.'}
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

              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  const currentCart = useCartStore.getState().items;
                  const firstItem = currentCart[0] as any;
                  const cartBusinessId =
                    currentCart.length > 0
                      ? firstItem.businessId || firstItem.business_id
                      : null;

                  if (cartBusinessId && cartBusinessId !== business.id) {
                    Alert.alert(
                      'Acción no permitida',
                      'No puedes mezclar productos de diferentes negocios. Vacía tu carrito primero.'
                    );
                    return;
                  }

                  const calculatedPrice = item.isPromo ? item.discountPrice : item.price;
                  const finalPrice = Number(calculatedPrice) || 0;
                  const imageUri = prodImage.uri ? prodImage.uri : '';

                  addItem({
                    id: item.id,
                    title: item.title,
                    price: finalPrice,
                    image: imageUri,
                    quantity: 1,
                    businessId: business.id,
                  });
                }}
              >
                <Ionicons name="add" size={20} color="#0F0330" />
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
                : 'No hay productos disponibles.'}
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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },

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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    elevation: 4,
  },
  favoriteButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'white',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    elevation: 4,
  },

  floatingInfoCard: {
    marginHorizontal: 20,
    marginTop: -40,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 20,
  },
  businessName: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  businessMeta: { color: '#4B5563', fontSize: 13, fontWeight: '600' },
  metaDot: { marginHorizontal: 6, color: '#CBD5E1', fontSize: 13 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  businessCategory: { color: '#64748B', fontSize: 12, fontWeight: '500' },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFDB58',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: { fontSize: 12, fontWeight: '800', color: '#0F0330' },

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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#333', height: '100%' },

  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 20,
    marginBottom: 15,
    color: '#333',
  },
  categoriesContainer: { paddingHorizontal: 20, paddingBottom: 10 },
  categoryChip: { marginRight: 20, alignItems: 'center' },
  categoryChipSelected: {},
  categoryText: { fontSize: 16, color: '#999', fontWeight: '500' },
  categoryTextSelected: { fontWeight: 'bold', color: '#000' },
  activeLine: {
    height: 3,
    width: 20,
    backgroundColor: '#FFDB58',
    marginTop: 4,
    borderRadius: 2,
  },

  productCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  productImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#eee' },
  productInfo: { flex: 1, marginLeft: 14, marginRight: 10 },
  productTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  productDesc: { fontSize: 12, color: '#888', marginBottom: 8, lineHeight: 16 },
  productPrice: { fontSize: 15, fontWeight: 'bold', color: '#00A86B' },
  oldPrice: { textDecorationLine: 'line-through', color: '#999', fontSize: 12 },
  addButton: {
    backgroundColor: '#FFDB58',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    elevation: 2,
  },
  emptyText: { textAlign: 'center', marginTop: 10, color: '#999' },
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
    zIndex: 99,
  },
  floatingCartText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
});