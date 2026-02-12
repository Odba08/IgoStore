import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Linking, Alert, TextInput, ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- STORES DE TU ARQUITECTURA ---
import { useCartStore } from '../../src/presentation/store/useCartStore';
import { useLocationStore } from '../../src/presentation/store/useLocationStore';
import { usePermissionsStore } from '../../src/presentation/store/usePermissions'; // Verifica ruta correcta
import { PermissionStatus } from '../../src/core/entities/location.entity';

// --- NUEVO COMPONENTE DE MAPA ---
import { DeliveryMap } from '../../src/presentation/components/maps/DeliveryMap';

const CartScreen = () => {
  const router = useRouter();

  // STORES
  const { items, clearCart, removeItem } = useCartStore();
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  
  // ESTADOS LOCALES
  const [personalData, setPersonalData] = useState('');
  const [addressNotes, setAddressNotes] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [deliveryQuote, setDeliveryQuote] = useState<any>(null); // Guardamos la cotización aquí

  // MATEMÁTICA VISUAL
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // --- 1. FUNCIÓN FINAL (Confirmar y WhatsApp) ---
  const handleFinalOrder = () => {
    if (!deliveryQuote) return;

    let message = `*NUEVO PEDIDO* 🛒\n`;
    message += `🆔 Orden ID: ${deliveryQuote.orderId.slice(0, 8)}...\n\n`;

    items.forEach((item) => {
        message += `▪️ ${item.quantity}x ${item.title} - $${(item.price * item.quantity).toFixed(2)}\n`;
    });

    message += `\n👤 *Cliente:* ${personalData.trim()}`;
    message += `\n📍 *Ubicación GPS:* Detectada`;
    message += `\n📝 *Ref/Notas:* ${addressNotes.trim() || 'Sin notas'}\n`;
    
    // Cálculos Finales
    const deliveryFee = deliveryQuote.totalToPay - subtotal;
    
    message += `\n💰 *Subtotal:* $${subtotal.toFixed(2)}`;
    message += `\n🛵 *Envío (${deliveryQuote.distance}):* $${deliveryFee.toFixed(2)}`;
    message += `\n⭐️ *TOTAL A PAGAR:* $${deliveryQuote.totalToPay.toFixed(2)}\n\n`;
    message += `Hola, confirmo el envío y mi pedido.`;

    const phoneNumber = "573014215155";
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    Linking.openURL(url).catch(() => Alert.alert("Error", "No pudimos abrir WhatsApp."));

    // Limpieza
    clearCart();
    setPersonalData('');
    setAddressNotes('');
    setDeliveryQuote(null);
    router.replace('/'); 
  };

  // --- 2. FUNCIÓN DE COTIZACIÓN (Calcula y Muestra Mapa) ---
  const handleQuote = async () => {
    // Validaciones
    if (items.length === 0) return;
    if (personalData.trim().length === 0) {
      Alert.alert("Falta Información", "Ingresa tu nombre primero.");
      return;
    }
    
    setIsCalculating(true);

    try {
      // A. Permisos
      const { checkLocationPermission, requestLocationPermission, locationStatus } = usePermissionsStore.getState();
      let status = locationStatus;

      if (status === PermissionStatus.UNDETERMINED || status === PermissionStatus.DENIED) {
          status = await requestLocationPermission();
      }

      if (status !== PermissionStatus.GRANTED) {
        Alert.alert('Permiso requerido', 'Necesitamos tu ubicación para calcular el delivery.');
        setIsCalculating(false);
        return;
      }

      // B. GPS
      const { getLocation } = useLocationStore.getState();
      const location = await getLocation(); 
      
      if (!location) {
          Alert.alert("Error GPS", "No pudimos obtener tu ubicación.");
          setIsCalculating(false);
          return;
      }

      // C. Backend
      const businessId = items[0].business_id; 
      
      // Lógica de URL Robusta
      const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://10.200.38.48:3000';
      const API_URL = BASE.endsWith('/api') ? BASE : `${BASE}/api`;
      
      const orderPayload = {
        businessId: businessId,
        userIdTemp: personalData,
        items: items.map(item => ({
          productId: item.id.length > 36 ? item.id.substring(0, 36) : item.id,
          quantity: item.quantity
        })),
        deliveryLat: location.latitude,
        deliveryLong: location.longitude,
        deliveryAddress: addressNotes || "Ubicación GPS"
      };

      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Error en servidor');

      // D. ÉXITO: Guardamos datos para mostrar el MAPA
      setDeliveryQuote({
        ...data,
        userLat: location.latitude,
        userLong: location.longitude,
        // Si el backend no devuelve coordenadas del negocio, usamos fallback (Centro de Maracaibo aprox)
        businessLat: data.businessLocation?.latitude || 10.6700, 
        businessLong: data.businessLocation?.longitude || -71.6300 
      });

      setIsCalculating(false);

    } catch (error) {
      console.error(error);
      setIsCalculating(false);
      Alert.alert("Error", "No pudimos calcular el envío. Revisa tu conexión.");
    }
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

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" 
      >
        {items.map((item) => (
          <View key={item.id} style={styles.cartItem}>
            <Image source={{ uri: item.image }} style={styles.itemImage} />
            <View style={styles.itemDetails}>
              <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
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
            <View style={styles.inputContainer}>
              <Text style={styles.inputTitle}>Tu Información</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 50 }]}
                placeholder="Nombre completo y Teléfono"
                placeholderTextColor="#999"
                value={personalData}
                onChangeText={setPersonalData}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputTitle}>Punto de Referencia</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Notas para el motorizado..."
                placeholderTextColor="#999"
                multiline={true}
                numberOfLines={2}
                value={addressNotes}
                onChangeText={setAddressNotes}
              />
            </View>

            {/* --- ZONA DEL MAPA TÁCTICO --- */}
            {/* Solo se muestra si ya tenemos una cotización exitosa */}
            {deliveryQuote && (
                <View style={{ marginBottom: 15 }}>
                    <Text style={styles.inputTitle}>Ruta de Entrega</Text>
                    <DeliveryMap 
                        origin={{ latitude: deliveryQuote.userLat, longitude: deliveryQuote.userLong }}
                        destination={{ latitude: deliveryQuote.businessLat, longitude: deliveryQuote.businessLong }}
                        distanceKm={deliveryQuote.distance}
                        routePolyline={deliveryQuote.routePolyline} // <--- NO OLVIDES PASAR ESTO
                    />
                </View>
            )}

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Resumen</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Envío</Text>
                {deliveryQuote ? (
                    <Text style={styles.summaryValue}>
                        ${(deliveryQuote.totalToPay - subtotal).toFixed(2)}
                    </Text>
                ) : (
                    <Text style={[styles.summaryValue, { color: '#FF9500' }]}>Calcular al final</Text>
                )}
              </View>

              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                    ${deliveryQuote ? deliveryQuote.totalToPay.toFixed(2) : `${subtotal.toFixed(2)} + Envío`}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* FOOTER DINÁMICO */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.checkoutBtn, (items.length === 0 || isCalculating) && { backgroundColor: '#E0E0E0' }]} 
          // Si ya hay cotización, confirmamos. Si no, cotizamos.
          onPress={deliveryQuote ? handleFinalOrder : handleQuote}
          disabled={items.length === 0 || isCalculating}
        >
          {isCalculating ? (
             <ActivityIndicator color="#000" />
          ) : (
             <Text style={styles.checkoutBtnText}>
               {items.length === 0 
                  ? "Carrito Vacío" 
                  : (deliveryQuote ? "Confirmar Pedido por WhatsApp" : "Cotizar Envío")}
             </Text>
          )}
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
  scrollContent: { padding: 20, paddingBottom: 130, backgroundColor: '#F2F4F7', flexGrow: 1 },
  cartItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  itemImage: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#EEE' },
  itemDetails: { flex: 1, marginLeft: 15 },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  itemPrice: { fontSize: 15, fontWeight: '600', color: '#27AE60' },
  actionContainer: { flexDirection: 'row', alignItems: 'center' },
  quantityControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 5, paddingVertical: 5 },
  controlBtn: { backgroundColor: '#FFF', borderRadius: 15, padding: 5, shadowColor: '#000', shadowOpacity: 0.1, elevation: 1 },
  quantityText: { marginHorizontal: 12, fontSize: 16, fontWeight: 'bold' },
  deleteBtn: { marginLeft: 12, padding: 6, backgroundColor: '#FFE5E5', borderRadius: 8 },
  
  inputContainer: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  inputTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 5 },
  textInput: { backgroundColor: '#F9F9F9', borderRadius: 10, padding: 15, fontSize: 15, color: '#333', minHeight: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: '#EEE' },

  summaryContainer: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#1A1A1A' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 15, color: '#666' },
  summaryValue: { fontSize: 15, fontWeight: '500', color: '#333' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 15, marginTop: 5 },
  totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#27AE60' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', padding: 20, borderTopWidth: 1, borderTopColor: '#EEE' },
  checkoutBtn: { backgroundColor: '#FFDB58', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  checkoutBtnText: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
});

export default CartScreen;