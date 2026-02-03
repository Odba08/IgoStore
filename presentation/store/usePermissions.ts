import { create } from 'zustand';
import { PermissionStatus } from '@/infrastructure/interfaces/location';
import {
  checkLocationPermission,
  requestLocationPermission,
} from '@/core/actions/permissions/location';

// 1. La Interfaz define la estructura
interface PermissionsState {
  locationStatus: PermissionStatus;
  userLocation?: { latitude: number; longitude: number }; // Opcional aquí es válido

  requestLocationPermission: () => Promise<PermissionStatus>;
  checkLocationPermission: () => Promise<PermissionStatus>;
  getLocation: () => Promise<void>; // Añadimos la definición de la función
}

// 2. El Store implementa los valores iniciales y funciones
export const usePermissionsStore = create<PermissionsState>()((set) => ({
  locationStatus: PermissionStatus.CHECKING,
  userLocation: undefined, // Valor inicial

  getLocation: async () => {
    // Por ahora simularemos la respuesta para que no te dé error
    // Luego crearemos el action real 'getCurrentLocation'
    const mockLocation = { latitude: 10.6447, longitude: -71.6105 }; 
    set({ userLocation: mockLocation });
  },

  requestLocationPermission: async () => {
    const status = await requestLocationPermission();
    set({ locationStatus: status });
    return status;
  },

  checkLocationPermission: async () => {
    const status = await checkLocationPermission();
    set({ locationStatus: status });
    return status;
  },
}));