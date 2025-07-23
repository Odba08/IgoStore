import { LatLng } from '@/infrastructure/interfaces/lat-lng';
import {View, ViewProps, StyleSheet} from 'react-native'
import MapView from 'react-native-maps';

interface Props extends ViewProps{
  initialLocation: LatLng;
  showUserLocation?: boolean;

}

const CustomMap = ({initialLocation, showUserLocation = true, ...rest }:Props) => {
  return (
    <View {...rest}>
      <MapView 
      showsUserLocation = {showUserLocation}
      style={styles.map} />
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
