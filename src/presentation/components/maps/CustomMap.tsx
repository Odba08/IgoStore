import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Text, Keyboard, ActivityIndicator, FlatList, Linking } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation, useLocalSearchParams } from 'expo-router';

import { LatLng } from '@/core/entities/lat-lng.entity';
import { useLocationStore } from '@/presentation/store/useLocationStore';
import { useCartStore } from '@/presentation/store/useCartStore';
import FAB from '@/presentation/components/shared/FAB';
import * as ExpoLocation from 'expo-location';


interface Props {
  initialLocation: LatLng;
}

interface DeliveryInfo {
  distance: string;
  price: string;
  time: string;
}

const CustomMap = ({ initialLocation }: Props) => {
  const mapRef = useRef<MapView>(null);
  const router = useRouter();
  const navigation = useNavigation();
  const debounceTimeout = useRef<any>(null);
  
  // ⚡ STORES GLOBALES
  const { items, clearCart } = useCartStore();
  const { deliveryLocation, lastKnowLocation, watchLocation, clearWatchLocation } = useLocationStore();
  
  const { serviceType = 'store', personalData, addressNotes } = useLocalSearchParams();
  const isFavorMode = serviceType === 'favor';
  const isCheckoutMode = items.length > 0 && !isFavorMode;

  // ⚡ PRIORIDAD DE UBICACIÓN: Si vienes del carrito con una dirección guardada, se usa esa. Si no, usa el GPS.
  const startingLocation = deliveryLocation 
    ? { latitude: deliveryLocation.latitude, longitude: deliveryLocation.longitude } 
    : initialLocation;

  const [isFollowingUser, setFollowingUser] = useState(!isCheckoutMode);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<any | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng>(startingLocation);
  
  const [favorOrigin, setFavorOrigin] = useState<LatLng>(initialLocation);
  const [favorDestination, setFavorDestination] = useState<LatLng>({ latitude: initialLocation.latitude + 0.005, longitude: initialLocation.longitude + 0.005 });
  const [activeFavorPin, setActiveFavorPin] = useState<'origin' | 'destination'>('origin');
  const [networkResults, setNetworkResults] = useState<any[]>([]);
  const [isSearchingNetwork, setIsSearchingNetwork] = useState(false);

  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<LatLng[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  useEffect(() => {
    // Si no estamos en checkout, seguimos el GPS
    if (!isCheckoutMode) watchLocation();

    if (!isFavorMode) {
        const fetchBusinesses = async () => {
            try {
                const rawUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.200.38.48:3000';
                const baseUrl = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;
                let response = await fetch(`${baseUrl}/business`).catch(() => null);
                if (!response || !response.ok) response = await fetch(`${baseUrl}/bussines`);

                if (response && response.ok) {
                    const data = await response.json();
                    const list = Array.isArray(data) ? data : (data.data || data.items || []);
                    setBusinesses(list);

                    if (isCheckoutMode) {
                        // Usamos 'as any' para bypasear la restricción del compilador manteniendo la seguridad defensiva
                        const firstItem = items[0] as any;
                        const targetBizId = firstItem.businessId || firstItem.business_id;
                        const targetBiz = list.find((b: any) => b.id === targetBizId);
                        if (targetBiz) {
                            handleSelectBusiness(targetBiz, startingLocation);
                            return; // Rompemos aquí para que no haga el auto-encuadre general
                        }
                    }

                    // Auto-encuadre general (solo si no es checkout)
                    const validBusinesses = list.filter((b: any) => b.latitude && b.longitude);
                    if (validBusinesses.length > 0 && mapRef.current) {
                        const coords = validBusinesses.map((b: any) => ({ latitude: Number(b.latitude), longitude: Number(b.longitude) }));
                        coords.push(initialLocation);
                        setTimeout(() => mapRef.current?.fitToCoordinates(coords, { edgePadding: { top: 120, right: 50, bottom: 50, left: 50 }, animated: true }), 1000);
                    }
                }
            } catch (error) { console.error("Error red:", error); }
        };
        fetchBusinesses();
    }
    return () => clearWatchLocation();
  }, [isFavorMode]);

  useEffect(() => {
    if (searchQuery.length === 0) {
        if (!isFavorMode && !isCheckoutMode) handleResetSelection();
        setNetworkResults([]);
        return;
    }
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
        if (isFavorMode) executeNetworkSearch(searchQuery);
        else performLocalBusinessSearch();
    }, 600);
  }, [searchQuery, isFavorMode]);

  const handleResetSelection = () => {
      setSelectedBusiness(null); setDeliveryInfo(null); setRouteCoordinates([]);
  };

  const performLocalBusinessSearch = () => {
    const matches = businesses.filter(biz => biz.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    if (matches.length > 0 && mapRef.current) {
        Keyboard.dismiss(); setFollowingUser(false);
        if (matches.length === 1) handleSelectBusiness(matches[0]);
        else {
            const coordinates = matches.map(biz => ({ latitude: Number(biz.latitude), longitude: Number(biz.longitude) }));
            mapRef.current.fitToCoordinates(coordinates, { edgePadding: { top: 100, right: 50, bottom: 50, left: 50 }, animated: true });
        }
    }
  };

  const executeNetworkSearch = async (text: string) => {
    if (text.trim().length < 3) return setNetworkResults([]);
    setIsSearchingNetwork(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text + ', Maracaibo')}&viewbox=-71.80,10.45,-71.50,10.80&bounded=1&addressdetails=1&limit=5`;
      const response = await fetch(url, { headers: { 'User-Agent': 'IgoStoreApp/1.4' } });
      const data = await response.json();
      setNetworkResults(Array.isArray(data) ? data : []);
    } catch (error) { setNetworkResults([]); } finally { setIsSearchingNetwork(false); }
  };

  const handleSelectNetworkPlace = (place: any) => {
    Keyboard.dismiss(); setNetworkResults([]); setSearchQuery(place.display_name.split(',')[0]);
    const coords = { latitude: parseFloat(place.lat), longitude: parseFloat(place.lon) };
    if (activeFavorPin === 'origin') setFavorOrigin(coords); else setFavorDestination(coords);
    setRouteCoordinates([]);
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.006, longitudeDelta: 0.006 }, 1000);
  };

  const fetchRoute = async (start: LatLng, end: LatLng) => {
    setIsLoadingRoute(true);
    try {
        const url = `http://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
            const points = data.routes[0].geometry.coordinates.map((c: number[]) => ({ latitude: c[1], longitude: c[0] }));
            setRouteCoordinates(points);
            calculateDeliveryCost(data.routes[0].distance / 1000, Math.ceil(data.routes[0].duration / 60) + 5);
        }
    } catch (error) { console.error(error); } finally { setIsLoadingRoute(false); }
  };

  const calculateDeliveryCost = (distKm: number, timeMin: number) => {
      let price = 3.00 + (distKm > 3 ? (distKm - 3) * 1.00 : 0);
      setDeliveryInfo({ distance: distKm.toFixed(1), price: price.toFixed(2), time: `${timeMin} min` });
  };

  const handleSelectBusiness = (biz: any, customUserLoc?: LatLng) => {
    const loc = customUserLoc || userLocation;
    setSelectedBusiness(biz); setFollowingUser(false);
    const bizLoc = { latitude: Number(biz.latitude), longitude: Number(biz.longitude) };
    
    setTimeout(() => {
        mapRef.current?.fitToCoordinates([ loc, bizLoc ], { edgePadding: { top: 150, right: 50, bottom: 350, left: 50 }, animated: true });
    }, 500);
    
    fetchRoute(loc, bizLoc);
  };

  const handleBack = () => {
    if (isCheckoutMode) router.back();
    else if (selectedBusiness || routeCoordinates.length > 0) { handleResetSelection(); setSearchQuery(''); } 
    else if (navigation.canGoBack()) router.back();
    else router.replace('/'); 
  };

  // ⚡ DESPACHO A WHATSAPP
  const dispatchWhatsAppOrder = () => {
    if (!selectedBusiness || !deliveryInfo) return;
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const mapsUrlTienda = `https://www.google.com/maps/search/?api=1&query=${selectedBusiness.latitude},${selectedBusiness.longitude}`;
    const mapsUrlCliente = `https://www.google.com/maps/search/?api=1&query=${userLocation.latitude},${userLocation.longitude}`;
    
    let message = `*🍔 NUEVO PEDIDO - IGO STORE* 🛒\n---------------------------------------\n*📦 DETALLE DEL PEDIDO:*\n`;
    items.forEach((item: any) => { message += `▪️ ${item.quantity}x ${item.title.split(' (')[0]}\n`; });
    
    message += `\n👤 *CLIENTE:* ${String(personalData || 'Cliente Igo').trim()}\n📝 *REF:* ${String(addressNotes || 'Sin notas').trim()}\n\n`;
    message += `*🏢 RECOGIDA (PUNTO A):*\n📍 GPS: ${mapsUrlTienda}\n\n`;
    message += `*📍 ENTREGA (PUNTO B):*\n🏠 Dirección: ${deliveryLocation?.address || 'Ubicación en Mapa'}\n🗺️ GPS: ${mapsUrlCliente}\n---------------------------------------\n`;
    message += `💰 *SUBTOTAL:* $${subtotal.toFixed(2)}\n🛵 *DELIVERY (${deliveryInfo.distance}km):* $${deliveryInfo.price}\n`;
    message += `⭐️ *TOTAL NETO A PAGAR:* $${(subtotal + parseFloat(deliveryInfo.price)).toFixed(2)}\n\n`;

    Linking.openURL(`https://wa.me/573014215155?text=${encodeURIComponent(message.trim())}`);
    clearCart();
    router.replace('/');
  };

  const filteredBusinesses = businesses.filter(biz => searchQuery === '' || biz.name?.toLowerCase().includes(searchQuery.toLowerCase()));


