import { View} from 'react-native'
import React from 'react'
import CustomMap from '@/presentation/components/maps/CustomMap';

const MapScreens
 = () => {
  return (
    <View>
       
       <CustomMap
        initialLocation={{
          latitud:45.41256,
          longitud:-75.698931
        }}
       />
    </View>
  )
}

export default MapScreens

