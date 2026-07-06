import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Text, Keyboard, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';

import { LatLng } from '@/core/entities/lat-lng.entity';
import { useLocationStore } from '@/presentation/store/useLocationStore';
import FAB from '@/presentation/components/shared/FAB';

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
  
  const [isFollowingUser, setFollowingUser] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [businesses, setBusinesses] = useState<any[]>([]);
  
  const [selectedBusiness, setSelectedBusiness] = useState<any | null>(null);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  
  // 1. NUEVO ESTADO: Coordenadas de la calle (no línea recta)
  const [routeCoordinates, setRouteCoordinates] = useState<LatLng[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  const { lastKnowLocation, watchLocation, clearWatchLocation } = useLocationStore();

  useEffect(() => {
    watchLocation();
    const fetchBusinesses = async () => {
        try {
            const rawUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.200.38.48:3000';
            const baseUrl = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;
            const endpoint = 'business'; 
            const response = await fetch(`${baseUrl}/${endpoint}`);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) setBusinesses(data);
            }
        } catch (error) {
            console.error("Error conexión:", error);
        }
    };
    fetchBusinesses();
    return () => clearWatchLocation();
  }, []);

  useEffect(() => {
    if (searchQuery.length === 0) {
        handleResetSelection();
        return;
    }
    const timer = setTimeout(() => performSearch(), 800);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleResetSelection = () => {
      setSelectedBusiness(null);
      setDeliveryInfo(null);
      setRouteCoordinates([]); // Limpiamos la ruta
  };

  // --- 2. NUEVA FUNCIÓN: OBTENER RUTA REAL (OSRM) ---
  const fetchRoute = async (start: LatLng, end: {latitude: number, longitude: number}) => {
    setIsLoadingRoute(true);
    try {
        const url = `http://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            
            const points = route.geometry.coordinates.map((coord: number[]) => ({
                latitude: coord[1],
                longitude: coord[0]
            }));
            setRouteCoordinates(points);

            const distKm = route.distance / 1000;      
            const travelTimeSeconds = route.duration;  
            
            // --- CAMBIO AQUÍ: QUITAMOS LOS 15 MINUTOS ---
            const travelTimeMin = Math.ceil(travelTimeSeconds / 60);
            
            // Solo dejamos 5 min de margen (estacionar, subir ascensor, etc.)
            const totalTimeMin = travelTimeMin + 5; 

            calculateDeliveryCost(distKm, totalTimeMin);

        } else {
            setRouteCoordinates([start, end]); 
            calculateHaversineFallback(start, end);
        }
    } catch (error) {
        console.error("Error calculando ruta:", error);
        setRouteCoordinates([start, end]);
        calculateHaversineFallback(start, end);
    } finally {
        setIsLoadingRoute(false);
    }
  };

  const calculateDeliveryCost = (distKm: number, realTimeMin?: number) => {
      let price = 3.00;
      if (distKm > 3) {
          price += (distKm - 3) * 1.00;
      }
      
      // Si OSRM nos dio tiempo, lo usamos.
      // Si no, usamos: (4 min por km) + (5 min de margen)
      const timeString = realTimeMin 
        ? `${realTimeMin} min` 
        : `${Math.ceil(distKm * 4 + 5)} min`; // <--- AQUÍ QUITAMOS EL 15

      setDeliveryInfo({
          distance: distKm.toFixed(1),
          price: price.toFixed(2),
          time: timeString
      });
  };

  const calculateHaversineFallback = (start: LatLng, end: any) => {
    const R = 6371; 
    const dLat = (end.latitude - start.latitude) * (Math.PI / 180);
    const dLon = (end.longitude - start.longitude) * (Math.PI / 180);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(start.latitude * (Math.PI/180)) * Math.cos(end.latitude * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distKm = (R * c) * 1.2; // +20% margen error
    calculateDeliveryCost(distKm);
  };

  const performSearch = () => {
    const matches = businesses.filter(biz => 
        biz.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (matches.length > 0 && mapRef.current) {
        Keyboard.dismiss();
        setFollowingUser(false);
        if (matches.length === 1) {
            handleSelectBusiness(matches[0]);
        } else {
            const coordinates = matches.map(biz => ({
                latitude: Number(biz.latitude), longitude: Number(biz.longitude)
            }));
            mapRef.current.fitToCoordinates(coordinates, {
                edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
                animated: true,
            });
        }
    }
  };

  const handleSelectBusiness = (biz: any) => {
    if (!lastKnowLocation) return;
    
    setSelectedBusiness(biz);
    setFollowingUser(false);

    const bizLocation = { latitude: Number(biz.latitude), longitude: Number(biz.longitude) };

    // Movemos la cámara
    mapRef.current?.fitToCoordinates([ lastKnowLocation, bizLocation ], {
        edgePadding: { top: 150, right: 50, bottom: 250, left: 50 },
        animated: true,
    });

    // LLAMAMOS A LA RUTA REAL
    fetchRoute(lastKnowLocation, bizLocation);
  };

  const handleBack = () => {
    if (selectedBusiness) {
        handleResetSelection();
        setSearchQuery('');
    } else if (navigation.canGoBack()) {
        router.back();
    } else {
        router.replace('/'); 
    }
  };

  const filteredBusinesses = businesses.filter(biz => 
      searchQuery === '' || biz.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={20} color="#888" />
        <TextInput
          placeholder="¿Qué se te antoja?"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); handleResetSelection(); }}>
                <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
        )}
      </View>

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        onTouchStart={() => setFollowingUser(false)}
        initialRegion={{
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.012,
        }}
      >
        {/* TU UBICACIÓN (Ahora Roja y con Ícono) */}
        {lastKnowLocation && (
          <Marker coordinate={lastKnowLocation} title="Tú" zIndex={999}>
             <View style={styles.userMarker}>
                {/* Ícono del puntero de ubicación, en blanco para contrastar con el fondo rojo */}
                <Ionicons name="location" size={18} color="white" />
             </View>
          </Marker>
        )}

        {filteredBusinesses.map((biz) => {
            const lat = Number(biz.latitude);
            const long = Number(biz.longitude);
            if (isNaN(lat) || isNaN(long)) return null;

            return (
                <Marker
                    key={biz.id}
                    coordinate={{ latitude: lat, longitude: long }}
                    title={biz.name}
                    onPress={() => handleSelectBusiness(biz)}
                >
                    <View style={[
                        styles.businessMarker,
                        selectedBusiness?.id === biz.id && styles.selectedMarker
                    ]}>
                        <Ionicons name="restaurant" size={14} color="white" />
                    </View>
                </Marker>
            );
        })}

        {/* --- 3. POLYLINE ACTUALIZADA (Sigue las calles) --- */}
        {selectedBusiness && routeCoordinates.length > 0 && (
            <Polyline 
                coordinates={routeCoordinates} // Usamos los puntos de OSRM
                strokeColor="#6200EE"
                strokeWidth={4}
            />
        )}
      </MapView>

      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <Ionicons name='chevron-back-outline' size={28} color='#000' />
      </TouchableOpacity>

      {selectedBusiness && deliveryInfo && (
        <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
                <Text style={styles.bizName}>{selectedBusiness.name}</Text>
                <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>⭐ 4.8</Text>
                </View>
            </View>
            
            <View style={styles.divider} />

            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Distancia</Text>
                    {/* Indicador de carga si aún calcula la ruta */}
                    {isLoadingRoute ? (
                        <ActivityIndicator size="small" color="#6200EE" />
                    ) : (
                        <Text style={styles.statValue}>{deliveryInfo.distance} km</Text>
                    )}
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Tiempo</Text>
                    <Text style={styles.statValue}>{deliveryInfo.time}</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Delivery</Text>
                    <Text style={styles.priceValue}>${deliveryInfo.price}</Text>
                </View>
            </View>

            {/* --- 4. BOTÓN "VER MENÚ" CON NAVEGACIÓN --- */}
            <TouchableOpacity 
                style={styles.orderButton}
                onPress={() => {
                    // Navegamos pasando el ID del negocio
                    // Asegúrate de que tu ruta sea correcta. Ejemplo: /products/[id] o similar.
                    // Aquí envío el ID como parámetro query o de ruta.
                    router.push({
                        pathname: '/business/[id]', // O la ruta donde muestras los productos
                        params: { id: selectedBusiness.id } 
                    });
                }}
            >
                <Text style={styles.orderButtonText}>Ver Menú</Text>
            </TouchableOpacity>
        </View>
      )}

      {!selectedBusiness && (
          <FAB
            iconName='compass-outline'
            onPress={() => {
                setFollowingUser(true);
                if(lastKnowLocation) mapRef.current?.animateCamera({center: lastKnowLocation});
            }}
            style={{ bottom: 20, right: 20 }}
          />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  searchBarContainer: {
    position: 'absolute', top: 100, left: 20, right: 20,
    backgroundColor: 'white', borderRadius: 15, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 15, height: 45, zIndex: 10,
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  backButton: {
    position: 'absolute', top: 45, left: 20,
    backgroundColor: 'white', borderRadius: 30, padding: 8,
    zIndex: 10, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4,
  },
 userMarker: {
    width: 30,  // Más grande para que se vea bien
    height: 30,
    backgroundColor: '#FF3B30', // <--- ROJO (Antes era #007AFF azul)
    borderRadius: 15,
    borderWidth: 3, 
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    // Sombra para que flote
    shadowColor: '#000', 
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  businessMarker: {
    backgroundColor: '#FF3B30', padding: 6, borderRadius: 20,
    borderWidth: 2, borderColor: 'white',
  },
  selectedMarker: {
    backgroundColor: '#6200EE',
    transform: [{ scale: 1.2 }]
  },
  infoCard: {
    position: 'absolute', bottom: 30, left: 20, right: 20,
    backgroundColor: 'white', borderRadius: 20, padding: 20,
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10,
  },
  infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bizName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  ratingBadge: { backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  ratingText: { fontWeight: 'bold', fontSize: 12 },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 15 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statItem: { alignItems: 'center' },
  statLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
  statValue: { fontWeight: '600', fontSize: 16, color: '#333' },
  priceValue: { fontWeight: 'bold', fontSize: 16, color: '#4CAF50' }, 
  orderButton: {
    backgroundColor: '#000', borderRadius: 12, paddingVertical: 12, alignItems: 'center'
  },
  orderButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default CustomMap;