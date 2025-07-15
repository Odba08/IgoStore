import { View, Text, StyleSheet} from 'react-native'
import React from 'react'

const MapScreens
 = () => {
  return (
    <View style ={styles.container}>
      <View style={styles.map} />
    </View>
  )
}

export default MapScreens

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
