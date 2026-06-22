import React, { useState, useEffect, useRef } from 'react';
import { 
  ActivityIndicator, View, StyleSheet, Text, TextInput, 
  TouchableOpacity, FlatList, Dimensions, Platform, Keyboard, Alert, Linking 
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router'; 
import { useLocationStore } from '@/presentation/store/useLocationStore';
import { useCartStore } from '@/presentation/store/useCartStore';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

// ⚡ MOTOR DE DECODIFICACIÓN GEOMÉTRICA (Algoritmo de compresión OSRM/Google precision 5)
const decodePolyline = (encoded: string) => {
  let points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
};

const MapScreen = () => {
  const router = useRouter();
  const { mode, personalData, addressNotes } = useLocalSearchParams(); 
  
  const mapRef = useRef<MapView>(null);
  const debounceTimeout = useRef<any>(null);
  
  // STORES GLOBALES
  const { items, clearCart } = useCartStore();
  const { lastKnowLocation, getLocation, pickupLocation, deliveryLocation, setPickupLocation, setDeliveryLocation } = useLocationStore();

  // ESTADOS DEL MODO RUTA (PANTALLA COMPLETA)
  const [activeMode, setActiveMode] = useState<any>(mode || 'delivery');
  const [activeEditing, setActiveEditing] = useState<'pickup' | 'delivery' | null>(null);
  const [routeQuote, setRouteQuote] = useState<any>(null);
  const [polylineCoords, setPolylineCoords] = useState<any[]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // ESTADOS DEL BUSCADOR INDIVIDUAL
  const [address, setAddress] = useState('Mueve el mapa para seleccionar...');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [targetCoords, setTargetCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Inicialización inteligente del mapa
  useEffect(() => {
    if (lastKnowLocation === null) {
      getLocation();
    } else {
      setTargetCoords({ latitude: lastKnowLocation.latitude, longitude: lastKnowLocation.longitude });
    }

    if (mode === 'route') {
      executeRouteCalculation(pickupLocation, deliveryLocation);
    }
  }, [lastKnowLocation, mode]);

  // Enmarcar la ruta automáticamente cuando se cargue la Polyline
  useEffect(() => {
    if (polylineCoords.length > 0 && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(polylineCoords, {
          edgePadding: { top: 80, right: 50, bottom: 320, left: 50 },
          animated: true,
        });
      }, 600);
    }
  }, [polylineCoords]);

  if (lastKnowLocation === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="black" />
      </View>
    );
  }

  // INTERACCIÓN CON API NESTJS DESDE EL MAPA
  const executeRouteCalculation = async (originPoint: any, destinationPoint: any) => {
  if (!destinationPoint) return;
  setIsCalculatingRoute(true);

  try {
    // 🛡️ EXTRACCIÓN DEFENSIVA: Lee tanto la propiedad nueva como la vieja por seguridad
    const firstItem = items[0] as any;
    const businessId = firstItem?.businessId || firstItem?.business_id;

    // Si los datos en caché están corruptos o vacíos, frenamos el hilo antes de golpear al Backend
    if (!businessId || businessId === 'undefined') {
      Alert.alert(
        "Sincronización Requerida", 
        "El carrito contiene datos del esquema anterior. Por favor, vacía el carrito y vuelve a agregar el producto para actualizar el ID."
      );
      setIsCalculatingRoute(false);
      return;
    }

    const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://10.200.38.48:3000';
    const API_URL = BASE.endsWith('/api') ? BASE : `${BASE}/api`;
    
   // En app/map.tsx, dentro de executeRouteCalculation

const orderPayload = {
  businessId: businessId, 
  userIdTemp: personalData || 'Cliente Igo',

  // ⚡ CORRECCIÓN CRÍTICA: Ahora enviamos el Punto A (Recogida) dinámico al backend
  pickupLat: originPoint?.latitude,
  pickupLong: originPoint?.longitude,
  pickupAddress: originPoint?.address || 'Ubicación dinámica de recogida',

  // Punto B (Entrega) que ya tenías
  deliveryLat: destinationPoint.latitude,
  deliveryLong: destinationPoint.longitude,
  deliveryAddress: `${destinationPoint.address} | Ref: ${addressNotes || ''}`.trim(),
  
  items: items.map(item => ({
    productId: item.id.substring(0, 36),
    quantity: item.quantity,
    selectedOptionsText: item.title.includes('(') ? item.title.substring(item.title.indexOf('(') + 1, item.title.lastIndexOf(')')) : 'Sin adicionales',
    finalUnitPrice: item.price        
  }))
};

    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Error en cotización');

    setRouteQuote({
      ...data,
      userLat: destinationPoint.latitude,
      userLong: destinationPoint.longitude,
      businessLat: originPoint?.latitude || data.business?.latitude || data.businessLocation?.latitude || 10.644, 
      businessLong: originPoint?.longitude || data.business?.longitude || data.businessLocation?.longitude || -71.640 
    });

   if (data.routePolyline) {
  if (typeof data.routePolyline === 'string') {
    // Escenario 1: El backend envía el texto comprimido estándar
    setPolylineCoords(decodePolyline(data.routePolyline));
  } else if (Array.isArray(data.routePolyline)) {
    // Escenario 2: El backend ya envía el arreglo de coordenadas listo
    setPolylineCoords(data.routePolyline);
  } else if (data.routePolyline.coordinates) {
    // Escenario 3: El backend envía un objeto GeoJSON crudo
    const mappedCoords = data.routePolyline.coordinates.map((c: any) => ({
      latitude: c[1],
      longitude: c[0]
    }));
    setPolylineCoords(mappedCoords);
  } else {
    console.warn("Formato de ruta desconocido:", data.routePolyline);
  }
}
  } catch (error: any) {
    console.error(error);
    Alert.alert("Error de Logística", "Fallo al trazar la ruta en tiempo real.");
  } finally {
    setIsCalculatingRoute(false);
  }
};

  const fetchGeocodeAddress = async (lat: number, lng: number) => {
    setLoadingAddress(true);
    try {
      const response = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (response && response.length > 0) {
        const place = response[0];
        const street = place.street || 'Calle sin nombre';
        const district = place.district || place.subregion || '';
        const city = place.city || '';
        setAddress(`${street}, ${district} ${city}`.trim().replace(/^,|,$/, ''));
      }
    } catch (error) {
      setAddress(`Ubicación fijada`);
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleSearchTextChange = (text: string) => {
    setSearchQuery(text);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => executeNetworkSearch(text), 600);
  };

  const executeNetworkSearch = async (text: string) => {
    if (text.trim().length < 3) return setSearchResults([]);
    setIsSearching(true);
    try {
      const query = `${text}, Maracaibo`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=-71.80,10.45,-71.50,10.80&bounded=1&addressdetails=1&limit=5`;
      const response = await fetch(url, { headers: { 'User-Agent': 'IgoStoreApp/1.4' } });
      const data = await response.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlace = (place: any) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    Keyboard.dismiss();
    setSearchResults([]);
    setSearchQuery(place.display_name.split(',')[0]);
    setTargetCoords({ latitude: lat, longitude: lon });
    setAddress(place.display_name);
    mapRef.current?.animateToRegion({ latitude: lat, longitude: lon, latitudeDelta: 0.006, longitudeDelta: 0.006 }, 1000);
  };

  const handleRegionChangeComplete = (newRegion: any) => {
    if (activeMode === 'route' && !activeEditing) return; // Congelar si solo se está visualizando la polyline
    const centerPoint = { latitude: newRegion.latitude, longitude: newRegion.longitude };
    setTargetCoords(centerPoint);
    fetchGeocodeAddress(newRegion.latitude, newRegion.longitude);
  };

  // DESPACHO INDIVIDUAL DE CONFIGURACIÓN DE PINS
// ✅ REEMPLAZA TU FUNCIÓN ACTUAL POR ESTA VERSIÓN BLINDADA:
const handleConfirmSelection = () => {
  if (!targetCoords) return;
  const payload = { latitude: targetCoords.latitude, longitude: targetCoords.longitude, address };

  if (activeMode === 'route' && activeEditing) {
    // Si estábamos editando la ruta en caliente, actualizamos el store y recalculamos
    if (activeEditing === 'pickup') {
      setPickupLocation(payload);
      executeRouteCalculation(payload, deliveryLocation);
    } else {
      setDeliveryLocation(payload);
      executeRouteCalculation(pickupLocation, payload);
    }
    setActiveEditing(null);
  } else {
    // Modo de asignación inicial directo desde el Carrito
    if (activeMode === 'pickup') {
      setPickupLocation(payload);
    } else {
      setDeliveryLocation(payload);
    }
    
    // 🛡️ BLINDAJE LOGÍSTICO: Evita el colapso si la pila de navegación está vacía
    if (router.canGoBack()) {
      router.back(); 
    } else {
      router.push('/cart/cart'); // Escape seguro al carrito
    }
  }
};

  // ENVÍO FINAL A WHATSAPP DESDE EL MAPA DE PANTALLA COMPLETA
  const dispatchWhatsAppOrder = () => {
    if (!routeQuote) return;
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const mapsUrlTienda = `https://www.google.com/maps/search/?api=1&query=${routeQuote.businessLat},${routeQuote.businessLong}`;
    const mapsUrlCliente = `https://www.google.com/maps/search/?api=1&query=${routeQuote.userLat},${routeQuote.userLong}`;

    let message = `*🍔 NUEVO PEDIDO - IGO STORE* 🛒\n`;
    message += `---------------------------------------\n`;
    message += `*🆔 Orden ID:* #${routeQuote.orderId.slice(0, 8).toUpperCase()}\n\n`;
    message += `*📦 DETALLE DEL PEDIDO:*\n`;
    items.forEach((item) => {
      message += `▪️ ${item.quantity}x ${item.title.split(' (')[0]}\n`;
    });
    message += `\n👤 *CLIENTE:* ${String(personalData || 'No indicado').trim()}\n`;
    message += `📝 *REF:* ${String(addressNotes || 'Sin notas').trim()}\n\n`;
    message += `*🏢 RECOGIDA (PUNTO A):*\n📍 GPS: ${mapsUrlTienda}\n\n`;
    message += `*📍 ENTREGA (PUNTO B):*\n🏠 Dirección: ${deliveryLocation?.address}\n🗺️ GPS: ${mapsUrlCliente}\n`;
    message += `---------------------------------------\n`;
    message += `💰 *SUBTOTAL:* $${subtotal.toFixed(2)}\n`;
    message += `🛵 *DELIVERY (${routeQuote.distance}):* $${(routeQuote.totalToPay - subtotal).toFixed(2)}\n`;
    message += `⭐️ *TOTAL NETO A PAGAR:* $${routeQuote.totalToPay.toFixed(2)}\n\n`;
    message += `_Hola, acabo de cotizar mi ruta. Quedo atento a la asignación del motorizado._`;

    Linking.openURL(`https://wa.me/573014215155?text=${encodeURIComponent(message.trim())}`);
    clearCart();
    setPickupLocation(null);
    setDeliveryLocation(null);
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: lastKnowLocation.latitude,
          longitude: lastKnowLocation.longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        }}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {/* RENDERIZADO COMPLETO EN MODO RUTA VIAL */}
        {activeMode === 'route' && (
          <>
            {/* PIN RECOGIDA (MORADO) */}
            {pickupLocation && !activeEditing && (
              <Marker coordinate={pickupLocation} title="Origen (Recogida)" pinColor="#6200EE" />
            )}
            {/* PIN ENTREGA (ROJO) */}
            {deliveryLocation && !activeEditing && (
              <Marker coordinate={deliveryLocation} title="Destino (Entrega)" pinColor="#FF3B30" />
            )}
            {/* TRAZADO DE RUTA DINÁMICO */}
            {polylineCoords.length > 0 && !activeEditing && (
              <Polyline coordinates={polylineCoords} strokeColor="#6200EE" strokeWidth={5} />
            )}
          </>
        )}
      </MapView>

      {/* COMPONENTE DE BÚSQUEDA CONDICIONAL */}
      {(activeMode !== 'route' || activeEditing) && (
        <View style={styles.searchContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="search" size={20} color="#666" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={activeEditing === 'pickup' || activeMode === 'pickup' ? "Cambiar dirección de recogida..." : "Cambiar dirección de entrega..."}
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearchTextChange}
            />
            {isSearching && <ActivityIndicator size="small" color="#EDB422" />}
          </View>

          {searchResults.length > 0 && (
            <View style={styles.resultsList}>
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.place_id.toString()}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectPlace(item)}>
                    <Ionicons name="location-outline" size={18} color="#EDB422" style={{ marginRight: 10 }} />
                    <Text style={styles.resultText} numberOfLines={2}>{item.display_name}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>
      )}

      {/* BOTÓN DE RETORNO AL CARRITO */}
      <TouchableOpacity 
  style={styles.backFloatingBtn} 
  onPress={() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/'); // Redirección de escape segura al carrito si la pila está vacía
    }
  }}
