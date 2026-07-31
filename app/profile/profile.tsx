import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/presentation/store/useAuthStore';
import { useLocationStore } from '@/presentation/store/useLocationStore';
import * as ImagePicker from 'expo-image-picker';
import { igoApi } from '@/infrastructure/api/igo.api';

const PROFILE_OPTIONS = [
  { id: '1', title: 'Mis Pedidos', icon: 'receipt-outline' },
  { id: '2', title: 'Métodos de Pago', icon: 'card-outline' },
  { id: '3', title: 'Mis Direcciones', icon: 'location-outline' },
  { id: '4', title: 'Configuración', icon: 'settings-outline' },
  { id: '5', title: 'Ayuda y Soporte', icon: 'help-circle-outline' },
];

const ProfileScreen = () => {
  const router = useRouter();
  const { expand } = useLocalSearchParams();
  const { user, logout, updateUserLocal } = useAuthStore();
  
  // ✅ Extraemos las direcciones del store de Zustand y la acción de eliminar
  const { savedAddresses, removeSavedAddress } = useLocationStore();

  // ✅ Estados para controlar el colapso de los menús
  const [showAddresses, setShowAddresses] = useState(false);
  const [showPayments, setShowPayments] = useState(false);

  // Estados de edición del perfil
  const [modalVisible, setModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.fullname || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (expand === 'addresses') {
      setShowAddresses(true);
      setShowPayments(false);
    } else if (expand === 'payments') {
      setShowPayments(true);
      setShowAddresses(false);
    }
  }, [expand]);

  const handleLogout = () => {
    logout();
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permiso Denegado", "Se requiere permiso para acceder a la galería.");
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (pickerResult.canceled) return;

      const uri = pickerResult.assets[0].uri;
      setUpdating(true);

      const formData = new FormData();
      formData.append('file', {
        uri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      } as any);

      const uploadRes = await igoApi.post('/files/user', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const secureUrl = uploadRes.data.secureUrl;

      // Actualizar el perfil del usuario en backend
      await igoApi.patch(`/users/${user?.id}`, { avatarUrl: secureUrl });

      // Actualizar Zustand localmente
      await updateUserLocal({ avatarUrl: secureUrl });
      Alert.alert("Éxito", "Foto de perfil actualizada correctamente.");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Ocurrió un error al actualizar la imagen.");
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || !editEmail.trim()) {
      Alert.alert("Campos vacíos", "El nombre y el correo son obligatorios.");
      return;
    }

    try {
      setUpdating(true);
      await igoApi.patch(`/users/${user?.id}`, {
        fullName: editName,
        email: editEmail,
      });

      await updateUserLocal({
        fullname: editName,
        email: editEmail,
      });

      setModalVisible(false);
      Alert.alert("Éxito", "Perfil actualizado correctamente.");
    } catch (err: any) {
      const errMsg = err.response?.data?.message || "No se pudo actualizar el perfil.";
      Alert.alert("Error", Array.isArray(errMsg) ? errMsg[0] : errMsg);
    } finally {
      setUpdating(false);
    }
  };

  const handleOptionPress = (optionTitle: string) => {
    if (optionTitle === 'Mis Pedidos') {
      router.push('/orders' as any);
    } else if (optionTitle === 'Mis Direcciones') {
      setShowAddresses(!showAddresses);
    } else if (optionTitle === 'Métodos de Pago') {
      setShowPayments(!showPayments);
    } else {
      Alert.alert(optionTitle, "Próximamente disponible.");
    }
  };

  const handleDeleteAddress = (id: string, label: string) => {
    Alert.alert(
      "Eliminar dirección",
      `¿Seguro que deseas eliminar "${label}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => removeSavedAddress(id) }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      
      {/* HEADER PERSONALIZADO (Integrado con el fondo amarillo) */}
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ENCABEZADO DEL PERFIL */}
        <View style={styles.headerSection}>
          <View style={styles.avatarContainer}>
            <Image 
              source={user?.avatarUrl ? { uri: user.avatarUrl } : require('../../assets/images/oscar.jpeg')} 
              style={styles.avatar} 
            />
            <TouchableOpacity style={styles.editAvatarBtn} onPress={handlePickImage} disabled={updating}>
              {updating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="camera" size={16} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.fullname || 'Usuario Igo'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          
          <TouchableOpacity style={styles.editProfileBtn} onPress={() => {
            setEditName(user?.fullname || '');
            setEditEmail(user?.email || '');
            setModalVisible(true);
          }}>
            <Text style={styles.editProfileText}>Editar Perfil</Text>
          </TouchableOpacity>
        </View>

        {/* LISTA DE OPCIONES */}
        <View style={styles.optionsContainer}>
          {PROFILE_OPTIONS.map((option) => {
            const isAddressOption = option.title === 'Mis Direcciones';
            const isPaymentOption = option.title === 'Métodos de Pago';
            
            return (
              <View key={option.id} style={styles.optionBlock}>
                <TouchableOpacity 
                  style={styles.optionRow} 
                  onPress={() => handleOptionPress(option.title)}
                >
                  <View style={styles.optionIconBox}>
                    <Ionicons name={option.icon as any} size={22} color="#1A1A1A" />
                  </View>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  
                  {isAddressOption ? (
                    <Ionicons 
                      name={showAddresses ? "chevron-down" : "chevron-forward"} 
                      size={20} 
                      color="#666" 
                    />
                  ) : isPaymentOption ? (
                    <Ionicons 
                      name={showPayments ? "chevron-down" : "chevron-forward"} 
                      size={20} 
                      color="#666" 
                    />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color="#CCC" />
                  )}
                </TouchableOpacity>

                {/* ✅ MÉTODOS DE PAGO DESPLEGABLE */}
                {isPaymentOption && showPayments && (
                  <View style={styles.paymentsListContainer}>
                    <View style={styles.paymentMethodRow}>
                      <Ionicons name="phone-portrait-outline" size={18} color="#EDB422" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.paymentLabel}>Pago Móvil Mercantil</Text>
                        <Text style={styles.paymentText}>CI: 27284670 | Tel: 04127687819</Text>
                      </View>
                    </View>
                    
                    <View style={styles.paymentMethodRow}>
                      <Ionicons name="wallet-outline" size={18} color="#EDB422" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.paymentLabel}>Binance Pay</Text>
                        <Text style={styles.paymentText}>Email: ingo@gmail.com</Text>
                      </View>
                    </View>

                    <View style={styles.paymentMethodRow}>
                      <Ionicons name="send-outline" size={18} color="#EDB422" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.paymentLabel}>Zelle</Text>
                        <Text style={styles.paymentText}>Email: ingo@gmail.com</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* ✅ LISTA DE DIRECCIONES GUARDADAS DESPLEGABLE */}
                {isAddressOption && showAddresses && (
                  <View style={styles.addressesListContainer}>
                    {savedAddresses.length === 0 ? (
                      <Text style={styles.noAddressesText}>No tienes direcciones guardadas.</Text>
                    ) : (
                      savedAddresses.map((addr: any) => (
                        <View key={addr.id} style={styles.addressRow}>
                          <Ionicons name="location-sharp" size={18} color="#EDB422" style={{ marginRight: 10 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.addressLabel}>{addr.label}</Text>
                            <Text style={styles.addressText} numberOfLines={1}>{addr.address}</Text>
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
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
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
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Editar Perfil</Text>

            <TextInput
              style={styles.textInput}
              placeholder="Nombre Completo"
              value={editName}
              onChangeText={setEditName}
            />

            <TextInput
              style={styles.textInput}
              placeholder="Correo Electrónico"
              value={editEmail}
              onChangeText={setEditEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setModalVisible(false)}
                disabled={updating}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalBtn, styles.saveBtn]} 
                onPress={handleSaveProfile}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFDB58' }, 
  customHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#FFDB58' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  scrollContent: { paddingBottom: 40, backgroundColor: '#F2F4F7', flexGrow: 1 },
  headerSection: { backgroundColor: '#FFDB58', alignItems: 'center', paddingBottom: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  avatarContainer: { position: 'relative', marginTop: 10 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#FFF' },
  editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1A1A1A', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: '#FFF' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A', marginTop: 15 },
  userEmail: { fontSize: 14, color: '#555', marginTop: 5 },
  editProfileBtn: { marginTop: 15, backgroundColor: 'rgba(0,0,0,0.05)', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
  editProfileText: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  optionsContainer: { backgroundColor: '#FFF', margin: 20, borderRadius: 15, padding: 10, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  optionBlock: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 10 },
  optionIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F9F9F9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  optionTitle: { flex: 1, fontSize: 16, fontWeight: '500', color: '#333' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginTop: 10, paddingVertical: 15, backgroundColor: '#FFF', borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  logoutText: { fontSize: 16, fontWeight: 'bold', color: '#E74C3C', marginLeft: 10 },
  
  // ✅ Estilos del desplegable de direcciones
  addressesListContainer: { paddingHorizontal: 15, paddingBottom: 15, backgroundColor: '#FAFAFA', borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  noAddressesText: { color: '#999', fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 15 },
  addressRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  addressLabel: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  addressText: { fontSize: 12, color: '#666', marginTop: 2 },
  deleteAddressBtn: { padding: 8 },

  // ✅ Estilos del desplegable de métodos de pago
  paymentsListContainer: { paddingHorizontal: 15, paddingBottom: 15, backgroundColor: '#FAFAFA', borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  paymentMethodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  paymentLabel: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  paymentText: { fontSize: 12, color: '#666', marginTop: 2 },

  // ✅ Estilos del Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '85%', backgroundColor: '#FFF', borderRadius: 20, padding: 25, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 20, textAlign: 'center' },
  textInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 12, fontSize: 16, color: '#333', marginBottom: 15, backgroundColor: '#FAFAFA' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#F0F0F0', marginRight: 10 },
  cancelBtnText: { color: '#666', fontWeight: 'bold', fontSize: 15 },
  saveBtn: { backgroundColor: '#EDB422' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 }
});

export default ProfileScreen;