const handleUserMarkerDragEnd = async (coords: LatLng) => {
  setUserLocation(coords);
  
  // Geocodificar la nueva coordenada para actualizar el texto
  try {
    // ✅ Reemplazamos Location por ExpoLocation para corregir el error de TypeScript
    const response = await ExpoLocation.reverseGeocodeAsync({ 
      latitude: coords.latitude, 
      longitude: coords.longitude 
    });

    if (response && response.length > 0) {
      const place = response[0];
      const label = `${place.street || 'Calle sin nombre'}, ${place.district || place.subregion || ''} ${place.city || ''}`.trim().replace(/^,|,$/, '');
      
      // ✅ Sincronizamos con el store de Zustand para que WhatsApp lea la dirección correcta
      useLocationStore.getState().setDeliveryLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: label
      });
    }
  } catch (error) {
    console.warn("No se pudo geocodificar la coordenada arrastrada");
  }

  // Recalcular la ruta si ya hay un negocio seleccionado
  if (selectedBusiness) {
    fetchRoute(coords, { 
      latitude: Number(selectedBusiness.latitude), 
      longitude: Number(selectedBusiness.longitude) 
    });
  }
};

  return (
    <View style={styles.container}>
      {!isFavorMode && !isCheckoutMode && (
        <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={20} color="#888" />
            <TextInput placeholder="¿Qué local se te antoja?" style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
            {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); handleResetSelection(); setNetworkResults([]); }}>
                    <Ionicons name="close-circle" size={20} color="#888" />
                </TouchableOpacity>
            )}
        </View>
      )}

      {isFavorMode && (
        <View style={[styles.searchBarContainer, { top: 110 }]}>
            <Ionicons name="search" size={20} color="#888" />
            <TextInput placeholder={`Buscar dirección para el punto ${activeFavorPin === 'origin' ? 'A' : 'B'}...`} style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
            {isSearchingNetwork ? <ActivityIndicator size="small" color="#EDB422" style={{marginRight: 10}} /> : null}
            {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); handleResetSelection(); setNetworkResults([]); }}>
                    <Ionicons name="close-circle" size={20} color="#888" />
                </TouchableOpacity>
            )}
        </View>
      )}

      {isFavorMode && networkResults.length > 0 && (
        <View style={styles.networkResults}>
            <FlatList data={networkResults} keyExtractor={(item) => item.place_id.toString()} keyboardShouldPersistTaps="handled" renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectNetworkPlace(item)}>
                    <Ionicons name="location-outline" size={18} color="#EDB422" style={{ marginRight: 10 }} />
                    <Text style={{ flex: 1, fontSize: 13, color: '#333' }} numberOfLines={2}>{item.display_name}</Text>
                </TouchableOpacity>
            )} />
        </View>
      )}

      {isFavorMode && (
          <View style={styles.favorTabs}>
              <TouchableOpacity style={[styles.tabBtn, activeFavorPin === 'origin' && styles.tabActive]} onPress={() => setActiveFavorPin('origin')}>
                  <Text style={[styles.tabText, activeFavorPin === 'origin' && styles.tabTextActive]}>📍 Origen (A)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabBtn, activeFavorPin === 'destination' && styles.tabActive]} onPress={() => setActiveFavorPin('destination')}>
                  <Text style={[styles.tabText, activeFavorPin === 'destination' && styles.tabTextActive]}>🏁 Destino (B)</Text>
              </TouchableOpacity>
          </View>
      )}

      <MapView ref={mapRef} provider={PROVIDER_GOOGLE} style={styles.map} onTouchStart={() => setFollowingUser(false)} initialRegion={{ latitude: startingLocation.latitude, longitude: startingLocation.longitude, latitudeDelta: 0.015, longitudeDelta: 0.012 }}>
        {!isFavorMode && (
            <View>
                <Marker 
                    coordinate={userLocation} 
                    title="Tu entrega (Arrastra para afinar)" 
                    draggable 
                    onDragEnd={(e) => handleUserMarkerDragEnd(e.nativeEvent.coordinate)} 
                    zIndex={999}
                    >
                    <View style={styles.userMarker}>
                        <Ionicons name="home" size={16} color="white" />
                    </View>
                    </Marker>

                {filteredBusinesses.map((biz) => {
                    const lat = Number(biz.latitude), long = Number(biz.longitude);
                    if (isNaN(lat) || isNaN(long)) return null;
                    // En modo checkout, solo mostramos el negocio donde compró
                    if (isCheckoutMode && selectedBusiness?.id !== biz.id) return null;
                    
                    return (
                        <Marker key={biz.id} coordinate={{ latitude: lat, longitude: long }} title={biz.name} onPress={() => !isCheckoutMode && handleSelectBusiness(biz)}>
                            <View style={[styles.businessMarker, selectedBusiness?.id === biz.id && styles.selectedMarker]}>
                                <Ionicons name="storefront" size={16} color={selectedBusiness?.id === biz.id ? 'white' : '#1A1A1A'} />
                            </View>
                        </Marker>
                    );
                })}
            </View>
        )}

        {isFavorMode && (
            <View>
                <Marker coordinate={favorOrigin} title="Punto A (Origen)" draggable onDragEnd={(e) => { setFavorOrigin(e.nativeEvent.coordinate); setRouteCoordinates([]); }}>
                    <View style={[styles.userMarker, { backgroundColor: '#1A1A1A' }]}><Text style={{color:'white', fontWeight:'bold'}}>A</Text></View>
                </Marker>
                <Marker coordinate={favorDestination} title="Punto B (Destino)" draggable onDragEnd={(e) => { setFavorDestination(e.nativeEvent.coordinate); setRouteCoordinates([]); }}>
                    <View style={styles.userMarker}><Text style={{color:'white', fontWeight:'bold'}}>B</Text></View>
                </Marker>
            </View>
        )}

        {routeCoordinates.length > 0 && <Polyline coordinates={routeCoordinates} strokeColor="#1A1A1A" strokeWidth={4} />}
      </MapView>

      <TouchableOpacity onPress={handleBack} style={styles.backButton}><Ionicons name='chevron-back-outline' size={28} color='#000' /></TouchableOpacity>

      {!isFavorMode && selectedBusiness && deliveryInfo && (
        <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
                <Text style={styles.bizName}>{isCheckoutMode ? "Resumen de Envío" : selectedBusiness.name}</Text>
                {!isCheckoutMode && <View style={styles.ratingBadge}><Text style={styles.ratingText}>⭐ 4.8</Text></View>}
            </View>
            <View style={styles.divider} />
            <View style={styles.statsRow}>
                <View style={styles.statItem}><Text style={styles.statLabel}>Distancia</Text>{isLoadingRoute ? <ActivityIndicator size="small" /> : <Text style={styles.statValue}>{deliveryInfo.distance} km</Text>}</View>
                <View style={styles.statItem}><Text style={styles.statLabel}>Delivery</Text><Text style={styles.priceValue}>${deliveryInfo.price}</Text></View>
            </View>
            
            {/* ⚡ BOTÓN CONDICIONAL: WHATSAPP VS VER MENÚ */}
            {isCheckoutMode ? (
                <TouchableOpacity style={[styles.orderButton, { backgroundColor: '#25D366' }]} onPress={dispatchWhatsAppOrder}>
                    <Ionicons name="logo-whatsapp" size={20} color="white" style={{ marginRight: 10 }} />
                    <Text style={styles.orderButtonText}>Confirmar por WhatsApp</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity style={styles.orderButton} onPress={() => router.push({ pathname: '/business/[id]', params: { id: selectedBusiness.id } })}>
                    <Text style={styles.orderButtonText}>Ver Menú</Text>
                </TouchableOpacity>
            )}
        </View>
      )}

      {isFavorMode && (
          <View style={styles.infoCard}>
              <Text style={styles.bizName}>Cotizar Igo Favor</Text>
              {deliveryInfo && !isLoadingRoute && (
                  <View>
                      <View style={styles.divider} />
                      <View style={styles.statsRow}>
                          <View style={styles.statItem}><Text style={styles.statLabel}>Distancia</Text><Text style={styles.statValue}>{deliveryInfo.distance} km</Text></View>
                          <View style={styles.statItem}><Text style={styles.statLabel}>Costo</Text><Text style={styles.priceValue}>${deliveryInfo.price}</Text></View>
                      </View>
                      <TouchableOpacity style={[styles.orderButton, { backgroundColor: '#FFDB58' }]}><Text style={[styles.orderButtonText, { color: '#000' }]}>Solicitar Favor</Text></TouchableOpacity>
                  </View>
              )}
              {(!deliveryInfo || isLoadingRoute) && (
                  <TouchableOpacity style={[styles.orderButton, { marginTop: 15 }]} onPress={() => fetchRoute(favorOrigin, favorDestination)}>
                      {isLoadingRoute ? <ActivityIndicator color="white" /> : <Text style={styles.orderButtonText}>Trazar Ruta</Text>}
                  </TouchableOpacity>
              )}
          </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  searchBarContainer: { position: 'absolute', top: 50, left: 60, right: 20, backgroundColor: 'white', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 48, zIndex: 10, elevation: 5 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14 },
  backButton: { position: 'absolute', top: 50, left: 10, backgroundColor: 'white', borderRadius: 30, padding: 8, zIndex: 10, elevation: 5 },
  userMarker: { width: 34, height: 34, backgroundColor: '#FF3B30', borderRadius: 17, borderWidth: 3, borderColor: 'white', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  businessMarker: { backgroundColor: '#FFDB58', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: 'white', elevation: 4 },
  selectedMarker: { backgroundColor: '#1A1A1A', transform: [{ scale: 1.15 }] },
  favorTabs: { position: 'absolute', top: 170, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
  tabBtn: { flex: 0.48, backgroundColor: 'white', paddingVertical: 10, borderRadius: 10, alignItems: 'center', elevation: 3 },
  tabActive: { backgroundColor: '#1A1A1A' },
  tabText: { fontWeight: 'bold', color: '#666' },
  tabTextActive: { color: 'white' },
  networkResults: { position: 'absolute', top: 165, left: 20, right: 20, backgroundColor: 'white', borderRadius: 12, maxHeight: 200, zIndex: 20, elevation: 6 },
  resultItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  infoCard: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 10 },
  infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bizName: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  ratingBadge: { backgroundColor: '#FFF0E6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingText: { fontWeight: 'bold', fontSize: 12, color: '#FF7A00' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 15 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, paddingHorizontal: 10 },
  statItem: { alignItems: 'center' },
  statLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
  statValue: { fontWeight: '700', fontSize: 16, color: '#1A1A1A' },
  priceValue: { fontWeight: '900', fontSize: 18, color: '#27AE60' }, 
  orderButton: { backgroundColor: '#1A1A1A', borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  orderButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default CustomMap;