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

// ⚡ MOTOR DE DECODIFICACIÓN GEOMÉTRICA
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

  // ⚡ CÁLCULO DEL SUBTOTAL PURO
  const cartSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // DETECCIÓN DE MODO
  const isExplorerView = mode !== 'route' || items.length === 0;

  // ESTADOS DEL MODO RUTA Y EXPLORADOR
  const [activeMode, setActiveMode] = useState<any>(mode || 'delivery');
  const [activeEditing, setActiveEditing] = useState<'pickup' | 'delivery' | null>(null);
  const [routeQuote, setRouteQuote] = useState<any>(null);
  const [polylineCoords, setPolylineCoords] = useState<any[]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [businesses, setBusinesses] = useState<any[]>([]); 

  // ⚡ CONTROL DEL SUB-MODO EXPLORADOR MANUAL (Fijar cualquier Punto A o B)
  const [activeExplorerField, setActiveExplorerField] = useState<'pickup' | 'delivery'>('delivery');

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
      const initialCoords = { latitude: lastKnowLocation.latitude, longitude: lastKnowLocation.longitude };
      setTargetCoords(initialCoords);
      
      if (isExplorerView) {
        if (!deliveryLocation) setDeliveryLocation({ ...initialCoords, address: 'Mi ubicación actual' });
      }
    }

    if (mode === 'route') {
      executeRouteCalculation(pickupLocation, deliveryLocation);
    }
  }, [lastKnowLocation, mode]);

  // Descarga defensiva de comercios asociados
  useEffect(() => {
    if (isExplorerView) {
      const fetchBusinesses = async () => {
        try {
          const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://10.200.38.48:3000';
          const API_URL = BASE.endsWith('/api') ? BASE : `${BASE}/api`;
          
          const response = await fetch(`${API_URL}/bussines`); 
          const data = await response.json();
          
          const list = Array.isArray(data) ? data : (data.data || data.items || []);
          setBusinesses(list);
        } catch (error) {
          console.warn("Radar de red en espera de comercios activos.");
        }
      };
      fetchBusinesses();
    }
  }, [isExplorerView]);

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

  // INTERACCIÓN CON API NESTJS
  const executeRouteCalculation = async (originPoint: any, destinationPoint: any, alternativeBusinessId?: string) => {
    const firstItem = items[0] as any;
    
    // Si estamos en modo explorador y no se tocó un marcador amarillo, usamos un UUID genérico autorizado para cálculo libre
    const businessId = isExplorerView 
      ? (alternativeBusinessId || '00000000-0000-0000-0000-000000000000') 
      : (firstItem?.businessId || firstItem?.business_id);

    if (!originPoint && isExplorerView) {
      Alert.alert("Origen Requerido", "Por favor selecciona un origen alternando a la pestaña Punto A.");
      return;
    }

    setIsCalculatingRoute(true);

    try {
      const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://10.200.38.48:3000';
      const API_URL = BASE.endsWith('/api') ? BASE : `${BASE}/api`;
      const ENDPOINT = isExplorerView ? `${API_URL}/orders/quote` : `${API_URL}/orders`;
      
      const currentOrigin = originPoint || pickupLocation;
      const currentDestination = destinationPoint || deliveryLocation || targetCoords;

      const orderPayload = isExplorerView ? {
        businessId: businessId,
        pickupLat: currentOrigin.latitude, 
        pickupLong: currentOrigin.longitude,
        deliveryLat: currentDestination.latitude, 
        deliveryLong: currentDestination.longitude,
      } : {
        businessId: businessId, 
        userIdTemp: personalData || 'Cliente Igo',
        pickupLat: currentOrigin.latitude,
        pickupLong: currentOrigin.longitude,
        deliveryLat: currentDestination.latitude,
        deliveryLong: currentDestination.longitude,
        deliveryAddress: `${currentDestination.address} | Ref: ${addressNotes || ''}`.trim(),
        items: items.map(item => ({
          productId: item.id.substring(0, 36),
          quantity: item.quantity,
          selectedOptionsText: item.title.includes('(') ? item.title.substring(item.title.indexOf('(') + 1, item.title.lastIndexOf(')')) : 'Sin adicionales',
          finalUnitPrice: item.price        
        }))
      };

      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error en cotización');

      setRouteQuote({
        orderId: data.orderId || null,
        distance: data.distance,
        totalToPay: isExplorerView ? null : data.totalToPay,
        deliveryFee: data.deliveryFee,
        userLat: currentDestination.latitude,
        userLong: currentDestination.longitude,
        businessLat: currentOrigin.latitude, 
        businessLong: currentOrigin.longitude,
        businessId: businessId !== '00000000-0000-0000-0000-000000000000' ? businessId : null
      });

      if (data.routePolyline) {
        if (typeof data.routePolyline === 'string') {
          setPolylineCoords(decodePolyline(data.routePolyline));
        } else if (Array.isArray(data.routePolyline)) {
          setPolylineCoords(data.routePolyline);
        }
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error de Consulta", "No pudimos trazar la ruta seleccionada.");
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
        const label = `${street}, ${district} ${city}`.trim().replace(/^,|,$/, '');
        setAddress(label);
        
        // Asignación reactiva según la pestaña del explorador activa
        if (isExplorerView && activeMode !== 'route') {
          if (activeExplorerField === 'pickup') {
            setPickupLocation({ latitude: lat, longitude: lng, address: label });
          } else {
            setDeliveryLocation({ latitude: lat, longitude: lng, address: label });
          }
        }
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
    
    const coordsPayload = { latitude: lat, longitude: lon };
    setTargetCoords(coordsPayload);
    setAddress(place.display_name);

    if (isExplorerView) {
      if (activeExplorerField === 'pickup') setPickupLocation({ ...coordsPayload, address: place.display_name });
      else setDeliveryLocation({ ...coordsPayload, address: place.display_name });
    }

    mapRef.current?.animateToRegion({ ...coordsPayload, latitudeDelta: 0.006, longitudeDelta: 0.006 }, 1000);
  };

  const handleRegionChangeComplete = (newRegion: any) => {
    if (activeMode === 'route' && !activeEditing) return; 
    const centerPoint = { latitude: newRegion.latitude, longitude: newRegion.longitude };
    setTargetCoords(centerPoint);
    fetchGeocodeAddress(newRegion.latitude, newRegion.longitude);
  };

  const handleConfirmSelection = () => {
    if (!targetCoords) return;
    const payload = { latitude: targetCoords.latitude, longitude: targetCoords.longitude, address };

    if (activeMode === 'pickup') setPickupLocation(payload);
    else setDeliveryLocation(payload);
    
    if (router.canGoBack()) router.back();
    else router.push('/cart/cart'); 
  };

  // ⚡ FUNCIÓN DE DESPACHO A WHATSAPP COMPLETA
  const dispatchWhatsAppOrder = () => {
    if (!routeQuote) return;
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const mapsUrlTienda = `https://www.google.com/maps/search/?api=1&query=${routeQuote.businessLat},${routeQuote.businessLong}`;
    const mapsUrlCliente = `https://www.google.com/maps/search/?api=1&query=${routeQuote.userLat},${routeQuote.userLong}`;

    let message = `*🍔 NUEVO PEDIDO - IGO STORE* 🛒\n`;
    message += `---------------------------------------\n`;
    message += `*🆔 Orden ID:* #${routeQuote.orderId || 'N/A'}\n\n`;
    message += `*📦 DETALLE DEL PEDIDO:*\n`;
    items.forEach((item) => {
      message += `▪️ ${item.quantity}x ${item.title.split(' (')[0]}\n`;
    });
    message += `\n👤 *CLIENTE:* ${String(personalData || 'No indicado').trim()}\n`;
    message += `📝 *REF:* ${String(addressNotes || 'Sin notas').trim()}\n\n`;
    message += `*🏢 RECOGIDA (PUNTO A):*\n📍 GPS: ${mapsUrlTienda}\n\n`;
    message += `*📍 ENTREGA (PUNTO B):*\n🏠 Dirección: ${deliveryLocation?.address || 'Ubicación en Mapa'}\n🗺️ GPS: ${mapsUrlCliente}\n`;
    message += `---------------------------------------\n`;
    message += `💰 *SUBTOTAL:* $${subtotal.toFixed(2)}\n`;
    
    // Deducción matemática de envío si es necesario
    const deliveryCalculated = routeQuote.totalToPay ? Math.max(0, routeQuote.totalToPay - subtotal).toFixed(2) : (routeQuote.deliveryFee?.toFixed(2) || '0.00');
    
    message += `🛵 *DELIVERY (${routeQuote.distance}):* $${deliveryCalculated}\n`;
    message += `⭐️ *TOTAL NETO A PAGAR:* $${routeQuote.totalToPay?.toFixed(2) || '0.00'}\n\n`;

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
        {/* RADAR DE NEGOCIOS (Si existen en BD) */}
        {isExplorerView ? businesses.map((bus) => {
          const lat = parseFloat(bus.latitude);
          const lng = parseFloat(bus.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;
          return (
            <Marker
              key={bus.id}
              coordinate={{ latitude: lat, longitude: lng }}
              title={bus.name}
              pinColor="#EDB422" 
              onPress={() => {
                const origin = { latitude: lat, longitude: lng, address: bus.name };
                setPickupLocation(origin);
                executeRouteCalculation(origin, deliveryLocation, bus.id);
                setActiveMode('route');
              }}
            />
          );
        }) : null}

        {/* RECOGNICIÓN DE PINS FIJOS EN SELECCIÓN O RUTA */}
        {pickupLocation && (activeMode === 'route' || activeExplorerField !== 'pickup') ? (
          <Marker coordinate={pickupLocation} title="Origen (Punto A)" pinColor="#6200EE" />
        ) : null}
        
        {deliveryLocation && (activeMode === 'route' || activeExplorerField !== 'delivery') ? (
          <Marker coordinate={deliveryLocation} title="Destino (Punto B)" pinColor="#FF3B30" />
        ) : null}

        {activeMode === 'route' && polylineCoords.length > 0 ? (
          <Polyline coordinates={polylineCoords} strokeColor="#6200EE" strokeWidth={5} />
        ) : null}
      </MapView>

      {/* BUSCADOR INTELIGENTE */}
      {(activeMode !== 'route' || activeEditing) ? (
        <View style={styles.searchContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="search" size={20} color="#666" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={activeExplorerField === 'pickup' ? "Buscar sector o local de recogida (A)..." : "Buscar avenida o casa de entrega (B)..."}
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearchTextChange}
            />
            {isSearching ? <ActivityIndicator size="small" color="#EDB422" /> : null}
          </View>

          {searchResults.length > 0 ? (
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
          ) : null}
        </View>
      ) : null}

      <TouchableOpacity style={styles.backFloatingBtn} onPress={() => { if (router.canGoBack()) router.back(); else router.push('/'); }}>
        <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
      </TouchableOpacity>

      {/* MIRA CENTRAL DINÁMICA (Adapta su color al punto bajo edición) */}
      {(activeMode !== 'route' || activeEditing) ? (
        <View style={styles.markerFixed} pointerEvents="none">
          <View style={styles.pinWrapper}>
            <Ionicons name="location" size={44} color={activeExplorerField === 'pickup' || activeEditing === 'pickup' ? "#6200EE" : "#FF3B30"} style={styles.pinIcon} />
            <View style={styles.baseDot} />
          </View>
        </View>
      ) : null}

      {/* ⚡ RENDERIZADO DEL RESUMEN VIAL CORREGIDO Y BLINDADO */}
      {activeMode === 'route' && !activeEditing ? (
        <View style={styles.routeSheet}>
          <Text style={styles.routeSheetTitle}>
            {!isExplorerView ? "Resumen de tu Pedido" : "Cotización Instantánea de Envío"}
          </Text>
          
          {isCalculatingRoute ? (
            <ActivityIndicator size="large" color="#6200EE" style={{ marginVertical: 20 }} />
          ) : (
            <>
              <View style={styles.routeInfoRow}>
                <View>
                  <Text style={styles.distanceLabel}>Distancia Vial</Text>
                  <Text style={styles.distanceValue}>{routeQuote?.distance || 'Calculando...'}</Text>
                </View>

                {!isExplorerView ? (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.distanceLabel}>Delivery</Text>
                    <Text style={[styles.distanceValue, { color: '#FF3B30' }]}>
                      ${routeQuote?.totalToPay 
                        ? Math.max(0, routeQuote.totalToPay - cartSubtotal).toFixed(2) 
                        : (routeQuote?.deliveryFee?.toFixed(2) || '0.00')}
                    </Text>
                  </View>
                ) : null}

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.priceLabel}>
                    {!isExplorerView ? "Total Neto a Pagar" : "Costo del Delivery"}
                  </Text>
                  <Text style={styles.priceValue}>
                    ${!isExplorerView ? (routeQuote?.totalToPay?.toFixed(2) || '0.00') : (routeQuote?.deliveryFee?.toFixed(2) || '0.00')}
                  </Text>
                </View>
              </View>

              {!isExplorerView ? (
                <>
                  <View style={styles.editButtonsContainer}>
                    <TouchableOpacity style={styles.editBtnMini} onPress={() => { setActiveEditing('pickup'); setActiveExplorerField('pickup'); setSearchQuery(''); }}>
                      <Ionicons name="business" size={16} color="#6200EE" style={{ marginRight: 5 }} />
                      <Text style={styles.editBtnText}>Cambiar Recogida</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.editBtnMini} onPress={() => { setActiveEditing('delivery'); setActiveExplorerField('delivery'); setSearchQuery(''); }}>
                      <Ionicons name="location" size={16} color="#FF3B30" style={{ marginRight: 5 }} />
                      <Text style={styles.editBtnText}>Cambiar Entrega</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.whatsappBtn} onPress={dispatchWhatsAppOrder}>
                    <Ionicons name="logo-whatsapp" size={20} color="white" style={{ marginRight: 10 }} />
                    <Text style={styles.whatsappBtnText}>Enviar Pedido Estructurado</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {routeQuote?.businessId ? (
                    <TouchableOpacity style={[styles.whatsappBtn, { backgroundColor: '#1A1A1A' }]} onPress={() => router.push({ pathname: "/business/[id]", params: { id: routeQuote.businessId } })}>
                      <Ionicons name="restaurant" size={20} color="white" style={{ marginRight: 10 }} />
                      <Text style={styles.whatsappBtnText}>Ver Menú de esta Tienda</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity style={{ marginTop: 12, alignItems: 'center', paddingVertical: 5 }} onPress={() => { setPolylineCoords([]); setRouteQuote(null); setActiveMode('delivery'); }}>
                    <Text style={{ color: '#666', fontWeight: 'bold', fontSize: 13 }}>X  Volver a simular rutas libres</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>
      ) : null}

      {/* CONTROLES PARA EXPLORACIÓN TOTALMENTE LIBRE */}
      {(activeMode !== 'route' || activeEditing) ? (
        <View style={styles.bottomSheet}>
          {isExplorerView ? (
            <>
              {/* INTERFAZ DE TABS SUPERIORES PARA EL EXPLORADOR */}
              <View style={styles.tabsContainer}>
                <TouchableOpacity style={[styles.tabButton, activeExplorerField === 'pickup' ? styles.tabActivePickup : null]} onPress={() => { setActiveExplorerField('pickup'); setAddress(pickupLocation?.address || 'Mueve el mapa...'); }}>
                  <Text style={[styles.tabText, activeExplorerField === 'pickup' ? styles.tabTextActive : null]}>🏢 Origen (Punto A)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabButton, activeExplorerField === 'delivery' ? styles.tabActiveDelivery : null]} onPress={() => { setActiveExplorerField('delivery'); setAddress(deliveryLocation?.address || 'Mueve el mapa...'); }}>
                  <Text style={[styles.tabText, activeExplorerField === 'delivery' ? styles.tabTextActive : null]}>📍 Destino (Punto B)</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.addressLabel} numberOfLines={1}>{address}</Text>
              
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#1A1A1A' }]} 
                onPress={() => {
                  if (!pickupLocation) {
                    Alert.alert("Falta el Origen", "Ve a la pestaña 'Punto A' y selecciona desde dónde sale el envío.");
                    return;
                  }
                  if (!deliveryLocation) {
                    Alert.alert("Falta el Destino", "Ve a la pestaña 'Punto B' y selecciona a dónde llega el envío.");
                    return;
                  }
                  executeRouteCalculation(pickupLocation, deliveryLocation);
                  setActiveMode('route');
                  setActiveEditing(null);
                }}
              >
                <Text style={[styles.actionBtnText, { color: '#FFF' }]}>⚡ Calcular Ruta y Precio de Envío</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.addressLabel} numberOfLines={2}>{address}</Text>
              <TouchableOpacity style={styles.actionBtn} onPress={handleConfirmSelection} disabled={loadingAddress}>
                <Text style={styles.actionBtnText}>Confirmar este punto</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : null}
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
  addressLabel: { fontSize: 14, color: '#1A1A1A', fontWeight: '600', marginBottom: 15, textAlign: 'center' },
  actionBtn: { backgroundColor: '#FFDB58', height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },

  // Estilos de la barra de pestañas para simulación libre
  tabsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, backgroundColor: '#F1F5F9', padding: 4, borderRadius: 12 },
  tabButton: { flex: 0.49, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActivePickup: { backgroundColor: '#6200EE' },
  tabActiveDelivery: { backgroundColor: '#FF3B30' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  tabTextActive: { color: '#FFF' }
});