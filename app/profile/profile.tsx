import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Modal, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/presentation/store/useAuthStore';
import { useLocationStore } from '@/presentation/store/useLocationStore';
// ✅ Importamos el store de pedidos y la interfaz
import { useOrdersStore, HistoricalOrder} from '@/presentation/store/useOrderStore';

const PROFILE_OPTIONS = [
  { id: '1', title: 'Mis Pedidos', icon: 'receipt-outline' },
  { id: '2', title: 'Métodos de Pago', icon: 'card-outline' },
  { id: '3', title: 'Mis Direcciones', icon: 'location-outline' },
  { id: '4', title: 'Configuración', icon: 'settings-outline' },
  { id: '5', title: 'Ayuda y Soporte', icon: 'help-circle-outline' },
];

const ProfileScreen = () => {
  const router = useRouter();
  const { logout } = useAuthStore();
  
  const { savedAddresses, removeSavedAddress } = useLocationStore();
  
  // ✅ Extraemos los pedidos desde el store de Zustand
  const { orders } = useOrdersStore();

  const [showAddresses, setShowAddresses] = useState(false);
  
  // ✅ Estados locales para pantallas de Pedidos e Historial
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<HistoricalOrder | null>(null);

  const handleLogout = () => {
    logout();
  };

  const handleOptionPress = (optionTitle: string) => {
    if (optionTitle === 'Mis Direcciones') {
      setShowAddresses(!showAddresses);
    } else if (optionTitle === 'Mis Pedidos') {
      // ✅ Abre el modal completo de mis pedidos
      setShowOrdersModal(true);
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
      
      {/* HEADER PRINCIPAL */}
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
          <Text style={styles.userName}>Oscar Bueno</Text>
          <Text style={styles.userEmail}>obueno8@gmail.com</Text>
          
          <TouchableOpacity style={styles.editProfileBtn}>
            <Text style={styles.editProfileText}>Editar Perfil</Text>
          </TouchableOpacity>
        </View>

        {/* LISTA DE OPCIONES */}
        <View style={styles.optionsContainer}>
          {PROFILE_OPTIONS.map((option) => {
            const isAddressOption = option.title === 'Mis Direcciones';
            
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
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color="#CCC" />
                  )}
                </TouchableOpacity>

                {/* DESPLEGABLE: DIRECCIONES GUARDADAS */}
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

      {/* 🧾 MODAL: PANTALLA DE HISTORIAL DE PEDIDOS */}
      <Modal visible={showOrdersModal} animationType="slide" transparent={false} onRequestClose={() => setShowOrdersModal(false)}>
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowOrdersModal(false)} style={styles.modalBackBtn}>
              <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Mis Pedidos</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.ordersListContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={64} color="#BDC3C7" />
                <Text style={styles.emptyText}>Aún no tienes pedidos registrados.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.orderCard} onPress={() => setSelectedOrder(item)}>
                <View style={styles.orderCardHeader}>
                  <Text style={styles.orderCardNumber}>{item.orderNumber}</Text>
                  <Text style={styles.orderCardDate}>{item.date}</Text>
                </View>
                <View style={styles.orderCardDivider} />
                <View style={styles.orderCardBody}>
                  <Text style={styles.orderCardBiz}>{item.businessName}</Text>
                  <Text style={styles.orderCardAddress} numberOfLines={1}>📍 {item.deliveryAddress}</Text>
                  <Text style={styles.orderCardTotal}>Total pagado: ${item.totalAmount.toFixed(2)}</Text>
                </View>
                <View style={styles.orderCardFooter}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{item.status}</Text>
                  </View>
                  <Text style={styles.viewDetailsLink}>Ver detalles</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* 🔍 MODAL: DETALLE COMPLETO DEL PEDIDO SELECCIONADO */}
      <Modal visible={selectedOrder !== null} animationType="fade" transparent={true} onRequestClose={() => setSelectedOrder(null)}>
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModalContainer}>
            <View style={styles.detailModalHeader}>
              <Text style={styles.detailModalTitle}>Detalle del Pedido</Text>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Ionicons name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>
            
            {selectedOrder && (
              <ScrollView contentContainerStyle={styles.detailModalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailOrderNum}>{selectedOrder.orderNumber}</Text>
                  <Text style={styles.detailOrderDate}>{selectedOrder.date}</Text>
                  <View style={[styles.statusBadge, { marginTop: 8, alignSelf: 'flex-start' }]}>
                    <Text style={styles.statusBadgeText}>{selectedOrder.status}</Text>
                  </View>
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>🏢 Establecimiento</Text>
                  <Text style={styles.detailSectionText}>{selectedOrder.businessName}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>📍 Dirección de entrega</Text>
                  <Text style={styles.detailSectionText}>{selectedOrder.deliveryAddress}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>📦 Artículos comprados</Text>
                  {selectedOrder.items.map((item, index) => (
                    <View key={index} style={styles.detailProductRow}>
                      <Text style={styles.detailProductQty}>{item.quantity}x</Text>
                      <Text style={styles.detailProductTitle} numberOfLines={1}>{item.title.split(' (')[0]}</Text>
                      <Text style={styles.detailProductPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.detailSummary}>
                  <View style={styles.detailSummaryRow}>
                    <Text style={styles.detailSummaryLabel}>Subtotal</Text>
                    <Text style={styles.detailSummaryValue}>${selectedOrder.subtotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.detailSummaryRow}>
                    <Text style={styles.detailSummaryLabel}>Envío (Delivery)</Text>
                    <Text style={styles.detailSummaryValue}>${selectedOrder.deliveryFee.toFixed(2)}</Text>
                  </View>
                  <View style={styles.detailCardDivider} />
                  <View style={styles.detailSummaryRow}>
                    <Text style={styles.detailTotalLabel}>Monto total</Text>
                    <Text style={styles.detailTotalValue}>${selectedOrder.totalAmount.toFixed(2)}</Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView> // 👈 CORRECCIÓN AQUÍ (de </View> a </SafeAreaView>)
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
  
  // Desplegable de direcciones
  addressesListContainer: { paddingHorizontal: 15, paddingBottom: 15, backgroundColor: '#FAFAFA', borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  noAddressesText: { color: '#999', fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 15 },
  addressRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  addressLabel: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  addressText: { fontSize: 12, color: '#666', marginTop: 2 },
  deleteAddressBtn: { padding: 8 },

  // Pantalla Modal de Historial de Pedidos
  modalSafeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalBackBtn: { width: 40, height: 40, justifyContent: 'center' },
  modalHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  ordersListContainer: { padding: 15, paddingBottom: 30 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 120 },
  emptyText: { marginTop: 15, fontSize: 14, color: '#64748B', fontWeight: '500' },
  orderCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.02, elevation: 1 },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderCardNumber: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  orderCardDate: { fontSize: 12, color: '#64748B' },
  orderCardDivider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 10 },
  orderCardBody: { gap: 6 },
  orderCardBiz: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  orderCardAddress: { fontSize: 13, color: '#64748B' },
  orderCardTotal: { fontSize: 14, fontWeight: '800', color: '#10B981', marginTop: 4 },
  orderCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  statusBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { fontSize: 11, color: '#10B981', fontWeight: 'bold' },
  viewDetailsLink: { fontSize: 13, color: '#6200EE', fontWeight: 'bold' },

  // Modal del Detalle del Pedido
  detailModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailModalContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%', padding: 20 },
  detailModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 15, marginBottom: 15 },
  detailModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  detailModalScroll: { paddingBottom: 30 },
  detailSection: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 15 },
  detailOrderNum: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  detailOrderDate: { fontSize: 13, color: '#64748B', marginTop: 4 },
  detailSectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 },
  detailSectionText: { fontSize: 15, color: '#334155', fontWeight: '500' },
  detailProductRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  detailProductQty: { fontSize: 14, fontWeight: 'bold', color: '#6200EE', width: 25 },
  detailProductTitle: { flex: 1, fontSize: 14, color: '#334155', fontWeight: '500' },
  detailProductPrice: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  detailSummary: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16 },
  detailSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  detailSummaryLabel: { fontSize: 14, color: '#64748B' },
  detailSummaryValue: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  detailCardDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 },
  detailTotalLabel: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  detailTotalValue: { fontSize: 18, fontWeight: '800', color: '#10B981' }
});

export default ProfileScreen;