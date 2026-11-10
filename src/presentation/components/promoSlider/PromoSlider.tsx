import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Linking,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Banner, BannerActionType, getBannersApi } from '@/infrastructure/api/banners.api';

const { width } = Dimensions.get('window');

const CARD_WIDTH = width * 0.9;
const CARD_MARGIN = 12;
const TOTAL_ITEM_WIDTH = CARD_WIDTH + CARD_MARGIN;
const CARD_HEIGHT = Math.round(CARD_WIDTH / 2.16); // Proporción exacta de los banners (972x450)

// Banners locales de respaldo para primer inicio o conexión lenta
const LOCAL_FALLBACK_BANNERS: (Banner & { localSource?: any })[] = [
  {
    id: 'local-1',
    title: 'Igo Store Oficial',
    imageUrl: '',
    localSource: require('../../../../assets/IGO Store.png'),
    actionType: 'INFO_MODAL',
    infoTitle: '¡Bienvenido a IGO Store!',
    infoContent:
      'Descubre los mejores comercios, restaurantes, farmacias y servicios en tu ciudad. Pide delivery rápido y seguro con seguimiento en tiempo real directo a tu puerta.',
    isActive: true,
    order: 1,
  },
  {
    id: 'local-2',
    title: 'Síguenos en Instagram',
    imageUrl: '',
    localSource: require('../../../../assets/IGO Instagram.png'),
    actionType: 'EXTERNAL_URL',
    actionUrl: 'https://www.instagram.com/igostore.ve',
    infoTitle: 'Comunidad IGO en Instagram',
    infoContent:
      'Entérate de promociones exclusivas, nuevos aliados comerciales y sorteos siguiéndonos en nuestra cuenta oficial de Instagram.',
    isActive: true,
    order: 2,
  },
  {
    id: 'local-3',
    title: 'Por tu Negocio en IGO',
    imageUrl: '',
    localSource: require('../../../../assets/Por tu Negocio en IGO.png'),
    actionType: 'INFO_MODAL',
    infoTitle: '¡Impulsa tu negocio con IGO Store!',
    infoContent:
      'Únete a nuestra red de comercios aliados. Aumenta tus ventas con entregas rápidas y visibilidad total ante miles de clientes en tu zona. Contáctanos para afiliar tu negocio hoy mismo.',
    isActive: true,
    order: 3,
  },
];

export const PromoSlider = () => {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [banners, setBanners] = useState<(Banner & { localSource?: any })[] | null>(null);
  const [selectedBanner, setSelectedBanner] = useState<(Banner & { localSource?: any }) | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchBanners = useCallback(async () => {
    try {
      const data = await getBannersApi();
      if (Array.isArray(data)) {
        setBanners(data);
      } else {
        setBanners(LOCAL_FALLBACK_BANNERS);
      }
    } catch (error) {
      // Si la API falla o está offline, mostrar los banners oficiales locales de respaldo
      if (banners === null) {
        setBanners(LOCAL_FALLBACK_BANNERS);
      }
    }
  }, [banners]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  // Si ya cargó y la cantidad de banners es 0 o menor, NO mostrar nada
  if (banners !== null && banners.length <= 0) {
    return null;
  }

  const activeBanners = banners || LOCAL_FALLBACK_BANNERS;

  // Auto-scroll del slider cada 4.5 segundos
  useEffect(() => {
    if (activeBanners.length <= 1) return;

    const interval = setInterval(() => {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= activeBanners.length) {
        nextIndex = 0;
      }

      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
        viewPosition: 0.5,
      });

      setCurrentIndex(nextIndex);
    }, 4500);

    return () => clearInterval(interval);
  }, [currentIndex, activeBanners.length]);

  const handleBannerPress = async (banner: Banner & { localSource?: any }) => {
    if (!banner.actionType || banner.actionType === 'NONE') {
      // "mostrar informacion false": no hace nada
      return;
    }

    if (banner.actionType === 'EXTERNAL_URL' && banner.actionUrl) {
      try {
        const canOpen = await Linking.canOpenURL(banner.actionUrl);
        if (canOpen) {
          await Linking.openURL(banner.actionUrl);
        } else {
          await Linking.openURL(banner.actionUrl);
        }
      } catch (err) {
        console.warn('No se pudo abrir el enlace del banner:', banner.actionUrl, err);
      }
      return;
    }

    if (banner.actionType === 'INFO_MODAL') {
      setSelectedBanner(banner);
      setModalVisible(true);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={activeBanners}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={TOTAL_ITEM_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        getItemLayout={(_, index) => ({
          length: TOTAL_ITEM_WIDTH,
          offset: TOTAL_ITEM_WIDTH * index,
          index,
        })}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(ev) => {
          const newIndex = Math.round(ev.nativeEvent.contentOffset.x / TOTAL_ITEM_WIDTH);
          setCurrentIndex(Math.max(0, Math.min(newIndex, activeBanners.length - 1)));
        }}
        renderItem={({ item }) => {
          const imageSource = item.localSource
            ? item.localSource
            : { uri: item.imageUrl };

          const isClickable = item.actionType && item.actionType !== 'NONE';

          return (
            <TouchableOpacity
              activeOpacity={isClickable ? 0.85 : 1}
              onPress={() => handleBannerPress(item)}
              style={styles.card}
            >
              <Image
                source={imageSource}
                style={styles.bannerImage}
                resizeMode="cover"
              />
              {isClickable && (
                <View style={styles.badgeIndicator}>
                  <Ionicons
                    name={
                      item.actionType === 'EXTERNAL_URL'
                        ? 'open-outline'
                        : 'information-circle-outline'
                    }
                    size={16}
                    color="#FFFFFF"
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Indicadores de paginación (Dots) si hay más de 1 banner */}
      {activeBanners.length > 1 && (
        <View style={styles.dotsContainer}>
          {activeBanners.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}

      {/* MODAL INFORMATIVO */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="megaphone" size={22} color="#FFC93C" />
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedBanner?.infoTitle || selectedBanner?.title || 'Información'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Imagen del Banner dentro del modal */}
            {selectedBanner && (
              <Image
                source={
                  selectedBanner.localSource
                    ? selectedBanner.localSource
                    : { uri: selectedBanner.imageUrl }
                }
                style={styles.modalImage}
                resizeMode="cover"
              />
            )}

            {/* Contenido descriptivo */}
            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalDescription}>
                {selectedBanner?.infoContent ||
                  'No hay información adicional para este anuncio.'}
              </Text>

              {/* Botón de acción adicional si incluye enlace */}
              {selectedBanner?.actionUrl ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={async () => {
                    if (selectedBanner?.actionUrl) {
                      setModalVisible(false);
                      await Linking.openURL(selectedBanner.actionUrl);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="open-outline" size={18} color="#000" />
                  <Text style={styles.actionButtonText}>Abrir Enlace</Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>

            {/* Botón de Cerrar */}
            <TouchableOpacity
              style={styles.closeFooterButton}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.closeFooterButtonText}>Entendido</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    marginRight: CARD_MARGIN,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  badgeIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 5,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: '#FFC93C',
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#CBD5E1',
  },
  // ESTILOS DEL MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#0F172A',
  },
  modalBody: {
    padding: 18,
    maxHeight: 220,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFC93C',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  closeFooterButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  closeFooterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
});
