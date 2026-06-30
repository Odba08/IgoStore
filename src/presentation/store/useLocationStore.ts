import { create } from 'zustand';
import { LocationSubscription } from "expo-location";

// La interfaz ahora es una Entidad del Core
import { LatLng } from "@/core/entities/lat-lng.entity";

// Las acciones de GPS son Infraestructura
import { getCurrentLocation, watchCurrentPosition } from "@/infrastructure/actions/location/location";

// ⚡ ENTIDAD EXTENDIDA: Estructura para puntos viales con dirección legible
export interface LocationPoint extends LatLng {
  address: string;
}

interface LocationState {
  lastKnowLocation: LatLng | null;
  userLocationList: LatLng[];
  watchSubscription: LocationSubscription | null;

  // ⚡ NUEVOS CASILLEROS CARDINALES
  pickupLocation: LocationPoint | null;   // Punto A: Recogida (Sede/Tienda)
  deliveryLocation: LocationPoint | null; // Punto B: Entrega (Cliente)

  getLocation: () => Promise<LatLng>;
  watchLocation: () => void;
  clearWatchLocation: () => void;

  // ⚡ NUEVAS ACCIONES MUTATORIAS EN TIEMPO DE EJECUCIÓN
  setPickupLocation: (location: LocationPoint | null) => void;
  setDeliveryLocation: (location: LocationPoint | null) => void;
}

export const useLocationStore = create<LocationState>()((set, get) => ({

  lastKnowLocation: null,
  userLocationList: [],
  watchSubscription: null,

  // Estados iniciales aislados
  pickupLocation: null,
  deliveryLocation: null,

  getLocation: async () => {
    const location = await getCurrentLocation();
    set({ lastKnowLocation: location });
    return location;
  },

  watchLocation: async () => {
    const oldSubscription = get().watchSubscription;

    if (oldSubscription !== null) {
      get().clearWatchLocation();
    }

    const watchSubscription = await watchCurrentPosition(
      (latLng) => {
        set({
          lastKnowLocation: latLng,
          userLocationList: [...get().userLocationList, latLng]
        });
      }
    );

    set({ watchSubscription: watchSubscription });
  },

  clearWatchLocation: () => {
    const subscription = get().watchSubscription;

    if (subscription !== null) {
      subscription.remove();
    }
  },

  // ⚡ IMPLEMENTACIÓN DE SETTERS PARA MANEJO DE PASO DE DATOS
  setPickupLocation: (location) => set({ pickupLocation: location }),
  setDeliveryLocation: (location) => set({ deliveryLocation: location })
}));