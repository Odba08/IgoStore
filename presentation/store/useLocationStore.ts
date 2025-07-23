import { getCurrentLocation, watchCurrentPosition } from "@/core/actions/location/location";
import { LatLng } from "@/infrastructure/interfaces/lat-lng";
import { LocationSubscription } from "expo-location";
import { create } from 'zustand';

interface LocationState{
  lastKnowLocation: LatLng | null;
  userLocationList: LatLng[]; 
  watchSubscription: LocationSubscription | null;

  getLocation: () =>Promise<LatLng>;
  watchLocation: () => void;
  clearWatchLocation: () => void;
}

export const useLocationStore = create<LocationState>()((set,get)=>({

  lastKnowLocation: null,
  userLocationList: [],
  watchSubscription: null,

  getLocation: async() => {
    const location = await getCurrentLocation()
    set({lastKnowLocation: location})
    return location;
  },

  watchLocation: async() =>{
      const oldSubscription = get().watchSubscription

      if(oldSubscription !== null) {
        get().clearWatchLocation()
      }

      const watchSubscription = await watchCurrentPosition(
        (LatLng) =>{
          set({
            lastKnowLocation: LatLng,
            userLocationList: [...get().userLocationList, LatLng]
          })
        }
      )

      set({watchSubscription: watchSubscription})
  },

  clearWatchLocation: () => {
    const subscription = get().watchSubscription;

    if( subscription !== null ){
      subscription.remove();
    }
  }
}))