import React, { useState, useEffect, useRef } from 'react';
import { 
  ActivityIndicator, View, StyleSheet, Text, TextInput, 
  TouchableOpacity, FlatList, Dimensions, Platform, Keyboard, Alert, Linking, ScrollView 
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router'; 
import { useLocationStore } from '@/presentation/store/useLocationStore';
import { useCartStore } from '@/presentation/store/useCartStore';
// ✅ Importación con alias seguro
import * as ExpoLocation from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// ⚡ RESOLUCIÓN DINÁMICA DE URL DEL BACKEND (Android Emulator vs iOS vs Dispositivo Físico)
const getApiUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  
  // IP de respaldo según la plataforma
  const defaultHost = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://192.168.31.236:3000';
  return `${defaultHost}/api`;
};

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

// Coordenadas por defecto (Maracaibo) si el GPS aún no entrega ubicación
const FALLBACK_COORDS = { latitude: 10.6427, longitude: -71.6125 };

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
  
  // ✅ Extraemos store de Zustand
  const { 
    lastKnowLocation, getLocation, pickupLocation, deliveryLocation, 
    setPickupLocation, setDeliveryLocation, addSavedAddress 
  } = useLocationStore();

  const cartSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Ubicación activa para renderizar el mapa
  const initialCoords = lastKnowLocation || FALLBACK_COORDS;

  // Estados
  const [activeMode, setActiveMode] = useState<any>(mode || 'delivery');
  const [activeEditing, setActiveEditing] = useState<'pickup' | 'delivery' | null>(null);
  const [routeQuote, setRouteQuote] = useState<any>(null);
  const [polylineCoords, setPolylineCoords] = useState<any[]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [businesses, setBusinesses] = useState<any[]>([]); 
  const [businessCategoryName, setBusinessCategoryName] = useState<string>("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  
  const [activeExplorerField, setActiveExplorerField] = useState<'pickup' | 'delivery'>('delivery');

  const [address, setAddress] = useState('Mueve el mapa para seleccionar...');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [targetCoords, setTargetCoords] = useState<{ latitude: number; longitude: number } | null>(initialCoords);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Estado local para la etiqueta/nombre de la dirección a guardar
  const [addressLabelInput, setAddressLabelInput] = useState('');

  // Nuevos selectores de pedido
  const [selectedCategory, setSelectedCategory] = useState<'Comida' | 'Mercado' | 'Compras' | 'Envíos' | 'Salud'>('Comida');
  const [selectedShippingType, setSelectedShippingType] = useState<'Moto' | 'Carro' | 'Pickup'>('Moto');
  const [selectedPaymentRecipient, setSelectedPaymentRecipient] = useState<'Pago IGO' | 'Pago Negocio' | 'Mix'>('Pago IGO');

  // Inicialización inteligente del mapa (intenta obtener GPS sin bloquear el renderizado)
  useEffect(() => {
    const hasDelivery = deliveryLocation && typeof deliveryLocation.latitude === 'number' && !isNaN(deliveryLocation.latitude);
    const hasPickup = pickupLocation && typeof pickupLocation.latitude === 'number' && !isNaN(pickupLocation.latitude);
    
    const savedLocation = hasDelivery ? deliveryLocation : (hasPickup ? pickupLocation : null);

    if (savedLocation) {
      const coords = { latitude: savedLocation.latitude, longitude: savedLocation.longitude };
      setTargetCoords(coords);
      setAddress(savedLocation.address || 'Ubicación seleccionada');
    } else if (!lastKnowLocation) {
      getLocation(); // Pedimos GPS en segundo plano
    } else {
      const coords = { latitude: lastKnowLocation.latitude, longitude: lastKnowLocation.longitude };
      setTargetCoords(coords);
      if (mode !== 'route' && !hasDelivery) {
        setDeliveryLocation({ ...coords, address: 'Mi ubicación actual' });
      }
    }

    if (mode === 'route' && isFavorService && hasDelivery && hasPickup) {
      executeRouteCalculation(pickupLocation, deliveryLocation);
    }
  }, [lastKnowLocation, mode, deliveryLocation, pickupLocation]);

  // Descarga de comercios asociados
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const API_URL = getApiUrl();
        
        let response = await fetch(`${API_URL}/business`).catch(() => null);
        if (!response || !response.ok) {
          response = await fetch(`${API_URL}/bussines`).catch(() => null);
        }
        
        if (response && response.ok) {
          const data = await response.json();
          const list = Array.isArray(data) ? data : (data.data || data.items || []);
          setBusinesses(list);

          // Si es checkout en tienda (Store), localizamos la tienda del carrito
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
              setPickupLocation(bizCoords);
              executeRouteCalculation(bizCoords, deliveryLocation || targetCoords);
            }
          }
        }
      } catch (error) {
        console.warn("Radar de red en espera de comercios activos.");
      }
    };

    fetchBusinesses();
  }, [isFavorService, isStoreService, mode, items]);

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

  // Autoselección de categoría según el comercio
  const firstItem = items[0] as any;
  const currentBusinessId = isFavorService ? '00000000-0000-0000-0000-000000000000' : (firstItem?.businessId || firstItem?.business_id);

  useEffect(() => {
    if (currentBusinessId && businesses.length > 0) {
      const biz = businesses.find(b => b.id === currentBusinessId);
      if (biz && biz.category) {
        setBusinessCategoryName(biz.category.name);
        const catName = biz.category.name.toLowerCase();
        if (catName.includes('comida') || catName.includes('hamburguesa') || catName.includes('restaurante') || catName.includes('pizza') || catName.includes('sushi') || catName.includes('cafe')) {
          setSelectedCategory('Comida');
        } else if (catName.includes('farmacia') || catName.includes('salud') || catName.includes('medica')) {
          setSelectedCategory('Salud');
        } else if (catName.includes('supermercado') || catName.includes('mercado') || catName.includes('bodega')) {
          setSelectedCategory('Mercado');
        } else if (catName.includes('envio') || catName.includes('delivery') || catName.includes('mensajeria')) {
          setSelectedCategory('Envíos');
        } else {
          setSelectedCategory('Compras');
        }
      }
    }
  }, [currentBusinessId, businesses]);

  // Recalcular ruta y tarifas cuando cambia el tipo de envío en modo ruta
  useEffect(() => {
    if (activeMode === 'route') {
      const currentOrigin = pickupLocation;
      const currentDestination = deliveryLocation || targetCoords;
      if (currentDestination) {
        executeRouteCalculation(currentOrigin, currentDestination, routeQuote?.businessId);
      }
    }
  }, [selectedShippingType]);

  const executeRouteCalculation = async (originPoint: any, destinationPoint: any, alternativeBusinessId?: string) => {
    const firstItem = items[0] as any;
    const businessId = isFavorService ? (alternativeBusinessId || '00000000-0000-0000-0000-000000000000') : (firstItem?.businessId || firstItem?.business_id);

    const currentOrigin = originPoint || pickupLocation;
    const currentDestination = destinationPoint || deliveryLocation || targetCoords;

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
      const API_URL = getApiUrl();
      const ENDPOINT = `${API_URL}/orders/quote`;
      
      const quotePayload = {
        businessId: businessId,
        pickupLat: currentOrigin?.latitude,
        pickupLong: currentOrigin?.longitude,
        deliveryLat: currentDestination.latitude,
        deliveryLong: currentDestination.longitude,
        shippingType: selectedShippingType
      };

      const token = await AsyncStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify(quotePayload) });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Error en cotización');

      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      setRouteQuote({
        orderId: null,
        distance: data.distance,
        totalToPay: isFavorService ? null : (subtotal + data.deliveryFee),
        deliveryFee: data.deliveryFee,
        userLat: currentDestination.latitude,
        userLong: currentDestination.longitude,
        businessLat: data.businessLocation?.latitude || currentOrigin?.latitude,
        businessLong: data.businessLocation?.longitude || currentOrigin?.longitude,
        businessId: businessId !== '00000000-0000-0000-0000-000000000000' ? businessId : null
      });

      if (data.routePolyline) {
        if (typeof data.routePolyline === 'string') {
          setPolylineCoords(decodePolyline(data.routePolyline));
        } else if (Array.isArray(data.routePolyline)) {
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
    } finally { 
      setIsCalculatingRoute(false); 
    }
  };

  const fetchGeocodeAddress = async (lat: number, lng: number) => {
    setLoadingAddress(true);
    try {
      const response = await ExpoLocation.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (response && response.length > 0) {
        const place = response[0];
        const label = `${place.street || 'Calle sin nombre'}, ${place.district || place.subregion || ''} ${place.city || ''}`.trim().replace(/^,|,$/, '');
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
    } catch (error) { 
      setSearchResults([]); 
    } finally { 
      setIsSearching(false); 
    }
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

    if (activeExplorerField === 'pickup' && canEditOrigin) {
      setPickupLocation(payload);
    } else {
      setDeliveryLocation(payload);
    }

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

  const handleUseCurrentLocation = async () => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permiso Denegado", "Necesitamos acceso al GPS para obtener tu ubicación actual.");
        return;
      }
      setLoadingAddress(true);
      const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.High });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      mapRef.current?.animateToRegion({
        ...coords,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008
      }, 1000);
      setTargetCoords(coords);
      const geo = await ExpoLocation.reverseGeocodeAsync(coords);
      if (geo && geo.length > 0) {
        const item = geo[0];
        const formatted = [item.street, item.streetNumber, item.district, item.city].filter(Boolean).join(', ');
        setAddress(formatted || 'Mi ubicación actual');
      } else {
        setAddress('Mi ubicación actual');
      }
    } catch (err) {
      Alert.alert("GPS", "No pudimos obtener tu ubicación actual.");
    } finally {
      setLoadingAddress(false);
    }
  };

  const dispatchWhatsAppOrder = async () => {
    if (!routeQuote) return;
    setIsSubmittingOrder(true);

    try {
      const firstItem = items[0] as any;
      const businessId = isFavorService ? (routeQuote.businessId || '00000000-0000-0000-0000-000000000000') : (firstItem?.businessId || firstItem?.business_id);
      
      const API_URL = getApiUrl();
      const ENDPOINT = `${API_URL}/orders`;

      const orderPayload = {
        businessId: businessId, 
        userIdTemp: personalData || 'Cliente Igo',
        pickupLat: routeQuote.businessLat,
        pickupLong: routeQuote.businessLong,
        deliveryLat: routeQuote.userLat,
        deliveryLong: routeQuote.userLong,
        deliveryAddress: `${deliveryLocation?.address || 'Ubicación en Mapa'} | Ref: ${addressNotes || ''}`.trim(),
        category: selectedCategory,
        shippingType: selectedShippingType,
        paymentRecipient: selectedPaymentRecipient,
        items: items.map(item => ({
          productId: item.productId || item.id.split('-')[0], 
          quantity: item.quantity,
          selectedOptionsText: item.selectedOptionsText || 'Sin adicionales',
          finalUnitPrice: item.price        
        }))
      };

      const token = await AsyncStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(ENDPOINT, { 
        method: 'POST', 
        headers, 
        body: JSON.stringify(orderPayload) 
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al guardar el pedido en el servidor');
      }

      const realOrderNumber = data.orderId || 'N/A';
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const mapsUrlTienda = `https://www.google.com/maps/search/?api=1&query=${routeQuote.businessLat},${routeQuote.businessLong}`;
      const mapsUrlCliente = `https://www.google.com/maps/search/?api=1&query=${routeQuote.userLat},${routeQuote.userLong}`;
      
      const categoryText = isFavorService ? 'Favor / Envío' : (businessCategoryName || selectedCategory);
      const shippingEmoji = selectedShippingType === 'Moto' ? '🏍️ Moto' : selectedShippingType === 'Carro' ? '🚗 Carro' : '🛻 Pickup';

      let message = `*🍔 NUEVO PEDIDO - IGO STORE* 🛒\n---------------------------------------\n*🆔 Orden ID:* #${String(realOrderNumber).padStart(4, '0')}\n`;
      message += `*🏷️ Categoría:* ${categoryText}\n*🛵 Tipo de Envío:* ${shippingEmoji}\n*💳 Canal de Pago:* ${selectedPaymentRecipient}\n---------------------------------------\n*📦 DETALLE DEL PEDIDO:*\n`;
      
      items.forEach((item) => { 
        message += `▪️ ${item.quantity}x ${item.title}`;
        if (item.selectedOptionsText && item.selectedOptionsText.trim() !== '') {
          message += `\n   ↳ Opciones: ${item.selectedOptionsText}`;
        }
        message += `\n`; 
      });

      message += `\n👤 *CLIENTE:* ${String(personalData || 'No indicado').trim()}\n📝 *REF:* ${String(addressNotes || 'Sin notas').trim()}\n\n*🏢 RECOGIDA (PUNTO A):*\n📍 GPS: ${mapsUrlTienda}\n\n*📍 ENTREGA (PUNTO B):*\n🏠 Dirección: ${deliveryLocation?.address || 'Ubicación en Mapa'}\n🗺️ GPS: ${mapsUrlCliente}\n---------------------------------------\n💰 *SUBTOTAL:* $${subtotal.toFixed(2)}\n`;
      const deliveryCalculated = routeQuote.totalToPay ? Math.max(0, routeQuote.totalToPay - subtotal).toFixed(2) : (routeQuote.deliveryFee?.toFixed(2) || '0.00');
      message += `🛵 *DELIVERY (${routeQuote.distance}):* $${deliveryCalculated}\n⭐️ *TOTAL NETO A PAGAR:* $${routeQuote.totalToPay?.toFixed(2) || '0.00'}\n\n`;
      
      Linking.openURL(`https://wa.me/573014215155?text=${encodeURIComponent(message.trim())}`);
      
      clearCart(); 
      setPickupLocation(null); 
      setDeliveryLocation(null); 
      router.replace('/');

    } catch (err: any) {
      Alert.alert("Error de Envío", err.message || "No pudimos enviar tu pedido. Intenta nuevamente.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef} 
        style={styles.map} 
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{ 
          latitude: initialCoords.latitude, 
          longitude: initialCoords.longitude, 
          latitudeDelta: 0.012, 
          longitudeDelta: 0.012 
        }}
        onRegionChangeComplete={handleRegionChangeComplete} 
        showsUserLocation={true} 
        showsMyLocationButton={false}
      >
        {/* PINES DORADOS PARA COMERCIOS */}
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

      <TouchableOpacity 
        style={styles.myLocationFloatingBtn} 
        onPress={async () => {
          try {
            const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.High });
            const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            mapRef.current?.animateToRegion({
              ...coords,
              latitudeDelta: 0.008,
              longitudeDelta: 0.008
            }, 1000);
            setTargetCoords(coords);
            fetchGeocodeAddress(coords.latitude, coords.longitude);
          } catch (err) {
            if (lastKnowLocation) {
              mapRef.current?.animateToRegion({
                ...lastKnowLocation,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008
              }, 1000);
            } else {
              Alert.alert("GPS", "No pudimos obtener tu ubicación actual.");
            }
          }
        }}
      >
        <Ionicons name="locate" size={24} color="#1A1A1A" />
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

              {/* SELECTORES DE PEDIDO */}
              <View style={{ maxHeight: 160, marginBottom: 12 }}>
                <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                  
                  {/* 1. Selector de Tipo de Envío */}
                  <Text style={styles.selectorLabel}>🛵 Tipo de Envío</Text>
                  <View style={styles.selectorRow}>
                    {(['Moto', 'Carro', 'Pickup'] as const).map(type => (
                      <TouchableOpacity 
                        key={type} 
                        style={[styles.selectorChip, selectedShippingType === type && styles.selectorChipActive]}
                        onPress={() => setSelectedShippingType(type)}
                      >
                        <Text style={[styles.selectorChipText, selectedShippingType === type && styles.selectorChipTextActive]}>
                          {type === 'Moto' ? '🏍️ Moto' : type === 'Carro' ? '🚗 Carro' : '🛻 Pickup'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* 2. Selector de Método de Pago */}
                  <Text style={styles.selectorLabel}>💳 Canal de Pago</Text>
                  <View style={styles.selectorRow}>
                    {(['Pago IGO', 'Pago Negocio', 'Mix'] as const).map(mode => (
                      <TouchableOpacity 
                        key={mode} 
                        style={[styles.selectorChip, selectedPaymentRecipient === mode && styles.selectorChipActive]}
                        onPress={() => setSelectedPaymentRecipient(mode)}
                      >
                        <Text style={[styles.selectorChipText, selectedPaymentRecipient === mode && styles.selectorChipTextActive]}>
                          {mode}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* El selector manual de Categoría fue removido; la categoría se asigna automáticamente basada en el comercio */}
                </ScrollView>
              </View>

              {!isFavorService ? (
                <>
                  <View style={styles.editButtonsContainer}>
                    <TouchableOpacity style={[styles.editBtnMini, { flex: 1 }]} onPress={() => { setActiveEditing('delivery'); setActiveExplorerField('delivery'); setSearchQuery(''); }}>
                      <Ionicons name="location" size={16} color="#FF3B30" style={{ marginRight: 5 }} />
                      <Text style={styles.editBtnText}>Cambiar Destino de Entrega</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity 
                    style={[
                      styles.whatsappBtn, 
                      { opacity: (!routeQuote || isSubmittingOrder) ? 0.6 : 1 }
                    ]} 
                    disabled={!routeQuote || isSubmittingOrder}
                    onPress={() => {
                      if (!routeQuote) {
                        Alert.alert("Cotización faltante", "No se pudo obtener el precio del envío. Por favor, reintenta mover el punto de entrega en el mapa.");
                        return;
                      }
                      dispatchWhatsAppOrder();
                    }}
                  >
                    {isSubmittingOrder ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Ionicons name="logo-whatsapp" size={20} color="white" style={{ marginRight: 10 }} />
                        <Text style={styles.whatsappBtnText}>Enviar Pedido Estructurado</Text>
                      </>
                    )}
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

              <TouchableOpacity 
                style={styles.currentLocationCta}
                onPress={handleUseCurrentLocation}
                disabled={loadingAddress}
              >
                <Ionicons name="locate" size={18} color="#6528FF" style={{ marginRight: 6 }} />
                <Text style={styles.currentLocationCtaText}>
                  {loadingAddress ? "Buscando GPS..." : "📍 Usar mi ubicación actual (GPS)"}
                </Text>
              </TouchableOpacity>

              <Text style={styles.addressLabel} numberOfLines={2}>{address}</Text>
              
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
  myLocationFloatingBtn: { position: 'absolute', bottom: Platform.OS === 'ios' ? 260 : 240, right: 15, backgroundColor: 'white', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, elevation: 6, zIndex: 20 },
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
  saveAddressContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, height: 44, marginBottom: 15 },
  saveAddressInput: { flex: 1, fontSize: 14, color: '#1A1A1A' },
  actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  businessMarkerWrapper: { alignItems: 'center', justifyContent: 'center' },
  businessMarkerBubble: { backgroundColor: 'white', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#EDB422', marginBottom: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1.5, elevation: 2 },
  businessMarkerText: { fontSize: 9, fontWeight: 'bold', color: '#1A1A1A' },
  businessMarkerPin: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 3 },
  
  // Nuevos estilos de selectores y GPS CTA
  currentLocationCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    borderWidth: 1.5,
    borderColor: '#6528FF',
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#6528FF',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  currentLocationCtaText: {
    color: '#6528FF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 4
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10
  },
  selectorChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  selectorChipActive: {
    backgroundColor: '#FFF8E1',
    borderColor: '#EDB422'
  },
  selectorChipText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600'
  },
  selectorChipTextActive: {
    color: '#EDB422',
    fontWeight: '800'
  }
});