import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/presentation/store/useAuthStore';
import { useLocationStore } from '@/presentation/store/useLocationStore';
import * as ImagePicker from 'expo-image-picker';
import { igoApi } from '@/infrastructure/api/igo.api';
import { uploadImage } from '@/infrastructure/services/imageUpload.service';
import { SupportChatModal } from '@/presentation/components/SupportChatModal';
import { IdentityVerificationModal } from '@/presentation/components/IdentityVerificationModal';
import { SettingsModal } from '@/presentation/components/SettingsModal';
import { useThemeStore } from '@/presentation/store/useThemeStore';

const PROFILE_OPTIONS = [
  { id: '1', title: 'Mis Pedidos', icon: 'receipt-outline' },
  { id: '2', title: 'Mis Direcciones', icon: 'location-outline' },
  { id: '3', title: 'Verificación de Identidad', icon: 'shield-checkmark-outline' },
  { id: '4', title: 'Cambiar Contraseña', icon: 'lock-closed-outline' },
  { id: '5', title: 'Configuración', icon: 'settings-outline' },
  { id: '6', title: 'Ayuda y Soporte', icon: 'chatbubbles-outline' },
];

const ProfileScreen = () => {
  const router = useRouter();
  const { expand } = useLocalSearchParams();
  const { user, logout, updateUserLocal, changePassword } = useAuthStore();
  const { colors, isDark } = useThemeStore();

  const { savedAddresses, removeSavedAddress } = useLocationStore();

  const [showAddresses, setShowAddresses] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.fullname || '');
  const [editPhone, setEditPhone] = useState(user?.phoneNumber || '');
  const [updating, setUpdating] = useState(false);

  // Modales
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [identityModalVisible, setIdentityModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  useEffect(() => {
    if (expand === 'addresses') {
      setShowAddresses(true);
    }
  }, [expand]);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permiso Denegado', 'Se requiere permiso para acceder a la galería.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (pickerResult.canceled || !pickerResult.assets[0]?.uri) return;

      const uri = pickerResult.assets[0].uri;
      setUpdating(true);

      const secureUrl = await uploadImage(uri, 'avatar.jpg');

      // Actualizar backend y estado local
      await igoApi.patch(`/users/${user?.id}`, { avatarUrl: secureUrl });
      await updateUserLocal({ avatarUrl: secureUrl });

      Alert.alert('¡Foto Actualizada!', 'Tu foto de perfil se actualizó correctamente.');
    } catch (err: any) {
      console.error('Error al subir avatar:', err);
      Alert.alert('Error', err?.message || 'Ocurrió un error al actualizar la imagen.');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Campo requerido', 'El nombre completo es obligatorio.');
      return;
    }

    try {
      setUpdating(true);
      const payload = {
        fullName: editName.trim(),
        phoneNumber: editPhone.trim(),
      };

      await igoApi.patch(`/users/${user?.id}`, payload);
      await updateUserLocal({
        fullname: editName.trim(),
        phoneNumber: editPhone.trim(),
      });

      setModalVisible(false);
      Alert.alert('Éxito', 'Perfil actualizado correctamente.');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'No se pudo actualizar el perfil.';
      Alert.alert('Error', Array.isArray(errMsg) ? errMsg[0] : errMsg);
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmNewPassword) {
      Alert.alert('Campos vacíos', 'Por favor ingresa la nueva contraseña y confírmala.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Contraseña corta', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    try {
      setUpdatingPassword(true);
      const success = await changePassword(newPassword);
      if (success) {
        Alert.alert('Éxito', 'Contraseña cambiada correctamente.');
        setNewPassword('');
        setConfirmNewPassword('');
        setPasswordModalVisible(false);
      } else {
        Alert.alert('Error', 'No se pudo cambiar la contraseña.');
      }
    } catch (err: any) {
      Alert.alert('Error', 'Ocurrió un error al intentar cambiar la contraseña.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleOptionPress = (optionTitle: string) => {
    if (optionTitle === 'Mis Pedidos') {
      router.push('/orders' as any);
    } else if (optionTitle === 'Mis Direcciones') {
      setShowAddresses(!showAddresses);
    } else if (optionTitle === 'Verificación de Identidad') {
      setIdentityModalVisible(true);
    } else if (optionTitle === 'Cambiar Contraseña') {
      setPasswordModalVisible(true);
    } else if (optionTitle === 'Configuración') {
      setSettingsModalVisible(true);
    } else if (optionTitle === 'Ayuda y Soporte') {
      setSupportModalVisible(true);
    }
  };

  const handleDeleteAddress = (id: string, label: string) => {
    Alert.alert(
      'Eliminar dirección',
      `¿Seguro que deseas eliminar "${label}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => removeSavedAddress(id) },
      ]
    );
  };

  const identityStatus = user?.identityStatus || 'UNVERIFIED';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#0F0330' : '#FFC93C' }]} edges={['top']}>
      {/* HEADER PERSONALIZADO */}
      <View style={[styles.customHeader, { backgroundColor: isDark ? '#0F0330' : '#FFC93C' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FFF' : '#1A1A1A'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#1A1A1A' }]}>Mi Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}>
        {/* ENCABEZADO DEL PERFIL */}
        <View style={[styles.headerSection, { backgroundColor: isDark ? '#190E38' : '#FFC93C' }]}>
          <View style={styles.avatarContainer}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={[styles.avatar, { borderColor: isDark ? '#2C1D54' : '#FFF' }]} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: isDark ? '#231254' : '#F1F5F9', borderColor: isDark ? '#2C1D54' : '#FFF' }]}>
                <Ionicons name="person" size={50} color={isDark ? '#8E88A8' : '#94A3B8'} />
              </View>
            )}
            <TouchableOpacity
              style={styles.editAvatarBtn}
              onPress={handlePickImage}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="camera" size={16} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.userName, { color: isDark ? '#FFF' : '#0F0330' }]}>{user?.fullname || 'Usuario Igo'}</Text>
          <Text style={[styles.userEmail, { color: isDark ? '#C5BFDB' : '#475569' }]}>{user?.email || ''}</Text>

          {/* Badge de Verificación */}
          <TouchableOpacity
            style={styles.kycBadge}
            onPress={() => setIdentityModalVisible(true)}
          >
            {identityStatus === 'VERIFIED' ? (
              <View style={[styles.badgePill, styles.badgeVerified]}>
                <Ionicons name="checkmark-circle" size={14} color="#15803D" />
                <Text style={styles.badgeTextVerified}>Identidad Verificada</Text>
              </View>
            ) : identityStatus === 'PENDING' ? (
              <View style={[styles.badgePill, styles.badgePending]}>
                <Ionicons name="time" size={14} color="#B45309" />
                <Text style={styles.badgeTextPending}>En Revisión</Text>
              </View>
            ) : (
              <View style={[styles.badgePill, styles.badgeUnverified, isDark && { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                <Ionicons name="alert-circle-outline" size={14} color={isDark ? '#C5BFDB' : '#475569'} />
                <Text style={[styles.badgeTextUnverified, isDark && { color: '#C5BFDB' }]}>Verificar Identidad</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.editProfileBtn, { backgroundColor: isDark ? '#281754' : '#FFFFFF', borderColor: isDark ? '#3D2678' : 'transparent', borderWidth: isDark ? 1 : 0 }]}
            onPress={() => {
              setEditName(user?.fullname || '');
              setEditPhone(user?.phoneNumber || '');
              setModalVisible(true);
            }}
          >
            <Ionicons name="create-outline" size={16} color={isDark ? '#FFC93C' : '#1A1A1A'} style={{ marginRight: 6 }} />
            <Text style={[styles.editProfileText, { color: isDark ? '#FFC93C' : '#0F0330' }]}>Editar Perfil</Text>
          </TouchableOpacity>
        </View>

        {/* LISTA DE OPCIONES */}
        <View style={[styles.optionsContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
          {PROFILE_OPTIONS.map((option) => {
            const isAddressOption = option.title === 'Mis Direcciones';
            const isIdentityOption = option.title === 'Verificación de Identidad';

            return (
              <View key={option.id} style={[styles.optionBlock, { borderBottomColor: isDark ? '#2C1D54' : '#F5F5F5' }]}>
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => handleOptionPress(option.title)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconBox, { backgroundColor: isDark ? '#2C1D54' : '#FFFBEA' }]}>
                    <Ionicons name={option.icon as any} size={22} color={isDark ? '#FFC93C' : '#0F0330'} />
                  </View>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>{option.title}</Text>

                  {isIdentityOption && (
                    <View
                      style={[
                        styles.miniBadge,
                        identityStatus === 'VERIFIED'
                          ? styles.miniBadgeVerified
                          : identityStatus === 'PENDING'
                          ? styles.miniBadgePending
                          : styles.miniBadgeUnverified,
                        isDark && identityStatus === 'UNVERIFIED' && { backgroundColor: '#231254' }
                      ]}
                    >
                      <Text
                        style={[
                          styles.miniBadgeText,
                          identityStatus === 'VERIFIED'
                            ? styles.miniBadgeTextVerified
                            : identityStatus === 'PENDING'
                            ? styles.miniBadgeTextPending
                            : styles.miniBadgeTextUnverified,
                          isDark && identityStatus === 'UNVERIFIED' && { color: '#C5BFDB' }
                        ]}
                      >
                        {identityStatus === 'VERIFIED'
                          ? 'Listo'
                          : identityStatus === 'PENDING'
                          ? 'En espera'
                          : 'Pendiente'}
                      </Text>
                    </View>
                  )}

                  {isAddressOption ? (
                    <Ionicons
                      name={showAddresses ? 'chevron-down' : 'chevron-forward'}
                      size={20}
                      color={colors.textMuted}
                    />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  )}
                </TouchableOpacity>

                {/* LISTA DE DIRECCIONES GUARDADAS DESPLEGABLE */}
                {isAddressOption && showAddresses && (
                  <View style={[styles.addressesListContainer, { backgroundColor: isDark ? '#140833' : '#FAFAFA' }]}>
                    {savedAddresses.length === 0 ? (
                      <Text style={[styles.noAddressesText, { color: colors.textMuted }]}>No tienes direcciones guardadas.</Text>
                    ) : (
                      savedAddresses.map((addr: any) => (
                        <View key={addr.id} style={[styles.addressRow, { borderBottomColor: isDark ? '#261453' : '#EEEEEE' }]}>
                          <Ionicons
                            name="location-sharp"
                            size={18}
                            color="#EDB422"
                            style={{ marginRight: 10 }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.addressLabel, { color: colors.text }]}>{addr.label}</Text>
                            <Text style={[styles.addressText, { color: colors.textMuted }]} numberOfLines={1}>
                              {addr.address}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.deleteAddressBtn}
                            onPress={() => handleDeleteAddress(addr.id, addr.label)}
                          >
                            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* CERRAR SESIÓN */}
        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={22} color="#E74C3C" />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL DE EDICIÓN DE PERFIL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Perfil</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Avatar picker preview */}
            <View style={styles.modalAvatarRow}>
              <View style={[styles.modalAvatarBox, { backgroundColor: isDark ? '#231254' : '#F8FAFC', borderColor: isDark ? '#3D2678' : '#E2E8F0' }]}>
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.modalAvatarImg} />
                ) : (
                  <Ionicons name="person" size={32} color={colors.textMuted} />
                )}
              </View>
              <TouchableOpacity style={[styles.changePhotoBtn, { backgroundColor: isDark ? '#2B1A57' : '#F1F5F9' }]} onPress={handlePickImage}>
                <Ionicons name="camera-outline" size={16} color={isDark ? '#FFC93C' : '#0F0330'} style={{ marginRight: 4 }} />
                <Text style={[styles.changePhotoText, { color: isDark ? '#FFC93C' : '#0F0330' }]}>Cambiar foto</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: isDark ? '#C5BFDB' : '#334155' }]}>Nombre Completo</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="Ej. Oscar Bermúdez"
              placeholderTextColor={colors.textMuted}
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={[styles.inputLabel, { color: isDark ? '#C5BFDB' : '#334155' }]}>Teléfono / WhatsApp</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="Ej. 0412-1234567"
              placeholderTextColor={colors.textMuted}
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
            />

            <Text style={[styles.inputLabel, { color: isDark ? '#C5BFDB' : '#334155' }]}>Correo Electrónico (Registrado)</Text>
            <View style={[styles.textInput, styles.readOnlyInput, { backgroundColor: isDark ? '#140833' : '#F1F5F9', borderColor: colors.inputBorder }]}>
              <Ionicons name="mail-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
              <Text style={[styles.readOnlyText, { color: colors.textMuted }]}>{user?.email || ''}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn, isDark && { backgroundColor: '#231254' }]}
                onPress={() => setModalVisible(false)}
                disabled={updating}
              >
                <Text style={[styles.cancelBtnText, isDark && { color: '#C5BFDB' }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSaveProfile}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#0F0330" />
                ) : (
                  <Text style={styles.saveBtnText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CAMBIO DE CONTRASEÑA */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={passwordModalVisible}
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Cambiar Contraseña</Text>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: isDark ? '#C5BFDB' : '#334155' }]}>Nueva Contraseña</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <Text style={[styles.inputLabel, { color: isDark ? '#C5BFDB' : '#334155' }]}>Confirmar Contraseña</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="Repite la contraseña"
              placeholderTextColor={colors.textMuted}
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              secureTextEntry
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn, isDark && { backgroundColor: '#231254' }]}
                onPress={() => {
                  setNewPassword('');
                  setConfirmNewPassword('');
                  setPasswordModalVisible(false);
                }}
                disabled={updatingPassword}
              >
                <Text style={[styles.cancelBtnText, isDark && { color: '#C5BFDB' }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleChangePassword}
                disabled={updatingPassword}
              >
                {updatingPassword ? (
                  <ActivityIndicator size="small" color="#0F0330" />
                ) : (
                  <Text style={styles.saveBtnText}>Actualizar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE SOPORTE EN TIEMPO REAL */}
      <SupportChatModal
        visible={supportModalVisible}
        onClose={() => setSupportModalVisible(false)}
        currentUser={user}
      />

      {/* MODAL DE VERIFICACIÓN DE IDENTIDAD */}
      <IdentityVerificationModal
        visible={identityModalVisible}
        onClose={() => setIdentityModalVisible(false)}
      />

      {/* MODAL DE CONFIGURACIÓN */}
      <SettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        onOpenSupport={() => setSupportModalVisible(true)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFC93C' },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FFC93C',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  scrollContent: { paddingBottom: 40, backgroundColor: '#F2F4F7', flexGrow: 1 },
  headerSection: {
    backgroundColor: '#FFC93C',
    alignItems: 'center',
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatarContainer: { position: 'relative', marginTop: 10 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: '#FFF' },
  avatarPlaceholder: {
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0F0330',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userName: { fontSize: 22, fontWeight: '800', color: '#0F0330', marginTop: 12 },
  userEmail: { fontSize: 14, color: '#475569', marginTop: 3 },
  kycBadge: {
    marginTop: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeVerified: {
    backgroundColor: '#DCFCE7',
  },
  badgeTextVerified: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
    marginLeft: 4,
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  badgeTextPending: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    marginLeft: 4,
  },
  badgeUnverified: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  badgeTextUnverified: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginLeft: 4,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  editProfileText: { fontSize: 13, fontWeight: '700', color: '#0F0330' },
  optionsContainer: {
    backgroundColor: '#FFF',
    margin: 18,
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    elevation: 2,
  },
  optionBlock: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10 },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFBEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1E293B' },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  miniBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  miniBadgeVerified: {
    backgroundColor: '#DCFCE7',
  },
  miniBadgeTextVerified: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  miniBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  miniBadgeTextPending: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  miniBadgeUnverified: {
    backgroundColor: '#F1F5F9',
  },
  miniBadgeTextUnverified: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 18,
    marginTop: 6,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    elevation: 2,
  },
  logoutText: { fontSize: 15, fontWeight: 'bold', color: '#E74C3C', marginLeft: 8 },
  addressesListContainer: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    backgroundColor: '#FAFAFA',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  noAddressesText: {
    color: '#999',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 15,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  addressLabel: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  addressText: { fontSize: 12, color: '#666', marginTop: 2 },
  deleteAddressBtn: { padding: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 22,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F0330' },
  modalAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalAvatarBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 14,
  },
  modalAvatarImg: {
    width: '100%',
    height: '100%',
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFC93C',
  },
  changePhotoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F0330',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 5,
    marginTop: 8,
  },
  textInput: {
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  readOnlyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  readOnlyText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: { backgroundColor: '#F1F5F9', marginRight: 10 },
  cancelBtnText: { color: '#64748B', fontWeight: '700', fontSize: 14 },
  saveBtn: { backgroundColor: '#FFC93C' },
  saveBtnText: { color: '#0F0330', fontWeight: '800', fontSize: 14 },
});

export default ProfileScreen;