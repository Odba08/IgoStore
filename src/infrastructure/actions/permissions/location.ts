import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';

// ✅ CORRECCIÓN: La interfaz/enum ahora vive en Core Entities
import { PermissionStatus } from '@/core/entities/location.entity';

export const requestLocationPermission = async (): Promise<PermissionStatus> => {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
        if (status === 'denied') {
            manualPermissionRequest();
        }
        return PermissionStatus.DENIED;
    }

    return PermissionStatus.GRANTED;
};

export const checkLocationPermission = async (): Promise<PermissionStatus> => {
    const { status } = await Location.getForegroundPermissionsAsync();

    switch (status) {
        case 'granted':
            return PermissionStatus.GRANTED;
        case 'denied':
            return PermissionStatus.DENIED;
        default:
            return PermissionStatus.UNDETERMINED;
    }
};

const manualPermissionRequest = async () => {
    Alert.alert(
        'Permiso de ubicación necesario',
        'Para continuar, por favor, activa el permiso de ubicación en la configuración de tu dispositivo.',
        [
            {
                text: 'Abrir configuración',
                onPress: () => Linking.openSettings()
            },
            {
                text: 'Cancelar',
                style: 'destructive',
            }
        ]
    );
};