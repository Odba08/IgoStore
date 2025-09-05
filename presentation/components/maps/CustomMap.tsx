import { LatLng } from '@/infrastructure/interfaces/lat-lng';
import { useLocationStore } from '@/presentation/store/useLocationStore';
import { useEffect, useRef, useState } from 'react';
import {View, ViewProps, StyleSheet} from 'react-native'
import MapView, { Polyline } from 'react-native-maps';
import FAB from '../shared/FAB';

interface Props extends ViewProps{
  initialLocation: LatLng;
  showUserLocation?: boolean;
}

const CustomMap = ({initialLocation, showUserLocation = true, ...rest }:Props) => {
  const mapRef= useRef<MapView>(null);
  const [isFollowingUser, setFollowingUser ] = useState(true)

  const {watchLocation,clearWatchLocation,lastKnowLocation, getLocation, userLocationList}= useLocationStore();

   useEffect(()=>{
      watchLocation();
    return () => {
      clearWatchLocation();
    }
    },[]);

    useEffect(()=>{
      if(lastKnowLocation && isFollowingUser ) 
     moveCameraToLocation(lastKnowLocation)
    },[lastKnowLocation, isFollowingUser]);

    const moveCameraToLocation = (latLng: LatLng) =>{
      if(!mapRef.current) return;
      mapRef.current.animateCamera({
        center: latLng,
      })
    }

    const moveToCurrentLocation = async()  => {
      if(!lastKnowLocation){
        moveCameraToLocation(initialLocation)
      } else {
        moveCameraToLocation(lastKnowLocation);
      }

      const location = await getLocation();
      if (!location ) return;

      moveCameraToLocation(location);
    }
      

    return (
    <View {...rest}>
      <MapView 
      onTouchStart={() => setFollowingUser(false)}
      ref={mapRef}
      showsUserLocation = {showUserLocation}
      style={styles.map} 
      initialRegion = {{
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
        latitudeDelta: 10.6545,
        longitudeDelta: -71.6533
      }}
      > 
      <Polyline 
      coordinates={ userLocationList}
      strokeColor={'purple'}
      strokeWidth={5}
      />
      
      </MapView>

      <FAB 
      iconName='compass-outline'
      onPress={moveToCurrentLocation}
      style={{
        bottom: 20,
        right: 20
      }} />

      <FAB 
      iconName={isFollowingUser ? 'walk-outline' : 'accessibility-outline'}
      onPress={() => setFollowingUser(!isFollowingUser)}
      style={{
        bottom: 80,
        right: 20
      }} />
    </View>
  );
}

export default CustomMap;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E5E5',
  }
})
