import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { igoApi } from '../api/igo.api';
import { SafeNotifications, isExpoGo } from './expo-notifications-safe';

export class NotificationService {
  /**
   * Solicita permisos de notificación y obtiene el token de Expo
   */
  static async registerForPushNotificationsAsync(): Promise<string | null> {
    if (!SafeNotifications) {
      if (isExpoGo && Platform.OS === 'android') {
        console.log(
          'ℹ️ [NotificationService] En Android con Expo Go las notificaciones remotas no están disponibles. Se requiere un Development Build (npx expo run:android).'
        );
      }
      return null;
    }

    let token: string | null = null;

    try {
      if (Platform.OS === 'android') {
        await SafeNotifications.setNotificationChannelAsync('orders', {
          name: 'Pedidos y Estados',
          importance: SafeNotifications.AndroidImportance?.MAX ?? 5,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B00',
          sound: 'default',
        });
        await SafeNotifications.setNotificationChannelAsync('default', {
          name: 'General',
          importance: SafeNotifications.AndroidImportance?.DEFAULT ?? 3,
          sound: 'default',
        });
      }

      if (Device.isDevice) {
        const { status: existingStatus } = await SafeNotifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await SafeNotifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.warn('Permiso de notificaciones push no otorgado por el usuario.');
          return null;
        }

        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId ??
          'b9c166b2-882e-40a2-9911-38e6f6611840';

        const pushTokenData = await SafeNotifications.getExpoPushTokenAsync({
          projectId,
        });
        token = pushTokenData?.data ?? null;
        if (token) {
          console.log('📲 [NotificationService] Expo Push Token obtenido:', token);
        }
      } else {
        console.log('Se requiere un dispositivo físico para recibir notificaciones push.');
      }
    } catch (err) {
      console.warn('Error en registerForPushNotificationsAsync:', err);
    }

    return token;
  }

  /**
   * Sincroniza el Push Token con la cuenta del usuario en el backend
   */
  static async syncPushTokenWithBackend(pushToken: string): Promise<void> {
    try {
      if (!pushToken) return;
      await igoApi.patch('/users/push-token', { pushToken });
      console.log('✅ [NotificationService] Token sincronizado con el backend.');
    } catch (error) {
      console.error('Error al sincronizar push token con backend:', error);
    }
  }

  /**
   * Enviar una notificación local inmediata (para pruebas o avisos in-app)
   */
  static async scheduleLocalNotification(title: string, body: string, data: any = {}) {
    if (!SafeNotifications) return;
    try {
      await SafeNotifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null,
      });
    } catch (err) {
      console.warn('Error en scheduleLocalNotification:', err);
    }
  }
}
