import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/presentation/store/useAuthStore';
// ✅ Importamos el store global de ubicaciones
import { useLocationStore } from '@/presentation/store/useLocationStore';

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
  const { user, logout } = useAuthStore();
  
  // ✅ Extraemos las direcciones del store de Zustand y la acción de eliminar
  const { savedAddresses, removeSavedAddress } = useLocationStore();

  // ✅ Estados para controlar el colapso de los menús
  const [showAddresses, setShowAddresses] = useState(false);
  const [showPayments, setShowPayments] = useState(false);

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
            <Image source={require('../../assets/images/oscar.jpeg')} style={styles.avatar} />
            <TouchableOpacity style={styles.editAvatarBtn}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.fullname || 'Usuario Igo'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          
          <TouchableOpacity style={styles.editProfileBtn}>
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
  paymentText: { fontSize: 12, color: '#666', marginTop: 2 }
});

export default ProfileScreen;