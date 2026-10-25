import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Business } from '@/core/entities/bussines.entity';
import { useLocationStore } from '@/presentation/store/useLocationStore';
import { useFavoritesStore } from '@/presentation/store/useFavoriteStore';
import { useThemeStore } from '@/presentation/store/useThemeStore';
import {
  calculateDistanceKm,
  formatDistance,
  estimateDeliveryTime,
} from '@/presentation/utils/distanceCalculator';

interface Props {
  business: Business;
}

export const BusinessCard = ({ business }: Props) => {
  const router = useRouter();
  const { colors, isDark } = useThemeStore();
  const { lastKnowLocation } = useLocationStore();
  const { favorites, toggleFavorite } = useFavoritesStore();
  const isFav = favorites.includes(business.id);

  // Calcular distancia real y tiempo de delivery dinámico
  const userCoords = lastKnowLocation
    ? { latitude: lastKnowLocation.latitude, longitude: lastKnowLocation.longitude }
    : null;

  const businessCoords =
    business.latitude && business.longitude
      ? { latitude: business.latitude, longitude: business.longitude }
      : null;

  const distanceKm = calculateDistanceKm(userCoords, businessCoords);
  const formattedDistance = formatDistance(distanceKm);
  const deliveryTime = estimateDeliveryTime(distanceKm);

  const mainImage =
    business.images.length > 0
      ? { uri: business.images[0].url }
      : require('../../../../assets/images/adaptive-icon.png');

  const handlePress = () => {
    router.push({
      pathname: '/business/[id]',
      params: { id: business.id },
    });
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        },
      ]}
      activeOpacity={0.9}
      onPress={handlePress}
    >
      {/* 1. CONTENEDOR DE IMAGEN */}
      <View style={styles.imageContainer}>
        <Image source={mainImage} style={styles.image} resizeMode="cover" />

        {/* Botón de Favorito */}
        <TouchableOpacity
          style={styles.favBadge}
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite(business.id);
          }}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isFav ? 'heart' : 'heart-outline'}
            size={16}
            color={isFav ? '#E11D48' : '#FFF'}
          />
        </TouchableOpacity>

        {/* Badge de Tiempo Dinámico */}
        <View style={styles.timeBadge}>
          <Ionicons name="time-outline" size={11} color="#333" style={{ marginRight: 3 }} />
          <Text style={styles.timeText}>{deliveryTime}</Text>
        </View>

        {/* Badge de Rating Real */}
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={11} color="#0F0330" />
          <Text style={styles.ratingText}>
            {business.rating ? Number(business.rating).toFixed(1) : 'Nuevo'}
            {business.reviewsCount && business.reviewsCount > 0 ? ` (${business.reviewsCount})` : ''}
          </Text>
        </View>

        {/* Badge de Tienda Oficial IGO */}
        {business.isOfficialStore && (
          <View style={styles.officialBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#000" />
            <Text style={styles.officialBadgeText}>Oficial IGO</Text>
          </View>
        )}
      </View>

      {/* 2. INFORMACIÓN */}
      <View style={styles.infoContainer}>
        {/* Título y Verificado */}
        <View style={styles.row}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {business.name}
          </Text>
          {business.isOfficialStore && (
            <Ionicons name="checkmark-circle" size={16} color="#00A86B" style={{ marginLeft: 4 }} />
          )}
        </View>

        {/* Categoría y Distancia Dinámica */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          {business.category?.name && (
            <Text style={[styles.subtitle, { color: colors.textSecondary, marginTop: 0 }]} numberOfLines={1}>
              {business.category.name} • 
            </Text>
          )}
          <Ionicons name="location-outline" size={12} color={colors.textSecondary} style={{ marginRight: 2 }} />
          <Text style={[styles.subtitle, { color: colors.textSecondary, marginTop: 0 }]}>
            {formattedDistance}
          </Text>
        </View>

        {/* Línea de Entrega */}
        <View style={styles.footerRow}>
          {business.freeDeliveryAbove && business.freeDeliveryAbove > 0 ? (
            <View style={styles.deliveryBadge}>
              <Ionicons name="bicycle" size={12} color="#00A86B" />
              <Text style={styles.deliveryText}>
                Envío Gratis &gt; ${business.freeDeliveryAbove}
              </Text>
            </View>
          ) : (
            <View style={[styles.deliveryBadge, { backgroundColor: '#F3F4F6' }]}>
              <Ionicons name="bicycle" size={12} color="#4B5563" />
              <Text style={[styles.deliveryText, { color: '#4B5563' }]}>Envío IGO</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 260,
    backgroundColor: 'white',
    borderRadius: 16,
    marginRight: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  imageContainer: {
    height: 140,
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#E1E1E1',
  },
  favBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  timeBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    elevation: 2,
  },
  timeText: { fontSize: 11, fontWeight: '800', color: '#333' },

  ratingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFDB58',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    elevation: 2,
  },
  officialBadge: {
    position: 'absolute',
    top: 10,
    left: 46,
    backgroundColor: '#FCD116',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    elevation: 3,
  },
  officialBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
  },
  ratingText: { fontSize: 11, fontWeight: 'bold', color: '#0F0330' },

  infoContainer: {
    padding: 12,
    justifyContent: 'space-between',
    minHeight: 85,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
    flex: 1,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  footerRow: { marginTop: 8, flexDirection: 'row' },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deliveryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00A86B',
  },
});