import React, { useState, useEffect, useRef } from 'react';
import { 
  ActivityIndicator, View, StyleSheet, Text, TextInput, 
  TouchableOpacity, FlatList, Dimensions, Platform, Keyboard 
} from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router'; // ⚡ MODIFICADO: Añadido useLocalSearchParams
import { useLocationStore } from '@/presentation/store/useLocationStore';
import * as Location from 'expo-location';
import { goBack } from 'expo-router/build/global-state/routing';

const { width, height } = Dimensions.get('window');

const MapScreen = () => {
  const router = useRouter();
  
  // ⚡ CAPTURA DINÁMICA: Detectamos si venimos a buscar Origen ('pickup') o Destino ('delivery')
  const { mode } = useLocalSearchParams();
  
  const mapRef = useRef<MapView>(null);
  const debounceTimeout = useRef<any>(null);
  
  // Extraemos las nuevas acciones estrictas de tu Store
  const { 
    lastKnowLocation, 
    getLocation,
    setPickupLocation,
    setDeliveryLocation
  } = useLocationStore();

  const [address, setAddress] = useState('Mueve el mapa para seleccionar...');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [targetCoords, setTargetCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (lastKnowLocation === null) {
      getLocation();
    } else {
      setTargetCoords({
        latitude: lastKnowLocation.latitude,
        longitude: lastKnowLocation.longitude,
      });
    }
  }, [lastKnowLocation]);

  if (lastKnowLocation === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="black" />
      </View>
    );
  }

  const fetchGeocodeAddress = async (lat: number, lng: number) => {
    setLoadingAddress(true);
    try {
      const response = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (response && response.length > 0) {
        const place = response[0];
        const street = place.street || 'Calle sin nombre';
        const district = place.district || place.subregion || '';
        const city = place.city || '';
        
        const textLabel = `${street}, ${district} ${city}`.trim().replace(/^,|,$/, '');
        setAddress(textLabel || `Ubicación: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } else {
        setAddress(`Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch (error) {
      setAddress(`Ubicación: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleSearchTextChange = (text: string) => {
    setSearchQuery(text);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    debounceTimeout.current = setTimeout(() => {
      executeNetworkSearch(text);
    }, 600);
  };

  const executeNetworkSearch = async (text: string) => {
    if (text.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const query = `${text}, Maracaibo`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=-71.80,10.45,-71.50,10.80&bounded=1&addressdetails=1&limit=5`;
      
      const response = await fetch(url, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 IgoStoreApp/1.4'
        }
      });

      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType || !contentType.includes('json')) {
        setSearchResults([]);
        return;
      }

      const data = await response.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn('Error en búsqueda de lugares:', error);
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

    const newRegion = {
      latitude: lat,
      longitude: lon,
      latitudeDelta: 0.006,
      longitudeDelta: 0.006,
    };

    setTargetCoords({ latitude: lat, longitude: lon });
    setAddress(place.display_name);
    mapRef.current?.animateToRegion(newRegion, 1000);
  };

  const handleRegionChangeComplete = (newRegion: any) => {
    const centerPoint = {
      latitude: newRegion.latitude,
      longitude: newRegion.longitude
    };
    setTargetCoords(centerPoint);
    fetchGeocodeAddress(newRegion.latitude, newRegion.longitude);
  };

  // ⚡ 2. DESPACHO DE COORDENADAS SEGÚN EL MODO ACTIVO
  const handleConfirmSelection = () => {
    if (!targetCoords) return;
    
    const locationPayload = {
      latitude: targetCoords.latitude,
      longitude: targetCoords.longitude,
      address: address
    };

    // Filtro condicional de persistencia
    if (mode === 'pickup') {
      setPickupLocation(locationPayload);
    } else {
      setDeliveryLocation(locationPayload);
    }

    if (router.canGoBack()) {
      router.back(); 
    } else {
      router.push('/cart/cart'); 
    }
  };

  const recenterGps = async () => {
    const loc = await getLocation();
    if (loc) {
      mapRef.current?.animateToRegion({
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }, 800);
    }
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
      />

      {/* BARRA DE BÚSQUEDA FLOTANTE CON ADAPTACIÓN DE TEXTO */}
      <View style={styles.searchContainer}>
        <View style={styles.inputWrapper}>
          <Ionicons name="search" size={20} color="#666" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={mode === 'pickup' ? "Buscar local o sitio de recogida..." : "Buscar sector, avenida o calle de destino..."}
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearchTextChange}
          />
          {isSearching && <ActivityIndicator size="small" color="#EDB422" />}
        </View>

          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: 'white', padding: 10, borderRadius: 8, alignSelf: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 5 }} 
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push('/'); // Redirección segura si no hay historial
              }
            }}
          >
    <Ionicons name="arrow-back" size={24} color="#1A1A1A" /></TouchableOpacity>


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

      {/* ⚡ ALTERNANCIA DE COLOR DE PIN: Morado para Recogida, Rojo para Entrega */}
      <View style={styles.markerFixed} pointerEvents="none">
        <View style={styles.pinWrapper}>
          <Ionicons 
            name="location" 
            size={44} 
            color={mode === 'pickup' ? "#6200EE" : "#FF3B30"} 
            style={styles.pinIcon} 
          />
          <View style={styles.baseDot} />
        </View>
      </View>

      <TouchableOpacity style={styles.floatingGpsBtn} onPress={recenterGps} activeOpacity={0.8}>
        <Ionicons name="locate" size={24} color="#1a1a1a" />
      </TouchableOpacity>

      {/* PANEL INFERIOR CON TÍTULOS ASOCIADOS */}
      <View style={styles.bottomSheet}>
        <Text style={styles.sheetTitle}>
          {mode === 'pickup' ? "Punto A: Ubicación de Origen" : "Punto B: Ubicación de Envío"}
        </Text>
        <View style={styles.addressWrapper}>
          <Ionicons 
            name={mode === 'pickup' ? "business" : "navigate-circle"} 
            size={24} 
            color={mode === 'pickup' ? "#6200EE" : "#EDB422"} 
            style={{ marginRight: 10 }} 
          />
          {loadingAddress ? (
            <ActivityIndicator size="small" color="#EDB422" style={{ alignSelf: 'center' }} />
          ) : (
            <Text style={styles.addressLabel} numberOfLines={2}>{address}</Text>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.actionBtn, loadingAddress && styles.actionBtnDisabled]} 
          onPress={handleConfirmSelection}
          disabled={loadingAddress}
          activeOpacity={0.8}
        >
          <Text style={styles.actionBtnText}>
            {mode === 'pickup' ? "Confirmar Punto de Recogida" : "Confirmar Punto de Entrega"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MapScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  map: { width: width, height: height },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { position: 'absolute', top: Platform.OS === 'ios' ? 55 : 35, left: 15, right: 15, zIndex: 10 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 15, height: 50, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 6 },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
  resultsList: { backgroundColor: 'white', borderRadius: 12, marginTop: 5, maxHeight: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 6, overflow: 'hidden' },
  resultItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  resultText: { flex: 1, fontSize: 13, color: '#334155', fontWeight: '500' },
  markerFixed: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  pinWrapper: { alignItems: 'center', justifyContent: 'center', marginBottom: 44 },
  pinIcon: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 4 },
  baseDot: { width: 6, height: 4, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 3, marginTop: -2 },
  floatingGpsBtn: { position: 'absolute', bottom: 220, right: 20, backgroundColor: 'white', width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, elevation: 5 },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 35, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, elevation: 15 },
  sheetTitle: { fontSize: 13, color: '#888', fontWeight: '700', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 },
  addressWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 14, borderRadius: 14, marginBottom: 18, minHeight: 60, borderWidth: 1, borderColor: '#E2E8F0' },
  addressLabel: { flex: 1, fontSize: 14, color: '#1A1A1A', fontWeight: '500', lineHeight: 19 },
  actionBtn: { backgroundColor: '#FFDB58', height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', shadowColor: '#FFDB58', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, elevation: 3 },
  actionBtnDisabled: { backgroundColor: '#E2E8F0', shadowOpacity: 0 },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' }
});