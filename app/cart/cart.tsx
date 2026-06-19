import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Linking, Alert, TextInput, ActivityIndicator // ✅ CORRECCIÓN 1: Importación añadida
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCartStore } from '../../src/presentation/store/useCartStore';
import { useLocationStore } from '../../src/presentation/store/useLocationStore';
import { usePermissionsStore } from '../../src/presentation/store/usePermissions'; 
import { PermissionStatus } from '../../src/core/entities/location.entity';

// --- COMPONENTE DE MAPA ---
import { DeliveryMap } from '../../src/presentation/components/maps/DeliveryMap';

const CartScreen = () => {
  const router = useRouter();

  // STORES
  const { items, clearCart, removeItem } = useCartStore();
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  
  // LECTURA REACTIVA SIMÉTRICA: Escuchamos ambos puntos cardinales del Store Global
  const pickupLocation = useLocationStore((state: any) => state.pickupLocation);
  const deliveryLocation = useLocationStore((state: any) => state.deliveryLocation);

  // ESTADOS LOGÍSTICOS LOCALES
  const [personalData, setPersonalData] = useState('');
  const [addressNotes, setAddressNotes] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [deliveryQuote, setDeliveryQuote] = useState<any>(null);

  // Invalidación automática de cotizaciones previas si el usuario altera el origen o el destino
  useEffect(() => {
    setDeliveryQuote(null);
  }, [pickupLocation, deliveryLocation]);

  // MATEMÁTICA VISUAL
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // --- 1. FUNCIÓN FINAL (Despacho Estructurado hacia WhatsApp) ---
  const handleFinalOrder = () => {
    if (!deliveryQuote) return;

    // Coordenadas definitivas del flujo seleccionado o fallbacks del backend
    const latA = pickupLocation?.latitude || deliveryQuote.businessLat;
    const lngA = pickupLocation?.longitude || deliveryQuote.businessLong;
    const latB = deliveryLocation?.latitude || deliveryQuote.userLat;
    const lngB = deliveryLocation?.longitude || deliveryQuote.userLong;

    // Protocolo de enlaces universales de Google Maps para navegación por GPS de un toque
    const mapsUrlTienda = `https://www.google.com/maps/search/?api=1&query=${latA},${lngA}`;
    const mapsUrlCliente = `https://www.google.com/maps/search/?api=1&query=${latB},${lngB}`;

    let message = `*🍔 NUEVO PEDIDO - IGO STORE* 🛒\n`;
    message += `---------------------------------------\n`;
    message += `*🆔 Orden ID:* #${deliveryQuote.orderId.slice(0, 8).toUpperCase()}\n\n`;

    message += `*📦 DETALLE DEL PEDIDO:*\n`;
    items.forEach((item) => {
        const cleanTitle = item.title.split(' (')[0];
        const options = item.title.includes('(') ? item.title.substring(item.title.indexOf('(')) : '';
        
        message += `▪️ ${item.quantity}x ${cleanTitle}\n`;
        if (options) message += `    _${options}_\n`;
        message += `    Precio Unit: $${item.price.toFixed(2)} -> Sub: $${(item.price * item.quantity).toFixed(2)}\n`;
    });

    message += `\n👤 *CLIENTE:* ${personalData.trim()}\n`;
    message += `📝 *PUNTO DE REFERENCIA:* ${addressNotes.trim() || 'Sin notas adicionales'}\n\n`;
    
    message += `*🏢 PUNTO A (RECOGIDA):*\n`;
    message += `🏠 Origen: ${pickupLocation?.address || 'Sede del Negocio'}\n`;
    message += `📍 GPS Origen: ${mapsUrlTienda}\n\n`;

    message += `*📍 PUNTO B (ENTREGA):*\n`;
    message += `🏠 Destino: ${deliveryLocation?.address || 'Dirección del Cliente'}\n`;
    message += `🗺️ GPS Destino: ${mapsUrlCliente}\n`;
    message += `---------------------------------------\n`;
    
    const deliveryFee = deliveryQuote.totalToPay - subtotal;
    
    message += `💰 *SUBTOTAL PEDIDO:* $${subtotal.toFixed(2)}\n`;
    message += `🛵 *TARIFA DELIVERY (${deliveryQuote.distance}):* $${deliveryFee.toFixed(2)}\n`;
    message += `⭐️ *TOTAL NETO A PAGAR:* $${deliveryQuote.totalToPay.toFixed(2)}\n\n`;
    message += `_Hola, acabo de registrar mi pedido. Quedo atento a la confirmación de la ruta del motorizado._`;

    const phoneNumber = "573014215155";
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message.trim())}`;

    Linking.openURL(url).catch(() => Alert.alert("Error", "No pudimos abrir WhatsApp de forma automatizada."));

    // Limpieza integral de la mesa de trabajo global
    clearCart();
    setPersonalData('');
    setAddressNotes('');
    setDeliveryQuote(null);
    useLocationStore.setState({ pickupLocation: null, deliveryLocation: null } as any); 
    router.replace('/'); 
  };

  // --- 2. FUNCIÓN DE COTIZACIÓN VIAL (Consumo del Backend Blindado) ---
  const handleQuote = async () => {
    if (items.length === 0) return;
    
    if (!deliveryLocation) {
      Alert.alert("Falta Destino", "Por favor selecciona el punto de entrega en el mapa (Punto B).");
      return;
    }
    if (personalData.trim().length === 0) {
      Alert.alert("Falta Información", "Por favor ingresa tu nombre de contacto.");
      return;
    }
    
    setIsCalculating(true);

    try {
      // ✅ CORRECCIÓN 2: Cambiado business_id por businessId acorde a tu interface CartItem
      const businessId = items[0].businessId; 
      const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://10.200.38.48:3000';
      const API_URL = BASE.endsWith('/api') ? BASE : `${BASE}/api`;
      
      const orderPayload = {
        businessId: businessId,
        userIdTemp: personalData,
        deliveryLat: deliveryLocation.latitude,
        deliveryLong: deliveryLocation.longitude,
        deliveryAddress: `${deliveryLocation.address} | Ref: ${addressNotes}`.trim(),
        items: items.map(item => {
          const baseProductId = item.id.substring(0, 36);
          const optionsText = item.title.includes('(') 
            ? item.title.substring(item.title.indexOf('(') + 1, item.title.lastIndexOf(')')) 
            : 'Sin adicionales';

          return {
            productId: baseProductId,
            quantity: item.quantity,
            selectedOptionsText: optionsText,
            finalUnitPrice: item.price        
          };
        })
      };

      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error en el servidor de órdenes');

      setDeliveryQuote({
        ...data,
        userLat: deliveryLocation.latitude,
        userLong: deliveryLocation.longitude,
        businessLat: pickupLocation?.latitude || data.business?.latitude || data.businessLocation?.latitude || 10.644, 
        businessLong: pickupLocation?.longitude || data.business?.longitude || data.businessLocation?.longitude || -71.640 
      });

    } catch (error: any) {
      console.error(error);
      Alert.alert("Error de Cotización", error.message || "Fallo en el cálculo vial de OSRM.");
    } finally {
      setIsCalculating(false);
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
            {/* 🏢 ADUANA DE CONTROL DE ORIGEN: PUNTO A (Cierre de etiquetas reparado) */}
            <View style={styles.inputContainer}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={[styles.inputTitle, { color: '#6200EE' }]}>🏢 Punto de Recogida (Origen)</Text>
                <TouchableOpacity style={styles.mapLink} onPress={() => router.push({ pathname: '/map', params: { mode: 'pickup' } })}>
                  <Text style={[styles.mapLinkText, { color: '#6200EE' }]}>Elegir Tienda</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.addressBox, { borderColor: '#E9E3FF' }]}>
                <Ionicons name="business" size={20} color="#6200EE" style={{ marginRight: 8 }} />
                <Text style={styles.addressBoxText} numberOfLines={2}>
                  {pickupLocation ? pickupLocation.address : 'Sede base (Asignada automáticamente por el producto)'}
                </Text>
              </View>
            </View>

            {/* 📍 ADUANA DE CONTROL DE DESTINO: PUNTO B */}
            <View style={styles.inputContainer}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={[styles.inputTitle, { color: '#EDB422' }]}>📍 Dirección de Entrega (Destino)</Text>
                <TouchableOpacity style={styles.mapLink} onPress={() => router.push({ pathname: '/map', params: { mode: 'delivery' } })}>
                  <Text style={styles.mapLinkText}>Cambiar Destino</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.addressBox}>
                <Ionicons name="location-sharp" size={20} color="#EDB422" style={{ marginRight: 8 }} />
                <Text style={styles.addressBoxText} numberOfLines={2}>
                  {deliveryLocation ? deliveryLocation.address : 'Selecciona tu casa o punto de parada en el mapa...'}
                </Text>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputTitle}>Tus Datos de Contacto</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 50 }]}
                placeholder="Nombre completo del cliente"
                placeholderTextColor="#999"
                value={personalData}
                onChangeText={setPersonalData}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputTitle}>Punto de Referencia</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: Portón negro, al lado del abasto..."
                placeholderTextColor="#999"
                multiline={true}
                numberOfLines={2}
                value={addressNotes}
                onChangeText={setAddressNotes}
              />
            </View>

            {/* MAPA OPERATIVO: Renderiza la polilínea OSRM exacta */}
            {deliveryQuote && (
                <View style={{ marginBottom: 15 }}>
                    <Text style={styles.inputTitle}>Ruta Optimizada por OSRM</Text>
                    <DeliveryMap 
                      origin={{ latitude: deliveryQuote.userLat, longitude: deliveryQuote.userLong }}
                      destination={{ latitude: deliveryQuote.businessLat, longitude: deliveryQuote.businessLong }}
                      distanceKm={deliveryQuote.distance} 
                      routePolyline={deliveryQuote.routePolyline} 
                    />
                </View>
            )}

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Resumen Financiero</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal de Productos</Text>
                <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Costo de Envío Vial</Text>
                {deliveryQuote ? (
                    <Text style={styles.summaryValue}>
                        ${(deliveryQuote.totalToPay - subtotal).toFixed(2)}
                    </Text>
                ) : (
                    <Text style={[styles.summaryValue, { color: '#FF9500', fontWeight: 'bold' }]}>Requiere Cotización</Text>
                )}
              </View>

              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Neto</Text>
                <Text style={styles.totalValue}>
                    ${deliveryQuote ? deliveryQuote.totalToPay.toFixed(2) : `${subtotal.toFixed(2)}`}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.checkoutBtn, (items.length === 0 || isCalculating) && { backgroundColor: '#E0E0E0' }]} 
          onPress={deliveryQuote ? handleFinalOrder : handleQuote}
          disabled={items.length === 0 || isCalculating}
        >
          {isCalculating ? (
             <ActivityIndicator color="#1A1A1A" />
          ) : (
             <Text style={styles.checkoutBtnText}>
               {items.length === 0 
                  ? "Añade productos para continuar" 
                  : (deliveryQuote ? "Enviar Orden Estructurada a WhatsApp" : "Calcular Ruta y Cotizar Envío")}
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
  itemDetails: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  itemTitle: { fontSize: 15, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 2 },
  itemOptions: { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 4 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: '#27AE60' },
  actionContainer: { flexDirection: 'row', alignItems: 'center' },
  quantityControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 5, paddingVertical: 5 },
  controlBtn: { backgroundColor: '#FFF', borderRadius: 15, padding: 5, shadowColor: '#000', shadowOpacity: 0.1, elevation: 1 },
  quantityText: { marginHorizontal: 12, fontSize: 15, fontWeight: 'bold' },
  deleteBtn: { marginLeft: 12, padding: 6, backgroundColor: '#FFE5E5', borderRadius: 8 },
  inputContainer: { backgroundColor: '#FFF', padding: 18, borderRadius: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  inputTitle: { fontSize: 15, fontWeight: 'bold', color: '#1A1A1A' },
  mapLink: { paddingVertical: 2 },
  mapLinkText: { fontSize: 14, color: '#EDB422', fontWeight: 'bold' },
  addressBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  addressBoxText: { flex: 1, fontSize: 14, color: '#334155', fontWeight: '500' },
  textInput: { backgroundColor: '#F9F9F9', borderRadius: 10, padding: 12, fontSize: 15, color: '#333', minHeight: 50, textAlignVertical: 'top', borderWidth: 1, borderColor: '#EEE', marginTop: 8 },
  summaryContainer: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#1A1A1A' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 15, marginTop: 5 },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
  totalValue: { fontSize: 17, fontWeight: 'bold', color: '#27AE60' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#EEE' },
  checkoutBtn: { backgroundColor: '#FFDB58', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  checkoutBtnText: { fontSize: 15, fontWeight: 'bold', color: '#1A1A1A' },
});

export default CartScreen;