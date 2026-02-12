import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

// Definimos la estructura de un punto de coordenada
interface LatLng {
  latitude: number;
  longitude: number;
}

interface Props {
  origin: LatLng;
  destination: LatLng;
  distanceKm: string;
  routePolyline?: LatLng[]; // <--- CAMBIO 1: Nueva propiedad opcional
}

export const DeliveryMap = ({ origin, destination, distanceKm, routePolyline }: Props) => {
  const mapRef = useRef<MapView>(null);

  // Decidimos qué puntos dibujar: la ruta real o la línea recta de respaldo
  const polylineCoordinates = (routePolyline && routePolyline.length > 0) 
    ? routePolyline 
    : [origin, destination];

  useEffect(() => {
    if (mapRef.current) {
      // Ajustamos la cámara para que se vean todos los puntos del camino
      mapRef.current.fitToCoordinates(polylineCoordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [origin, destination, routePolyline]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={true}
        rotateEnabled={true}
        initialRegion={{
          latitude: origin.latitude,
          longitude: origin.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker coordinate={origin} title="Tú">
          <View style={styles.markerContainer}>
            <Ionicons name="person" size={15} color="white" />
          </View>
        </Marker>

        <Marker coordinate={destination} title="Tienda">
          <View style={[styles.markerContainer, { backgroundColor: '#FF3B30' }]}>
            <Ionicons name="restaurant" size={15} color="white" />
          </View>
        </Marker>

        {/* --- CAMBIO 2: Ahora recibe las coordenadas dinámicas --- */}
        <Polyline
          coordinates={polylineCoordinates}
          strokeColor="#6200EE"
          strokeWidth={5} // Un poco más gruesa para que se vea mejor en las calles
          lineCap="round" // Hace que las uniones de las calles se vean suaves
        />
      </MapView>

      <View style={styles.distanceBadge}>
        <Text style={styles.distanceText}>📏 {distanceKm}</Text>
      </View>
    </View>
  );
};

// ... estilos se mantienen igual
const styles = StyleSheet.create({
  container: {
    height: 250,
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    backgroundColor: '#007AFF',
    padding: 5,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white'
  },
  distanceBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    elevation: 3
  },
  distanceText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333'
  }
});