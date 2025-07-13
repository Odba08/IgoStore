import { View, Text, AppState } from 'react-native'
import React, { PropsWithChildren, useEffect } from 'react'
import { usePermissionsStore } from '../store/usePermissions'
import { PermissionStatus } from '@/infrastructure/interfaces/location'
import { router } from 'expo-router'

const PermissionCheckerProvider = ({children}:PropsWithChildren) => {
const {locationStatus, checkLocationPermission} = usePermissionsStore()

useEffect(() => {
    if (locationStatus === PermissionStatus.GRANTED) {
        router.replace('/map')
   } else if (locationStatus !== PermissionStatus.CHECKING) {
        router.replace('/permissions')
    }
}, [locationStatus])

useEffect(() => {
    checkLocationPermission()
}, [])


useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
            checkLocationPermission()
        }
    })

    return () => {
        subscription.remove();
    }
} , [])

  return <>{children}</>
}

export default PermissionCheckerProvider