import { View, Text, Button } from 'react-native'
import React from 'react'
import { usePermissionsStore } from '@/presentation/store/usePermissions'


const PermissionScreen = () => {

  const {locationStatus, requestLocationPermission} = usePermissionsStore();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Estado actual : {locationStatus}</Text>
      <Button title="Solicitar permiso" onPress={requestLocationPermission} />
    </View>
  )
}

export default PermissionScreen