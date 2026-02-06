import { create } from 'zustand';
// CORRECCIÓN 1: La interfaz ahora está en Core Entities
import { PermissionStatus } from '@/core/entities/location.entity'; 

// CORRECCIÓN 2: Las acciones ahora están en Infrastructure
import {
  checkLocationPermission,
  requestLocationPermission,
} from '@/infrastructure/actions/permissions/location'; 

interface PermissionsState {
  locationStatus: PermissionStatus;
  userLocation?: { latitude: number; longitude: number };

  requestLocationPermission: () => Promise<PermissionStatus>;
  checkLocationPermission: () => Promise<PermissionStatus>;
  getLocation: () => Promise<void>;
}

export const usePermissionsStore = create<PermissionsState>()((set) => ({
  locationStatus: PermissionStatus.CHECKING,
  userLocation: undefined,

  getLocation: async () => {
    // Mock temporal para probar sin GPS real todavía
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