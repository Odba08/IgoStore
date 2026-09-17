// ✅ CORRECCIÓN: Importamos desde la Entidad en el Core
import { LatLng } from '@/core/entities/lat-lng.entity';
import * as Location from 'expo-location';

const FALLBACK_COORDS: LatLng = { latitude: 10.6427, longitude: -71.6125 };

export const getCurrentLocation = async (): Promise<LatLng> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Permiso de ubicación denegado por el usuario.');
      return FALLBACK_COORDS;
    }

    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });

    return {
      latitude: coords.latitude,
      longitude: coords.longitude
    };

  } catch (error) {
    console.warn('Error al obtener ubicación:', error);
    return FALLBACK_COORDS;
  }
};

export const watchCurrentPosition = async (
  locationCallback: (location: LatLng) => void
) => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    return await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 2000,
        distanceInterval: 10
      },
      ({ coords }) => {
        locationCallback({
          latitude: coords.latitude,
          longitude: coords.longitude
        });
      }
    );
  } catch (error) {
    console.warn('Error en watchPosition:', error);
    return null;
  }
};