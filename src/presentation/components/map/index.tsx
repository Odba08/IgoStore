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
// ✅ Importación con alias seguro para evitar conflictos de tipos con el Location global
import * as ExpoLocation from 'expo-location';

const { width, height } = Dimensions.get('window');

// ⚡ MOTOR DE DECODIFICACIÓN GEOMÉTRICA
const decodePolyline = (encoded: string) => {
  let points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  while (index < len) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1)); lat += dlat; shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1)); lng += dlng; points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
};

const MapScreen = () => {
  const router = useRouter();
  
  // ⚡ CONTROL DE MULTIMODALIDAD INYECTADO
  const { mode, personalData, addressNotes, serviceType = 'store' } = useLocalSearchParams(); 
  const isFavorService = serviceType === 'favor';
  const isStoreService = serviceType === 'store';
  const canEditOrigin = isFavorService; // Regla de negocio estricta

  const mapRef = useRef<MapView>(null);
  const debounceTimeout = useRef<any>(null);
  
  const { items, clearCart } = useCartStore();
  
  // ✅ Extraemos addSavedAddress del store de Zustand
  const { 
    lastKnowLocation, getLocation, pickupLocation, deliveryLocation, 
    setPickupLocation, setDeliveryLocation, addSavedAddress 
  } = useLocationStore();

  const cartSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Estados
  const [activeMode, setActiveMode] = useState<any>(mode || 'delivery');
  const [activeEditing, setActiveEditing] = useState<'pickup' | 'delivery' | null>(null);
  const [routeQuote, setRouteQuote] = useState<any>(null);
  const [polylineCoords, setPolylineCoords] = useState<any[]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [businesses, setBusinesses] = useState<any[]>([]); 
  
  // Si es modo Store, el campo activo siempre es 'delivery'
  const [activeExplorerField, setActiveExplorerField] = useState<'pickup' | 'delivery'>(isStoreService ? 'delivery' : 'delivery');

  const [address, setAddress] = useState('Mueve el mapa para seleccionar...');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [targetCoords, setTargetCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // ✅ Estado local para la etiqueta/nombre de la dirección a guardar
  const [addressLabelInput, setAddressLabelInput] = useState('');

  // Inicialización inteligente del mapa
  useEffect(() => {
    // ✅ Validación robusta contra objetos vacíos ({})
    const hasDelivery = deliveryLocation && typeof deliveryLocation.latitude === 'number' && !isNaN(deliveryLocation.latitude);
    const hasPickup = pickupLocation && typeof pickupLocation.latitude === 'number' && !isNaN(pickupLocation.latitude);
    
    const savedLocation = hasDelivery ? deliveryLocation : (hasPickup ? pickupLocation : null);

    if (savedLocation) {
      const coords = { latitude: savedLocation.latitude, longitude: savedLocation.longitude };
      setTargetCoords(coords);
      setAddress(savedLocation.address || 'Ubicación seleccionada');
    } else if (lastKnowLocation === null) {
      getLocation();
    } else {
      const initialCoords = { latitude: lastKnowLocation.latitude, longitude: lastKnowLocation.longitude };
      setTargetCoords(initialCoords);
      if (mode !== 'route') {
        if (!hasDelivery) {
          setDeliveryLocation({ ...initialCoords, address: 'Mi ubicación actual' });
        }
      }
    }

    // Si es modo Favor, calculamos inmediatamente si ambos existen
    if (mode === 'route' && isFavorService && hasDelivery && hasPickup) {
      executeRouteCalculation(pickupLocation, deliveryLocation);
    }
  }, [lastKnowLocation, mode, deliveryLocation, pickupLocation]);

  // Descarga de comercios asociados
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://10.200.38.48:3000';
        const API_URL = BASE.endsWith('/api') ? BASE : `${BASE}/api`;
        
        let response = await fetch(`${API_URL}/business`).catch(() => null);
        if (!response || !response.ok) response = await fetch(`${API_URL}/bussines`); 
        
        const data = await response.json();
        const list = Array.isArray(data) ? data : (data.data || data.items || []);
        setBusinesses(list);

        // ✅ Si es checkout en tienda (Store), localizamos la tienda del carrito para fijar el Origen (Punto A)
        if (isStoreService && items.length > 0) {
          const firstItem = items[0] as any;
          const targetBizId = firstItem.businessId || firstItem.business_id;
          const targetBiz = list.find((b: any) => b.id === targetBizId);
          if (targetBiz) {
            const bizCoords = { 
              latitude: parseFloat(targetBiz.latitude), 
              longitude: parseFloat(targetBiz.longitude),
              address: targetBiz.name 
            };
            setPickupLocation(bizCoords); // Guardamos la tienda en el Store
            executeRouteCalculation(bizCoords, deliveryLocation || targetCoords);
          }
        }
      } catch (error) {
        console.warn("Radar de red en espera de comercios activos.");
      }
    };

    // ✅ Descargamos negocios siempre para dibujar los pines dorados
    fetchBusinesses();
  }, [isFavorService, isStoreService, mode, items]);

  useEffect(() => {
    if (polylineCoords.length > 0 && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(polylineCoords, {
          edgePadding: { top: 80, right: 50, bottom: 320, left: 50 }, animated: true,
        });
      }, 600);
    }
  }, [polylineCoords]);

  if (lastKnowLocation === null) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="black" /></View>;

  const executeRouteCalculation = async (originPoint: any, destinationPoint: any, alternativeBusinessId?: string) => {
    const firstItem = items[0] as any;
    const businessId = isFavorService ? (alternativeBusinessId || '00000000-0000-0000-0000-000000000000') : (firstItem?.businessId || firstItem?.business_id);

    const currentOrigin = originPoint || pickupLocation;
    const currentDestination = destinationPoint || deliveryLocation || targetCoords;

    // ✅ Validación robusta: Evitamos disparar la consulta con coordenadas (0,0) o undefined
    if (
      !currentDestination || 
      typeof currentDestination.latitude !== 'number' || 
      isNaN(currentDestination.latitude)
    ) {
      console.log("Esperando coordenadas válidas de entrega...");
      return;
    }

    if (isFavorService && (!currentOrigin || typeof currentOrigin.latitude !== 'number' || isNaN(currentOrigin.latitude))) {
      Alert.alert("Origen Requerido", "Por favor selecciona un origen alternando a la pestaña Punto A.");
      return;
    }

    setIsCalculatingRoute(true);
    try {
      const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://10.200.38.48:3000';
      const API_URL = BASE.endsWith('/api') ? BASE : `${BASE}/api`;
      const ENDPOINT = isFavorService ? `${API_URL}/orders/quote` : `${API_URL}/orders`;
      
      const orderPayload = isFavorService ? {
        businessId: businessId,
        pickupLat: currentOrigin.latitude, pickupLong: currentOrigin.longitude,
        deliveryLat: currentDestination.latitude, deliveryLong: currentDestination.longitude,
      } : {
        businessId: businessId, 
        userIdTemp: personalData || 'Cliente Igo',
        // ✅ Para el modo tienda, si tenemos coordenadas las enviamos, sino el backend usará las de la base de datos
        ...(currentOrigin && typeof currentOrigin.latitude === 'number' && !isNaN(currentOrigin.latitude) ? {
          pickupLat: currentOrigin.latitude,
          pickupLong: currentOrigin.longitude
        } : {}),
        deliveryLat: currentDestination.latitude, deliveryLong: currentDestination.longitude,
        deliveryAddress: `${currentDestination.address} | Ref: ${addressNotes || ''}`.trim(),
        items: items.map(item => ({
          productId: item.id.substring(0, 36), quantity: item.quantity,
          selectedOptionsText: item.title.includes('(') ? item.title.substring(item.title.indexOf('(') + 1, item.title.lastIndexOf(')')) : 'Sin adicionales',
          finalUnitPrice: item.price        
        }))
      };

      const response = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderPayload) });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Error en cotización');

      setRouteQuote({
        orderId: data.orderId || null, distance: data.distance,
        totalToPay: isFavorService ? null : data.totalToPay, deliveryFee: data.deliveryFee,
        userLat: currentDestination.latitude, userLong: currentDestination.longitude,
        businessLat: data.businessLocation?.latitude || currentOrigin?.latitude,
        businessLong: data.businessLocation?.longitude || currentOrigin?.longitude,
        businessId: businessId !== '00000000-0000-0000-0000-000000000000' ? businessId : null
      });

      if (data.routePolyline) {
        if (typeof data.routePolyline === 'string') {
          setPolylineCoords(decodePolyline(data.routePolyline));
        } else if (Array.isArray(data.routePolyline)) {
          // ✅ MAPEADO DEFENSIVO: Asegura que el formato sea estrictamente { latitude: number, longitude: number }
          const formattedCoords = data.routePolyline.map((point: any) => {
            if (point && typeof point === 'object') {
              const lat = Number(point.latitude ?? point.lat);
              const lng = Number(point.longitude ?? point.lng);
              return { latitude: lat, longitude: lng };
            } else if (Array.isArray(point) && point.length >= 2) {
              const firstVal = Number(point[0]);
              const secondVal = Number(point[1]);
              const isFirstValLng = firstVal < 0; 
              return {
                latitude: isFirstValLng ? secondVal : firstVal,
                longitude: isFirstValLng ? firstVal : secondVal
              };
            }
            return null;
          }).filter((item: any) => item !== null && !isNaN(item.latitude) && !isNaN(item.longitude));
          
          setPolylineCoords(formattedCoords);
        }
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error de Consulta", "No pudimos trazar la ruta seleccionada.");
    } finally { setIsCalculatingRoute(false); }
  };

  const fetchGeocodeAddress = async (lat: number, lng: number) => {
    setLoadingAddress(true);
    try {
      const response = await ExpoLocation.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (response && response.length > 0) {
        const place = response[0];
        const label = `${place.street || 'Calle sin nombre'}, ${place.district || place.subregion || ''} ${place.city || ''}`.trim().replace(/^,|,$/, '');
        
        // ✅ Guardamos solo de forma local mientras se desplaza
        setAddress(label);
        setTargetCoords({ latitude: lat, longitude: lng });
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
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text + ', Maracaibo')}&viewbox=-71.80,10.45,-71.50,10.80&bounded=1&addressdetails=1&limit=5`;
      const response = await fetch(url, { headers: { 'User-Agent': 'IgoStoreApp/1.4' } });
      const data = await response.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) { setSearchResults([]); } finally { setIsSearching(false); }
  };

  const handleSelectPlace = (place: any) => {
    Keyboard.dismiss();
    setSearchResults([]);
    setSearchQuery(place.display_name.split(',')[0]);
    const coordsPayload = { latitude: parseFloat(place.lat), longitude: parseFloat(place.lon) };
    
    setTargetCoords(coordsPayload);
    setAddress(place.display_name);

    if (mode !== 'route') {
      if (activeExplorerField === 'pickup' && canEditOrigin) setPickupLocation({ ...coordsPayload, address: place.display_name });
      else setDeliveryLocation({ ...coordsPayload, address: place.display_name });
    }
    mapRef.current?.animateToRegion({ ...coordsPayload, latitudeDelta: 0.006, longitudeDelta: 0.006 }, 1000);
  };

  const handleRegionChangeComplete = (newRegion: any) => {
    if (activeMode === 'route' && !activeEditing) return; 
    setTargetCoords({ latitude: newRegion.latitude, longitude: newRegion.longitude });
    fetchGeocodeAddress(newRegion.latitude, newRegion.longitude);
  };

  const handleConfirmSelection = (shouldSave: boolean = false) => {
    if (!targetCoords) return;
    const payload = { latitude: targetCoords.latitude, longitude: targetCoords.longitude, address };

    // ✅ Guardamos en el Store global únicamente al confirmar
    if (activeExplorerField === 'pickup' && canEditOrigin) {
      setPickupLocation(payload);
    } else {
      setDeliveryLocation(payload);
    }

    // ✅ Si el usuario presiona "Guardar y Usar", agregamos la dirección a su perfil/carrito
    if (shouldSave) {
      const label = addressLabelInput.trim() || '📍 Ubicación guardada';
      addSavedAddress({
        label,
        address: address,
        latitude: targetCoords.latitude,
        longitude: targetCoords.longitude
      });
      Alert.alert("Dirección Guardada", `Se guardó "${label}" en tu lista de direcciones.`);
    }
    
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/cart/cart'); 
    }
  };

  const dispatchWhatsAppOrder = () => {
    if (!routeQuote) return;
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const mapsUrlTienda = `https://www.google.com/maps/search/?api=1&query=${routeQuote.businessLat},${routeQuote.businessLong}`;
    const mapsUrlCliente = `https://www.google.com/maps/search/?api=1&query=${routeQuote.userLat},${routeQuote.userLong}`;
    let message = `*🍔 NUEVO PEDIDO - IGO STORE* 🛒\n---------------------------------------\n*🆔 Orden ID:* #${routeQuote.orderId || 'N/A'}\n\n*📦 DETALLE DEL PEDIDO:*\n`;
    items.forEach((item) => { message += `▪️ ${item.quantity}x ${item.title.split(' (')[0]}\n`; });
    message += `\n👤 *CLIENTE:* ${String(personalData || 'No indicado').trim()}\n📝 *REF:* ${String(addressNotes || 'Sin notas').trim()}\n\n*🏢 RECOGIDA (PUNTO A):*\n📍 GPS: ${mapsUrlTienda}\n\n*📍 ENTREGA (PUNTO B):*\n🏠 Dirección: ${deliveryLocation?.address || 'Ubicación en Mapa'}\n🗺️ GPS: ${mapsUrlCliente}\n---------------------------------------\n💰 *SUBTOTAL:* $${subtotal.toFixed(2)}\n`;
    const deliveryCalculated = routeQuote.totalToPay ? Math.max(0, routeQuote.totalToPay - subtotal).toFixed(2) : (routeQuote.deliveryFee?.toFixed(2) || '0.00');
    message += `🛵 *DELIVERY (${routeQuote.distance}):* $${deliveryCalculated}\n⭐️ *TOTAL NETO A PAGAR:* $${routeQuote.totalToPay?.toFixed(2) || '0.00'}\n\n`;
    Linking.openURL(`https://wa.me/573014215155?text=${encodeURIComponent(message.trim())}`);
    clearCart(); setPickupLocation(null); setDeliveryLocation(null); router.replace('/');
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef} style={styles.map} provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{ latitude: lastKnowLocation.latitude, longitude: lastKnowLocation.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
        onRegionChangeComplete={handleRegionChangeComplete} showsUserLocation={true} showsMyLocationButton={false}
      >
        {/* ✅ PINES DORADOS PARA COMERCIOS (Con etiqueta flotante con el nombre) */}
        {businesses.map((bus) => {
          const lat = parseFloat(bus.latitude), lng = parseFloat(bus.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;
          return (
            <Marker 
              key={bus.id} 
              coordinate={{ latitude: lat, longitude: lng }} 
              onPress={() => {
                if (isFavorService) {
                  const origin = { latitude: lat, longitude: lng, address: bus.name };
                  setPickupLocation(origin); 
                  executeRouteCalculation(origin, deliveryLocation, bus.id); 
                  setActiveMode('route');
                } else {
                  Alert.alert(bus.name, `Ubicación oficial del negocio.`);
                }
              }}
            >
              {/* ✅ Burbuja flotante con el nombre del local siempre visible */}
              <View style={styles.businessMarkerWrapper}>
                <View style={styles.businessMarkerBubble}>
                  <Text style={styles.businessMarkerText} numberOfLines={1}>{bus.name}</Text>
                </View>
                <Ionicons name="location" size={28} color="#EDB422" style={styles.businessMarkerPin} />
              </View>
            </Marker>
          );
        })}

        {pickupLocation && (activeMode === 'route' || activeExplorerField !== 'pickup') ? (
          <Marker coordinate={pickupLocation} title="Origen (Punto A)" pinColor="#6200EE" />
        ) : null}
        
        {deliveryLocation && (activeMode === 'route' || activeExplorerField !== 'delivery') ? (
          <Marker coordinate={deliveryLocation} title="Destino (Punto B)" pinColor="#FF3B30" />
        ) : null}

        {/* ✅ CAMBIO: Validamos mínimo 2 puntos para dibujar la línea */}
        {activeMode === 'route' && polylineCoords.length >= 2 ? (
          <Polyline coordinates={polylineCoords} strokeColor="#6200EE" strokeWidth={5} />
        ) : null}
      </MapView>

      {(activeMode !== 'route' || activeEditing) ? (
        <View style={styles.searchContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="search" size={20} color="#666" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput} placeholderTextColor="#999" value={searchQuery} onChangeText={handleSearchTextChange}
              placeholder={activeExplorerField === 'pickup' && canEditOrigin ? "Buscar sector o local de recogida (A)..." : "Buscar avenida o casa de entrega (B)..."}
            />
            {isSearching ? <ActivityIndicator size="small" color="#EDB422" /> : null}
          </View>
          {searchResults.length > 0 ? (
            <View style={styles.resultsList}>
              <FlatList data={searchResults} keyExtractor={(item) => item.place_id.toString()} keyboardShouldPersistTaps="handled" renderItem={({ item }) => (
                  <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectPlace(item)}>
                    <Ionicons name="location-outline" size={18} color="#EDB422" style={{ marginRight: 10 }} />
                    <Text style={styles.resultText} numberOfLines={2}>{item.display_name}</Text>
                  </TouchableOpacity>
                )} />
            </View>
          ) : null}
        </View>
      ) : null}

      <TouchableOpacity style={styles.backFloatingBtn} onPress={() => { if (router.canGoBack()) router.back(); else router.push('/'); }}>
        <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
      </TouchableOpacity>

      {(activeMode !== 'route' || activeEditing) ? (
        <View style={styles.markerFixed} pointerEvents="none">
          <View style={styles.pinWrapper}>
            <Ionicons name="location" size={44} color={activeExplorerField === 'pickup' || activeEditing === 'pickup' ? "#6200EE" : "#FF3B30"} style={styles.pinIcon} />
            <View style={styles.baseDot} />
          </View>
        </View>
      ) : null}

      {activeMode === 'route' && !activeEditing ? (
        <View style={styles.routeSheet}>
          <Text style={styles.routeSheetTitle}>{!isFavorService ? "Resumen de tu Pedido" : "Cotización Instantánea de Envío"}</Text>
          {isCalculatingRoute ? (
            <ActivityIndicator size="large" color="#6200EE" style={{ marginVertical: 20 }} />
          ) : (
            <>
              <View style={styles.routeInfoRow}>
                <View>
                  <Text style={styles.distanceLabel}>Distancia Vial</Text>
                  <Text style={styles.distanceValue}>{routeQuote?.distance || 'Calculando...'}</Text>
                </View>
                {!isFavorService ? (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.distanceLabel}>Delivery</Text>
                    <Text style={[styles.distanceValue, { color: '#FF3B30' }]}>${routeQuote?.totalToPay ? Math.max(0, routeQuote.totalToPay - cartSubtotal).toFixed(2) : (routeQuote?.deliveryFee?.toFixed(2) || '0.00')}</Text>
                  </View>
                ) : null}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.priceLabel}>{!isFavorService ? "Total Neto a Pagar" : "Costo del Delivery"}</Text>
                  <Text style={styles.priceValue}>${!isFavorService ? (routeQuote?.totalToPay?.toFixed(2) || '0.00') : (routeQuote?.deliveryFee?.toFixed(2) || '0.00')}</Text>
                </View>
              </View>

              {!isFavorService ? (
                <>
                  <View style={styles.editButtonsContainer}>
                    <TouchableOpacity style={[styles.editBtnMini, { flex: 1 }]} onPress={() => { setActiveEditing('delivery'); setActiveExplorerField('delivery'); setSearchQuery(''); }}>
                      <Ionicons name="location" size={16} color="#FF3B30" style={{ marginRight: 5 }} />
                      <Text style={styles.editBtnText}>Cambiar Destino de Entrega</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* ⚡ BOTÓN DE WHATSAPP MEJORADO Y SEGURO */}
                  <TouchableOpacity 
                    style={[
                      styles.whatsappBtn, 
                      { opacity: !routeQuote ? 0.6 : 1 }
                    ]} 
                    onPress={() => {
                      if (!routeQuote) {
                        Alert.alert("Cotización faltante", "No se pudo obtener el precio del envío. Por favor, reintenta mover el punto de entrega en el mapa.");
                        return;
                      }
                      dispatchWhatsAppOrder();
                    }}
                  >
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

      {/* ⚡ CONTROL VISUAL ESTRATÉGICO SEGÚN SERVICIO */}
      {(activeMode !== 'route' || activeEditing) ? (
        <View style={styles.bottomSheet}>
          {isFavorService ? (
            <>
              <View style={styles.tabsContainer}>
                <TouchableOpacity style={[styles.tabButton, activeExplorerField === 'pickup' ? styles.tabActivePickup : null]} onPress={() => { setActiveExplorerField('pickup'); setAddress(pickupLocation?.address || 'Mueve el mapa...'); }}>
                  <Text style={[styles.tabText, activeExplorerField === 'pickup' ? styles.tabTextActive : null]}>🏢 Origen (A)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabButton, activeExplorerField === 'delivery' ? styles.tabActiveDelivery : null]} onPress={() => { setActiveExplorerField('delivery'); setAddress(deliveryLocation?.address || 'Mueve el mapa...'); }}>
                  <Text style={[styles.tabText, activeExplorerField === 'delivery' ? styles.tabTextActive : null]}>📍 Destino (B)</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.addressLabel} numberOfLines={1}>{address}</Text>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#1A1A1A' }]} onPress={() => {
                  if (!pickupLocation) return Alert.alert("Falta el Origen", "Selecciona desde dónde sale el envío.");
                  if (!deliveryLocation) return Alert.alert("Falta el Destino", "Selecciona a dónde llega el envío.");
                  executeRouteCalculation(pickupLocation, deliveryLocation);
                  setActiveMode('route'); setActiveEditing(null);
                }}>
                <Text style={[styles.actionBtnText, { color: '#FFF' }]}>⚡ Calcular Ruta y Precio de Envío</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={{ marginBottom: 15, alignItems: 'center' }}>
                 <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' }}>Confirma tu dirección de entrega</Text>
                 <Text style={{ fontSize: 13, color: '#666' }}>Arrastra el mapa para ajustar el punto exacto</Text>
              </View>
              <Text style={styles.addressLabel} numberOfLines={2}>{address}</Text>
              
              {/* ✅ Formulario para ponerle nombre y guardar la dirección */}
              <View style={styles.saveAddressContainer}>
                <Ionicons name="bookmark-outline" size={18} color="#666" style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="Ej: Casa, Trabajo, Novia (Opcional)"
                  placeholderTextColor="#999"
                  style={styles.saveAddressInput}
                  value={addressLabelInput}
                  onChangeText={setAddressLabelInput}
                />
              </View>

              <View style={styles.actionButtonsRow}>
                <TouchableOpacity 
                  style={[styles.actionBtn, { flex: 0.48, backgroundColor: '#F1F5F9' }]} 
                  onPress={() => handleConfirmSelection(false)} 
                  disabled={loadingAddress}
                >
                  <Text style={[styles.actionBtnText, { color: '#334155' }]}>Solo usar hoy</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionBtn, { flex: 0.48, backgroundColor: '#FFDB58' }]} 
                  onPress={() => handleConfirmSelection(true)} 
                  disabled={loadingAddress}
                >
                  <Text style={styles.actionBtnText}>Guardar y Usar</Text>
                </TouchableOpacity>
              </View>
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
  editBtnMini: { flexDirection: 'row', backgroundColor: '#F1F5F9', height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  editBtnText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  whatsappBtn: { backgroundColor: '#25D366', height: 52, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  whatsappBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  addressLabel: { fontSize: 14, color: '#1A1A1A', fontWeight: '600', marginBottom: 15, textAlign: 'center' },
  actionBtn: { backgroundColor: '#FFDB58', height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  tabsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, backgroundColor: '#F1F5F9', padding: 4, borderRadius: 12 },
  tabButton: { flex: 0.49, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActivePickup: { backgroundColor: '#6200EE' },
  tabActiveDelivery: { backgroundColor: '#FF3B30' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  tabTextActive: { color: '#FFF' },
  
  // ✅ Nuevos estilos del formulario de guardado
  saveAddressContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, height: 44, marginBottom: 15 },
  saveAddressInput: { flex: 1, fontSize: 14, color: '#1A1A1A' },
  actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-between' },

  // ✅ Nuevos estilos del marcador dorado de comercios
  businessMarkerWrapper: { alignItems: 'center', justifyContent: 'center' },
  businessMarkerBubble: { backgroundColor: 'white', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#EDB422', marginBottom: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1.5, elevation: 2 },
  businessMarkerText: { fontSize: 9, fontWeight: 'bold', color: '#1A1A1A' },
  businessMarkerPin: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 3 }
});

