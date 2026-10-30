import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let NotificationsModule: any = null;

try {
  // En Expo SDK 53+, expo-notifications en Android dentro de Expo Go arroja error porque Google FCM requiere build nativo.
  // Solo lo cargamos si no es Expo Go en Android.
  if (!(isExpoGo && Platform.OS === 'android')) {
    NotificationsModule = require('expo-notifications');

    if (NotificationsModule?.setNotificationHandler) {
      NotificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
  } else {
    console.log('ℹ️ [PushNotifications] Ejecutando en Expo Go (Android). Las notificaciones remotas requieren un Development Build.');
  }
} catch (error) {
  console.warn('⚠️ [PushNotifications] No se pudo cargar el módulo nativo de notificaciones:', error);
}

export const SafeNotifications = NotificationsModule;
