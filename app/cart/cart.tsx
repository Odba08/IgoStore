import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Alert, TextInput 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCartStore } from '@/presentation/store/useCartStore';
import { useLocationStore } from '@/presentation/store/useLocationStore';
import { igoApi } from '@/infrastructure/api/igo.api';

const CartScreen = () => {
  const router = useRouter();

  const [bcvRate, setBcvRate] = useState<number>(75.54);

  useEffect(() => {
    const fetchBcvRate = async () => {
      try {
        const response = await igoApi.get('/settings/BCV_RATE');
        if (response.data && response.data.value) {
          setBcvRate(parseFloat(response.data.value) || 75.54);
        }
      } catch (err) {
        console.warn("Error fetching BCV rate:", err);
      }
    };
    fetchBcvRate();
  }, []);

  const { items, removeItem, updateQuantity } = useCartStore();
  const deliveryLocation = useLocationStore((state: any) => state.deliveryLocation);
  const setDeliveryLocation = useLocationStore((state: any) => state.setDeliveryLocation);

  // ✅ Leemos dinámicamente las direcciones desde el store de Zustand
  const savedAddresses = useLocationStore((state: any) => state.savedAddresses) || [];

  const [currentUser] = useState({ name: 'Oscar', phone: '+584141234567' });
  const [addressNotes, setAddressNotes] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const cartItems = items || [];
  const subtotal = cartItems.reduce((sum, item) => sum + (parseFloat(String(item.price)) || 0) * (item.quantity || 1), 0);

  const handleSelectSavedAddress = (addressItem: any) => {
    setSelectedAddressId(addressItem.id);
    setDeliveryLocation({
      latitude: addressItem.latitude,
      longitude: addressItem.longitude,
      address: addressItem.address
    });
  };

  const handleNavigateToRouteCalculation = () => {
    if (cartItems.length === 0) return;
    
    if (
      !deliveryLocation || 
      typeof deliveryLocation.latitude !== 'number' || 
      typeof deliveryLocation.longitude !== 'number' ||
      isNaN(deliveryLocation.latitude)
    ) {
      Alert.alert("Falta Ubicación", "Por favor selecciona una dirección guardada o fija un punto en el mapa para la entrega.");
      return;
    }

    router.push({
      pathname: '/map',
      params: {
        serviceType: 'store', 
        mode: 'route', 
        personalData: currentUser.name,
        addressNotes: addressNotes
      }
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Carrito</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {cartItems.map((item) => (
          <View key={item.id} style={styles.cartItem}>
            <Image 
              source={{ uri: (item.image && item.image.trim() !== '') ? item.image : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80' }} 
              style={styles.itemImage} 
            />
            <View style={styles.itemDetails}>
              <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
              {item.selectedOptionsText && item.selectedOptionsText.trim() !== '' ? (
                <Text style={styles.itemOptions} numberOfLines={2}>
                  {item.selectedOptionsText}
                </Text>
              ) : null}
              <Text style={styles.itemPrice}>${(parseFloat(String(item.price)) || 0).toFixed(2)}</Text>
            </View>
            
            <View style={styles.actionContainer}>
              <View style={styles.quantityControls}>
                <TouchableOpacity style={styles.controlBtn} onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                  <Ionicons name="remove" size={18} color="#000" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{item.quantity}</Text>
                <TouchableOpacity style={styles.controlBtn} onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                  <Ionicons name="add" size={18} color="#000" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => removeItem(item.id)}>
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {cartItems.length > 0 && (
          <>
            <View style={styles.logisticsCard}>
              <Text style={styles.cardSectionTitle}>¿A dónde lo enviamos?</Text>
              
              {/* ✅ Renderiza las direcciones guardadas directamente del Store de Zustand */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.addressBookScroll}>
                {savedAddresses.map((addr: any) => (
                  <TouchableOpacity 
                    key={addr.id} 
                    style={[styles.savedAddressChip, selectedAddressId === addr.id && styles.savedAddressChipActive]}
                    onPress={() => handleSelectSavedAddress(addr)}
                  >
                    <Text style={[styles.savedAddressLabel, selectedAddressId === addr.id && styles.savedAddressLabelActive]}>
                      {addr.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.logisticsRow}>
                <View style={styles.logisticsHeader}>
                  <Text style={[styles.inputTitle, { color: '#EDB422', flex: 1, marginRight: 10 }]} numberOfLines={1}>
                    📍 Dirección de Entrega
                  </Text>
                  <TouchableOpacity style={styles.mapLink} onPress={() => { setSelectedAddressId(null); router.push({ pathname: '/map', params: { serviceType: 'store' } }); }}>
                    <Text style={styles.mapLinkText}>Buscar en Mapa</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.addressBox, { borderColor: '#FDF7E8', backgroundColor: '#FDF7E8' }]}>
                  <Ionicons name="location-sharp" size={20} color="#EDB422" style={{ marginRight: 8 }} />
                  <Text style={styles.addressBoxText} numberOfLines={2}>
                    {deliveryLocation ? deliveryLocation.address : 'Selecciona un destino arriba o busca en el mapa...'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.contactCard}>
              <Text style={styles.cardSectionTitle}>Datos de Despacho</Text>
              
              <View style={styles.readonlyProfileRow}>
                <Ionicons name="person-circle" size={36} color="#6200EE" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1A1A1A' }}>{currentUser.name}</Text>
                  <Text style={{ fontSize: 13, color: '#666' }}>{currentUser.phone}</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={{ fontSize: 11, color: '#10B981', marginLeft: 4, fontWeight: 'bold' }}>Verificado</Text>
                </View>
              </View>
              
              <TextInput
                style={[styles.textInput, { minHeight: 60, marginTop: 15 }]}
                placeholder="Punto de referencia o notas para el motorizado (Ej: Portón negro, tocar timbre 3)..."
                placeholderTextColor="#999"
                multiline={true}
                numberOfLines={2}
                value={addressNotes}
                onChangeText={setAddressNotes}
              />
            </View>

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Resumen Parcial</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal de Productos</Text>
                <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
              </View>
              <View style={[styles.summaryRow, { marginTop: 8 }]}>
                <Text style={[styles.summaryLabel, { color: '#27AE60', fontWeight: 'bold' }]}>Equivalente en Bs</Text>
                <Text style={[styles.summaryValue, { color: '#27AE60', fontWeight: 'bold' }]}>Bs. {(subtotal * bcvRate).toFixed(2)}</Text>
              </View>
              <Text style={{ fontSize: 11, color: '#666', marginTop: 8, fontStyle: 'italic' }}>
                Tasa Oficial BCV: {bcvRate.toFixed(2)} Bs/$
              </Text>
              <Text style={styles.infoFooterTexto}>*La tarifa de envío se calculará automáticamente con las coordenadas viales en la siguiente pantalla.</Text>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.checkoutBtn, cartItems.length === 0 && { backgroundColor: '#FFDB58' }]} 
          onPress={() => {
            if (cartItems.length === 0) {
              router.replace('/');
            } else {
              handleNavigateToRouteCalculation();
            }
          }}
        >
          <Text style={styles.checkoutBtnText}>
            {cartItems.length === 0 ? "Añade productos para continuar" : "Calcular Envío y Proceder"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  customHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  scrollContent: { padding: 15, paddingBottom: 130, backgroundColor: '#F8FAFC', flexGrow: 1 },
  cartItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.04, elevation: 2 },
  itemImage: { width: 65, height: 65, borderRadius: 12, backgroundColor: '#F1F5F9' },
  itemDetails: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  itemTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
  itemOptions: { fontSize: 12, color: '#64748B', fontStyle: 'italic', marginBottom: 6 },
  itemPrice: { fontSize: 15, fontWeight: '800', color: '#10B981' },
  actionContainer: { flexDirection: 'row', alignItems: 'center' },
  quantityControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 6, paddingVertical: 6 },
  controlBtn: { backgroundColor: '#FFF', borderRadius: 14, padding: 6, shadowColor: '#000', shadowOpacity: 0.06, elevation: 1 },
  quantityText: { marginHorizontal: 12, fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  deleteBtn: { marginLeft: 12, padding: 8, backgroundColor: '#FEE2E2', borderRadius: 10 },
  logisticsCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.04, elevation: 2 },
  contactCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.04, elevation: 2 },
  cardSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 16 },
  addressBookScroll: { marginBottom: 15, flexDirection: 'row' },
  savedAddressChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F1F5F9', borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
  savedAddressChipActive: { backgroundColor: '#FFF8E1', borderColor: '#EDB422' },
  savedAddressLabel: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  savedAddressLabelActive: { color: '#EDB422', fontWeight: '800' },
  readonlyProfileRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  verifiedBadge: { position: 'absolute', right: 15, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  logisticsRow: { marginBottom: 5 },
  logisticsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  inputTitle: { fontSize: 14, fontWeight: 'bold' },
  mapLink: { paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#F8FAFC', borderRadius: 8 },
  mapLinkText: { fontSize: 13, color: '#EDB422', fontWeight: '700' },
  addressBox: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1 },
  addressBoxText: { flex: 1, fontSize: 14, color: '#334155', fontWeight: '500', lineHeight: 20 },
  textInput: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, fontSize: 15, color: '#1E293B', textAlignVertical: 'top', borderWidth: 1, borderColor: '#E2E8F0' },
  summaryContainer: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.04, elevation: 2, marginBottom: 10 },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#1E293B' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 15, color: '#64748B', fontWeight: '500' },
  summaryValue: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  infoFooterTexto: { fontSize: 12, color: '#94A3B8', marginTop: 12, fontStyle: 'italic', lineHeight: 18 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  checkoutBtn: { backgroundColor: '#FFDB58', paddingVertical: 16, borderRadius: 14, alignItems: 'center', shadowColor: '#FFDB58', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  checkoutBtnText: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' }
});

export default CartScreen;