>
  <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
</TouchableOpacity>

      {/* MIRA CENTRAL (Solo visible en modos de selección o edición activa) */}
      {(activeMode !== 'route' || activeEditing) && (
        <View style={styles.markerFixed} pointerEvents="none">
          <View style={styles.pinWrapper}>
            <Ionicons name="location" size={44} color={activeMode === 'pickup' || activeEditing === 'pickup' ? "#6200EE" : "#FF3B30"} style={styles.pinIcon} />
            <View style={styles.baseDot} />
          </View>
        </View>
      )}

      {/* PANEL INFERIOR FLOTANTE - COUPLING DE SVE OSRM */}
      {activeMode === 'route' && !activeEditing && (
        <View style={styles.routeSheet}>
          <Text style={styles.routeSheetTitle}>Ruta Analizada a Pantalla Completa</Text>
          
          {isCalculatingRoute ? (
            <ActivityIndicator size="large" color="#6200EE" style={{ marginVertical: 20 }} />
          ) : (
            <>
              <View style={styles.routeInfoRow}>
                <View>
                  <Text style={styles.distanceLabel}>Distancia Vial</Text>
                  <Text style={styles.distanceValue}>{routeQuote?.distance || 'Calculando...'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.priceLabel}>Precio Total Neto</Text>
                  <Text style={styles.priceValue}>${routeQuote?.totalToPay?.toFixed(2) || '0.00'}</Text>
                </View>
              </View>

              {/* CONTROLES DE EDICIÓN EN CALIENTE */}
              <View style={styles.editButtonsContainer}>
                <TouchableOpacity style={styles.editBtnMini} onPress={() => { setActiveEditing('pickup'); setSearchQuery(''); }}>
                  <Ionicons name="business" size={16} color="#6200EE" style={{ marginRight: 5 }} />
                  <Text style={styles.editBtnText}>Cambiar Recogida</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.editBtnMini} onPress={() => { setActiveEditing('delivery'); setSearchQuery(''); }}>
                  <Ionicons name="location" size={16} color="#FF3B30" style={{ marginRight: 5 }} />
                  <Text style={styles.editBtnText}>Cambiar Entrega</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.whatsappBtn} onPress={dispatchWhatsAppOrder}>
                <Ionicons name="logo-whatsapp" size={20} color="white" style={{ marginRight: 10 }} />
                <Text style={styles.whatsappBtnText}>Enviar Pedido Estructurado</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* CONfirmador de panel inferior para modos individuales de edición */}
      {(activeMode !== 'route' || activeEditing) && (
        <View style={styles.bottomSheet}>
          <Text style={styles.addressLabel} numberOfLines={2}>{address}</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={handleConfirmSelection} disabled={loadingAddress}>
            <Text style={styles.actionBtnText}>Confirmar este Punto</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default MapScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  map: { width: width, height: height },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { position: 'absolute', top: Platform.OS === 'ios' ? 115 : 95, left: 15, right: 15, zIndex: 10 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 15, height: 50, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.15, elevation: 6 },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
  resultsList: { backgroundColor: 'white', borderRadius: 12, marginTop: 5, maxHeight: 180, elevation: 6, overflow: 'hidden' },
  resultItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  resultText: { flex: 1, fontSize: 13, color: '#334155' },
  backFloatingBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 55 : 35, left: 15, backgroundColor: 'white', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, elevation: 6, zIndex: 20 },
  markerFixed: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  pinWrapper: { alignItems: 'center', justifyContent: 'center', marginBottom: 44 },
  pinIcon: { shadowColor: '#000', shadowRadius: 4, shadowOpacity: 0.25 },
  baseDot: { width: 6, height: 4, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 3, marginTop: -2 },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 35, elevation: 15 },
  routeSheet: { position: 'absolute', bottom: 15, left: 15, right: 15, backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 10 },
  routeSheetTitle: { fontSize: 12, color: '#888', fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  routeInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 12 },
  distanceLabel: { fontSize: 13, color: '#666' },
  distanceValue: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  priceLabel: { fontSize: 13, color: '#666' },
  priceValue: { fontSize: 22, fontWeight: 'bold', color: '#27AE60' },
  editButtonsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  editBtnMini: { flex: 0.48, flexDirection: 'row', backgroundColor: '#F1F5F9', height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  editBtnText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  whatsappBtn: { backgroundColor: '#25D366', height: 52, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  whatsappBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  addressLabel: { fontSize: 14, color: '#1A1A1A', fontWeight: '500', marginBottom: 15 },
  actionBtn: { backgroundColor: '#FFDB58', height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' }
});