import { LatLng } from '@/infrastructure/interfaces/lat-lng';
import { useLocationStore } from '@/presentation/store/useLocationStore';
import { useEffect, useRef } from 'react';
import {View, ViewProps, StyleSheet} from 'react-native'
import MapView from 'react-native-maps';
import FAB from '../shared/FAB';

interface Props extends ViewProps{
  initialLocation: LatLng;
  showUserLocation?: boolean;

}

const CustomMap = ({initialLocation, showUserLocation = true, ...rest }:Props) => {
  const mapRef= useRef<MapView>(null);
  const {watchLocation,clearWatchLocation,lastKnowLocation}= useLocationStore();

   useEffect(()=>{
      watchLocation();
    return () => {
      clearWatchLocation();
    }
    },[]);

    useEffect(()=>{
      if(lastKnowLocation)
     moveCameraToLocation(lastKnowLocation)
    },[lastKnowLocation]);

    const moveCameraToLocation = (latLng: LatLng) =>{
      if(!mapRef.current) return;
      mapRef.current.animateCamera({
        center: latLng,
      })
    }

      

    return (
    <View {...rest}>
      <MapView 
      ref={mapRef}
      showsUserLocation = {showUserLocation}
      style={styles.map} 
      initialRegion = {{
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      }}
      />

      <FAB 
      iconName='at-circle-outline'
      onPress={()=> {}}
      style={{
        bottom: 20,
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
