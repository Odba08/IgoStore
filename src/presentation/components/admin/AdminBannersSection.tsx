import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Switch,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Banner,
  BannerActionType,
  getAllBannersAdminApi,
  createBannerApi,
  updateBannerApi,
  deleteBannerApi,
  seedBannersApi,
} from '@/infrastructure/api/banners.api';
import { pickImageFromGallery, uploadImage } from '@/infrastructure/services/imageUpload.service';

const { width } = Dimensions.get('window');

export const AdminBannersSection: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Form State
  const [title, setTitle] = useState<string>('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [actionType, setActionType] = useState<BannerActionType>('NONE');
  const [actionUrl, setActionUrl] = useState<string>('');
  const [infoTitle, setInfoTitle] = useState<string>('');
  const [infoContent, setInfoContent] = useState<string>('');

  const loadBanners = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllBannersAdminApi();
      setBanners(data);
    } catch (e) {
      console.warn('Error loading admin banners:', e);
      Alert.alert('Error', 'No se pudieron cargar los banners publicitarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const handlePickImage = async () => {
    try {
      const uri = await pickImageFromGallery();
      if (uri) {
        setImageUri(uri);
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen de la galería.');
    }
  };

  const resetForm = () => {
    setTitle('');
    setImageUri(null);
    setActionType('NONE');
    setActionUrl('');
    setInfoTitle('');
    setInfoContent('');
  };

  const handleSaveBanner = async () => {
    if (!title.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa un título para el banner.');
      return;
    }
    if (!imageUri) {
      Alert.alert('Imagen requerida', 'Por favor selecciona una imagen para el banner.');
      return;
    }

    try {
      setSaving(true);
      // 1. Subir la imagen
      let uploadedUrl = imageUri;
      if (!imageUri.startsWith('http://') && !imageUri.startsWith('https://')) {
        uploadedUrl = await uploadImage(imageUri, `banner_${Date.now()}.jpg`);
      }

      // 2. Crear banner en backend
      await createBannerApi({
        title: title.trim(),
        imageUrl: uploadedUrl,
        actionType,
        actionUrl: actionType === 'EXTERNAL_URL' ? actionUrl.trim() : undefined,
        infoTitle: actionType === 'INFO_MODAL' ? infoTitle.trim() : undefined,
        infoContent: actionType === 'INFO_MODAL' ? infoContent.trim() : undefined,
        isActive: true,
        order: banners.length,
      });

      Alert.alert('Éxito', '¡Banner publicitario creado exitosamente!');
      resetForm();
      setModalVisible(false);
      loadBanners();
    } catch (err: any) {
      console.error('Error guardando banner:', err);
      Alert.alert('Error', err?.message || 'No se pudo guardar el banner.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      await updateBannerApi(banner.id, { isActive: !banner.isActive });
      loadBanners();
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar el estado del banner.');
    }
  };

  const handleDeleteBanner = (banner: Banner) => {
    Alert.alert(
      'Eliminar Banner',
      `¿Estás seguro de eliminar el banner "${banner.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBannerApi(banner.id);
              Alert.alert('Eliminado', 'Banner eliminado correctamente.');
              loadBanners();
            } catch (err) {
              Alert.alert('Error', 'No se pudo eliminar el banner.');
            }
          },
        },
      ],
    );
  };

  const handleSeedDefaults = () => {
    Alert.alert(
      'Restaurar Banners Oficiales',
      '¿Deseas restaurar los banners oficiales por defecto (IGO Store, Instagram, Tu Negocio en IGO)?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: async () => {
            try {
              setLoading(true);
              await seedBannersApi();
              Alert.alert('Éxito', 'Banners oficiales restaurados.');
              loadBanners();
            } catch (err) {
              Alert.alert('Error', 'No se pudieron restaurar los banners.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const renderActionLabel = (type: BannerActionType) => {
    switch (type) {
      case 'EXTERNAL_URL':
        return { label: 'Enlace / Instagram', color: '#10B981', icon: 'open-outline' };
      case 'INFO_MODAL':
        return { label: 'Información en App', color: '#F59E0B', icon: 'information-circle-outline' };
      default:
        return { label: 'Solo Mostrar', color: '#64748B', icon: 'eye-outline' };
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER SECTION */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Banners Publicitarios</Text>
          <Text style={styles.subtitle}>
            Administra los anuncios del slider principal en tiempo real.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={18} color="#000" />
          <Text style={styles.addBtnText}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* QUICK ACTIONS */}
      <View style={styles.quickActionsRow}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={loadBanners}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={16} color="#94A3B8" />
          <Text style={styles.secondaryBtnText}>Refrescar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: '#10B981' }]}
          onPress={handleSeedDefaults}
          activeOpacity={0.7}
        >
          <Ionicons name="sparkles" size={16} color="#10B981" />
          <Text style={[styles.secondaryBtnText, { color: '#10B981' }]}>
            Restaurar Oficiales
          </Text>
        </TouchableOpacity>
      </View>

      {/* LIST OF BANNERS */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#FFCC00" />
          <Text style={styles.loadingText}>Cargando banners...</Text>
        </View>
      ) : banners.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="images-outline" size={48} color="#64748B" />
          <Text style={styles.emptyTitle}>No hay banners registrados</Text>
          <Text style={styles.emptySub}>
            Cuando la cantidad de banners es 0, el slider se oculta automáticamente en la app.
          </Text>
          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={handleSeedDefaults}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={18} color="#000" />
            <Text style={styles.restoreBtnText}>Restaurar Banners Oficiales</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.bannersList}>
          {banners.map((b) => {
            const actionInfo = renderActionLabel(b.actionType);
            return (
              <View key={b.id} style={styles.bannerCard}>
                <Image
                  source={{ uri: b.imageUrl }}
                  style={styles.bannerThumbnail}
                  resizeMode="cover"
                />

                <View style={styles.bannerInfo}>
                  <Text style={styles.bannerItemTitle} numberOfLines={1}>
                    {b.title}
                  </Text>

                  <View style={styles.badgeRow}>
                    <View style={[styles.actionBadge, { backgroundColor: actionInfo.color + '22', borderColor: actionInfo.color }]}>
                      <Ionicons name={actionInfo.icon as any} size={12} color={actionInfo.color} />
                      <Text style={[styles.actionBadgeText, { color: actionInfo.color }]}>
                        {actionInfo.label}
                      </Text>
                    </View>

                    <Text style={styles.orderText}>#{b.order || 0}</Text>
                  </View>

                  {b.actionType === 'EXTERNAL_URL' && b.actionUrl ? (
                    <Text style={styles.urlPreviewText} numberOfLines={1}>
                      🔗 {b.actionUrl}
                    </Text>
                  ) : null}

                  {b.actionType === 'INFO_MODAL' && b.infoTitle ? (
                    <Text style={styles.infoPreviewText} numberOfLines={1}>
                      ℹ️ {b.infoTitle}
                    </Text>
                  ) : null}

                  <View style={styles.cardBottomRow}>
                    <View style={styles.switchRow}>
                      <Switch
                        value={b.isActive}
                        onValueChange={() => handleToggleActive(b)}
                        trackColor={{ false: '#334155', true: '#10B981' }}
                        thumbColor="#FFF"
                      />
                      <Text style={[styles.statusText, { color: b.isActive ? '#10B981' : '#64748B' }]}>
                        {b.isActive ? 'Activo' : 'Pausado'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteBanner(b)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* MODAL CREAR BANNER */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Nuevo Banner Publicitario</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              {/* Selector de Imagen */}
              <Text style={styles.fieldLabel}>Imagen del Banner</Text>
              <TouchableOpacity
                style={styles.imagePickerBox}
                onPress={handlePickImage}
                activeOpacity={0.8}
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="cloud-upload-outline" size={36} color="#FFCC00" />
                    <Text style={styles.imagePlaceholderText}>
                      Toca para seleccionar imagen de la galería
                    </Text>
                    <Text style={styles.imagePlaceholderSub}>
                      Recomendado: Proporción 2:1 (ej. 972x450 px)
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Título */}
              <Text style={styles.fieldLabel}>Título del Banner</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Gran Inauguración / 20% OFF"
                placeholderTextColor="#64748B"
                value={title}
                onChangeText={setTitle}
              />

              {/* Selector de Acción */}
              <Text style={styles.fieldLabel}>¿Qué hace al tocar el banner?</Text>
              <View style={styles.actionTypeSelector}>
                <TouchableOpacity
                  style={[styles.actionOption, actionType === 'NONE' && styles.actionOptionActive]}
                  onPress={() => setActionType('NONE')}
                >
                  <Ionicons name="eye-outline" size={16} color={actionType === 'NONE' ? '#000' : '#FFF'} />
                  <Text style={[styles.actionOptionText, actionType === 'NONE' && styles.actionOptionTextActive]}>
                    Solo Mostrar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionOption, actionType === 'EXTERNAL_URL' && styles.actionOptionActive]}
                  onPress={() => setActionType('EXTERNAL_URL')}
                >
                  <Ionicons name="open-outline" size={16} color={actionType === 'EXTERNAL_URL' ? '#000' : '#FFF'} />
                  <Text style={[styles.actionOptionText, actionType === 'EXTERNAL_URL' && styles.actionOptionTextActive]}>
                    Instagram / Web
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionOption, actionType === 'INFO_MODAL' && styles.actionOptionActive]}
                  onPress={() => setActionType('INFO_MODAL')}
                >
                  <Ionicons name="information-circle-outline" size={16} color={actionType === 'INFO_MODAL' ? '#000' : '#FFF'} />
                  <Text style={[styles.actionOptionText, actionType === 'INFO_MODAL' && styles.actionOptionTextActive]}>
                    Info en App
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Campo para EXTERNAL_URL */}
              {actionType === 'EXTERNAL_URL' && (
                <View style={styles.extraFieldBox}>
                  <Text style={styles.fieldLabel}>Enlace Externo (Instagram, Web, WhatsApp)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="https://www.instagram.com/tu_cuenta"
                    placeholderTextColor="#64748B"
                    autoCapitalize="none"
                    value={actionUrl}
                    onChangeText={setActionUrl}
                  />
                </View>
              )}

              {/* Campos para INFO_MODAL */}
              {actionType === 'INFO_MODAL' && (
                <View style={styles.extraFieldBox}>
                  <Text style={styles.fieldLabel}>Título Informativo</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Condiciones de la promoción"
                    placeholderTextColor="#64748B"
                    value={infoTitle}
                    onChangeText={setInfoTitle}
                  />

                  <Text style={styles.fieldLabel}>Detalles de la Información</Text>
                  <TextInput
                    style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                    placeholder="Escribe la descripción que verá el cliente al tocar el banner..."
                    placeholderTextColor="#64748B"
                    multiline
                    numberOfLines={4}
                    value={infoContent}
                    onChangeText={setInfoContent}
                  />

                  <Text style={styles.fieldLabel}>Enlace Opcional dentro de la Info</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="https://... (opcional)"
                    placeholderTextColor="#64748B"
                    autoCapitalize="none"
                    value={actionUrl}
                    onChangeText={setActionUrl}
                  />
                </View>
              )}
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveBanner}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#000" />
                    <Text style={styles.saveBtnText}>Guardar Banner</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFCC00',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1E1238',
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#94A3B8',
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: '#1E1238',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#332255',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 18,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFCC00',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  restoreBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  bannersList: {
    gap: 14,
  },
  bannerCard: {
    backgroundColor: '#1E1238',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#332255',
  },
  bannerThumbnail: {
    width: '100%',
    height: 140,
    backgroundColor: '#0F172A',
  },
  bannerInfo: {
    padding: 14,
  },
  bannerItemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  actionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  orderText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  urlPreviewText: {
    fontSize: 12,
    color: '#10B981',
    marginBottom: 8,
  },
  infoPreviewText: {
    fontSize: 12,
    color: '#F59E0B',
    marginBottom: 8,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2D1B4E',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 6,
  },
  // ESTILOS MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    backgroundColor: '#1E1238',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#332255',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2D1B4E',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  modalScrollView: {
    padding: 18,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 6,
    marginTop: 10,
  },
  imagePickerBox: {
    width: '100%',
    height: 140,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#332255',
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#120A24',
    marginBottom: 6,
  },
  imagePlaceholder: {
    alignItems: 'center',
    padding: 12,
  },
  imagePlaceholderText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  imagePlaceholderSub: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  input: {
    backgroundColor: '#120A24',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#332255',
    color: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
  },
  actionTypeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  actionOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#120A24',
    borderWidth: 1,
    borderColor: '#332255',
    gap: 4,
  },
  actionOptionActive: {
    backgroundColor: '#FFCC00',
    borderColor: '#FFCC00',
  },
  actionOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  actionOptionTextActive: {
    color: '#000',
  },
  extraFieldBox: {
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#2D1B4E',
    backgroundColor: '#160D2A',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#2D1B4E',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#FFCC00',
    gap: 6,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000',
  },
});

