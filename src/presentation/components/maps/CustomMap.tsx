import React, { useEffect, useRef, useState } from 'react';
import { View, ViewProps, StyleSheet, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';

import { LatLng } from '@/core/entities/lat-lng.entity';
import { useLocationStore } from '@/presentation/store/useLocationStore';
import FAB from '@/presentation/components/shared/FAB';

interface Props extends ViewProps {
  initialLocation: LatLng;
  showUserLocation?: boolean;
}

const CustomMap = ({ initialLocation, showUserLocation = true, ...rest }: Props) => {
  const mapRef = useRef<MapView>(null);
  const [isFollowingUser, setFollowingUser] = useState(true);
  
  const router = useRouter();
  const navigation = useNavigation();

  const { 
    watchLocation, 
    clearWatchLocation, 
    lastKnowLocation, 
    getLocation, 
    userLocationList 
  } = useLocationStore();

  // Suscribirse al movimiento del GPS
  useEffect(() => {
    watchLocation();
    return () => {
      clearWatchLocation();
    };
  }, []);

  // Seguir al usuario si la opción está activa
  useEffect(() => {
    if (lastKnowLocation && isFollowingUser) {
      moveCameraToLocation(lastKnowLocation);
    }
  }, [lastKnowLocation, isFollowingUser]);

  const moveCameraToLocation = (latLng: LatLng) => {
    if (!mapRef.current) return;
    mapRef.current.animateCamera({
      center: latLng,
    });
  };

  const moveToCurrentLocation = async () => {
    if (!lastKnowLocation) return;
    moveCameraToLocation(lastKnowLocation);
    setFollowingUser(true);
  };

  const handleBack = () => {
    // Evita el error "GO_BACK was not handled"
    if (navigation.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <View style={styles.container} {...rest}>
      <MapView
        ref={mapRef}
        showsUserLocation={showUserLocation}
        style={styles.map}
        onTouchStart={() => setFollowingUser(false)} // Deja de seguir si el usuario mueve el mapa
        initialRegion={{
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.0121,
        }}
      >
        {/* Marcador de ubicación inicial / Destino */}
        <Marker
          coordinate={initialLocation}
          title="Punto de inicio"
          description="Este es tu punto de partida"
        />

        {/* Línea de recorrido del usuario */}
        <Polyline
          coordinates={userLocationList}
          strokeColor={'#6200EE'} // Un morado más profesional
          strokeWidth={5}
        />
      </MapView>

      {/* BOTÓN DE ATRÁS INTELIGENTE */}
      <TouchableOpacity
        onPress={handleBack}
        style={styles.backButton}
        activeOpacity={0.8}
      >
        <Ionicons name='chevron-back-outline' size={28} color='#000' />
      </TouchableOpacity>

      {/* BOTÓN: CENTRAR Y SEGUIR */}
      <FAB
        iconName='compass-outline'
        onPress={moveToCurrentLocation}
        style={{ bottom: 20, right: 20 }}
      />

      {/* BOTÓN: ESTADO DE SEGUIMIENTO */}
      <FAB
        iconName={isFollowingUser ? 'eye-outline' : 'eye-off-outline'}
        onPress={() => setFollowingUser(!isFollowingUser)}
        style={{ bottom: 90, right: 20 }}
      />
    </View>
  );
};

export default CustomMap;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 50, 
    left: 20,
    backgroundColor: 'white',
    borderRadius: 30,
    padding: 10,
    
    // Optimización para Android (Evita que el mapa bloquee el clic)
    elevation: 10,
    zIndex: 999,
    
    // Sombra para iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  }
});