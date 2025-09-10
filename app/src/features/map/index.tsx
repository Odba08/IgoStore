import { ActivityIndicator, View} from 'react-native'
import React, { useEffect } from 'react'
import CustomMap from '@/presentation/components/maps/CustomMap';
import { useLocationStore } from '@/presentation/store/useLocationStore';

const MapScreens
 = () => {

  const {lastKnowLocation, getLocation} = useLocationStore();

  useEffect(()=>{
    if(lastKnowLocation === null) {
      getLocation();
    }
  },[])

  if (lastKnowLocation === null ){
    return (
      <View style={{flex: 1, justifyContent: 'center', alignContent: 'center'}}>
        <ActivityIndicator/>
      </View>
    )
  }

  return (
    <View>
       <CustomMap
        initialLocation={lastKnowLocation}
       />
    </View>
  )
}

export default MapScreens

