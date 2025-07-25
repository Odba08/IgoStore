import { LatLng } from '@/infrastructure/interfaces/lat-lng'
import * as Location from 'expo-location'


export const getCurrentLocation = async (): Promise<LatLng> => {

try {

  const { coords} = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.BestForNavigation
  })

  return {
    latitude: coords.latitude,
    longitude: coords.longitude
  }
  
} catch (error) {

  throw new Error('Error Getting users location')
  
}

};

export const watchCurrentPosition = (
  locationCallback: (location: LatLng) => void 
) =>{
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 10
    }, ({coords}) => {
      locationCallback({
        latitude: coords.latitude,
        longitude: coords.longitude
      })
    }

  )} 