import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Alert, TextInput 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCartStore } from '../../src/presentation/store/useCartStore';
import { useLocationStore } from '../../src/presentation/store/useLocationStore';

const CartScreen = () => {
  const router = useRouter();

  const { items, removeItem } = useCartStore();
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  
  const pickupLocation = useLocationStore((state: any) => state.pickupLocation);
  const deliveryLocation = useLocationStore((state: any) => state.deliveryLocation);

  const [personalData, setPersonalData] = useState('');
  const [addressNotes, setAddressNotes] = useState('');

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleNavigateToRouteCalculation = () => {
    if (items.length === 0) return;
    
    if (!deliveryLocation) {
      Alert.alert("Falta Ubicación", "Por favor selecciona el punto de entrega en el mapa (Punto B) antes de proceder.");
      return;
    }
    if (personalData.trim().length === 0) {
      Alert.alert("Campos Vacíos", "Por favor ingresa tu nombre y teléfono para procesar el despacho.");
      return;
    }

    router.push({
      pathname: '/map',
      params: {
        mode: 'route',
        personalData: personalData,
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
        {items.map((item) => (
          <View key={item.id} style={styles.cartItem}>
            <Image 
              source={{ uri: (item.image && item.image.trim() !== '') ? item.image : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80' }} 
              style={styles.itemImage} 
            />
            <View style={styles.itemDetails}>
              <Text style={styles.itemTitle} numberOfLines={2}>{item.title.split(' (')[0]}</Text>
              {item.title.includes('(') && (
                <Text style={styles.itemOptions} numberOfLines={2}>
                  {item.title.substring(item.title.indexOf('('))}
                </Text>
              )}
              <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
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

        {items.length > 0 && (
          <>
            {/* ⚡ BLOQUE LOGÍSTICO UNIFICADO (Puntos A y B en la misma tarjeta) */}
            <View style={styles.logisticsCard}>
              <Text style={styles.cardSectionTitle}>Detalles de la Ruta</Text>
              
              <View style={styles.logisticsRow}>
                <View style={styles.logisticsHeader}>
                  <Text style={[styles.inputTitle, { color: '#6200EE', flex: 1, marginRight: 10 }]} numberOfLines={1}>
                    🏢 Origen (Recogida)
                  </Text>
                  <TouchableOpacity style={styles.mapLink} onPress={() => router.push({ pathname: '/map', params: { mode: 'pickup' } })}>
                    <Text style={[styles.mapLinkText, { color: '#6200EE' }]}>Editar Mapa</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.addressBox, { borderColor: '#E9E3FF', backgroundColor: '#F4F0FF' }]}>
                  <Ionicons name="business" size={20} color="#6200EE" style={{ marginRight: 8 }} />
                  <Text style={styles.addressBoxText} numberOfLines={2}>
                    {pickupLocation ? pickupLocation.address : 'Selecciona dónde recogemos el pedido...'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.logisticsRow}>
                <View style={styles.logisticsHeader}>
                  <Text style={[styles.inputTitle, { color: '#EDB422', flex: 1, marginRight: 10 }]} numberOfLines={1}>
                    📍 Destino (Entrega)
                  </Text>
                  <TouchableOpacity style={styles.mapLink} onPress={() => router.push({ pathname: '/map', params: { mode: 'delivery' } })}>
                    <Text style={styles.mapLinkText}>Fijar Destino</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.addressBox, { borderColor: '#FDF7E8', backgroundColor: '#FDF7E8' }]}>
                  <Ionicons name="location-sharp" size={20} color="#EDB422" style={{ marginRight: 8 }} />
                  <Text style={styles.addressBoxText} numberOfLines={2}>
                    {deliveryLocation ? deliveryLocation.address : 'Selecciona a dónde lo enviamos...'}
                  </Text>
                </View>
              </View>
            </View>

            {/* ⚡ BLOQUE DE CONTACTO UNIFICADO */}
            <View style={styles.contactCard}>
              <Text style={styles.cardSectionTitle}>Información del Cliente</Text>
              
              <TextInput
                style={[styles.textInput, { minHeight: 50, marginBottom: 12 }]}
                placeholder="Nombre y teléfono de contacto"
                placeholderTextColor="#999"
                value={personalData}
                onChangeText={setPersonalData}
              />
              
              <TextInput
                style={[styles.textInput, { minHeight: 60 }]}
                placeholder="Punto de referencia o notas para el motorizado (Ej: Portón negro...)"
                placeholderTextColor="#999"
                multiline={true}
                numberOfLines={2}
                value={addressNotes}
                onChangeText={setAddressNotes}
              />
            </View>

            {/* RESUMEN DE ARTÍCULOS */}
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Resumen Parcial</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal de Productos</Text>
                <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
              </View>
              <Text style={styles.infoFooterTexto}>*La tarifa de envío se calculará mediante coordenadas viales en la siguiente pantalla.</Text>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.checkoutBtn, items.length === 0 && { backgroundColor: '#E0E0E0' }]} 
          onPress={handleNavigateToRouteCalculation}
          disabled={items.length === 0}
        >
          <Text style={styles.checkoutBtnText}>
            {items.length === 0 ? "Añade productos para continuar" : "Calcular Ruta Vial e Ir al Mapa"}
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
  
  // ⚡ NUEVOS ESTILOS AGRUPADOS Y ESTILIZADOS
  logisticsCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.04, elevation: 2 },
  contactCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.04, elevation: 2 },
  cardSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 16 },
  
  logisticsRow: { marginBottom: 5 },
  logisticsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 15 },
  
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
  checkoutBtnText: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
});

export default CartScreen;