import { create } from 'zustand';
import { LocationSubscription } from "expo-location";

// CORRECCIÓN 1: La interfaz ahora es una Entidad del Core
import { LatLng } from "@/core/entities/lat-lng.entity";

// CORRECCIÓN 2: Las acciones de GPS son Infraestructura
import { getCurrentLocation, watchCurrentPosition } from "@/infrastructure/actions/location/location";

interface LocationState {
  lastKnowLocation: LatLng | null;
  userLocationList: LatLng[];
  watchSubscription: LocationSubscription | null;

  getLocation: () => Promise<LatLng>;
  watchLocation: () => void;
  clearWatchLocation: () => void;
}

export const useLocationStore = create<LocationState>()((set, get) => ({

  lastKnowLocation: null,
  userLocationList: [],
  watchSubscription: null,

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
  }
}));