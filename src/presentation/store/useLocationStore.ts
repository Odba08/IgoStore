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

// ✅ INTERFAZ DE DIRECCIÓN GUARDADA (Extiende de LocationPoint agregando ID y Etiqueta)
export interface SavedAddress extends LocationPoint {
  id: string;
  label: string;
}

interface LocationState {
  lastKnowLocation: LatLng | null;
  userLocationList: LatLng[];
  watchSubscription: LocationSubscription | null;

  // ⚡ CASILLEROS CARDINALES
  pickupLocation: LocationPoint | null;   // Punto A: Recogida (Sede/Tienda)
  deliveryLocation: LocationPoint | null; // Punto B: Entrega (Cliente)
  
  // ✅ LIBRETA DE DIRECCIONES GLOBALES
  savedAddresses: SavedAddress[];

  getLocation: () => Promise<LatLng>;
  watchLocation: () => void;
  clearWatchLocation: () => void;

  // ⚡ ACCIONES MUTATORIAS EN TIEMPO DE EJECUCIÓN
  setPickupLocation: (location: LocationPoint | null) => void;
  setDeliveryLocation: (location: LocationPoint | null) => void;
  
  // ✅ NUEVAS ACCIONES PARA LA LIBRETA DE DIRECCIONES
  addSavedAddress: (address: Omit<SavedAddress, 'id'>) => void;
  removeSavedAddress: (id: string) => void;
}

export const useLocationStore = create<LocationState>()((set, get) => ({

  lastKnowLocation: null,
  userLocationList: [],
  watchSubscription: null,

  // Estados iniciales aislados
  pickupLocation: null,
  deliveryLocation: null,

  savedAddresses: [],

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
  setDeliveryLocation: (location) => set({ deliveryLocation: location }),

  // ✅ ACCIÓN PARA AGREGAR UNA DIRECCIÓN (Genera ID autoincremental basado en fecha)
  addSavedAddress: (newAddr) => set((state) => ({
    savedAddresses: [
      ...state.savedAddresses,
      { ...newAddr, id: Date.now().toString() }
    ]
  })),

  // ✅ ACCIÓN PARA ELIMINAR UNA DIRECCIÓN POR ID
  removeSavedAddress: (id) => set((state) => ({
    savedAddresses: state.savedAddresses.filter(addr => addr.id !== id)
  }))
}));