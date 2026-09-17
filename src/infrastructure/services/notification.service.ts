import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { igoApi } from '../api/igo.api';

// Configurar cómo se presentan las notificaciones cuando la app está abierta en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  /**
   * Solicita permisos de notificación y obtiene el token de Expo
   */
  static async registerForPushNotificationsAsync(): Promise<string | null> {
    let token: string | null = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Pedidos y Estados',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B00',
        sound: 'default',
      });
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
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

      try {
        const pushTokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        token = pushTokenData.data;
        console.log('📲 [NotificationService] Expo Push Token obtenido:', token);
      } catch (err) {
        console.error('Error al obtener Expo Push Token:', err);
      }
    } else {
      console.log('Se requiere un dispositivo físico para recibir notificaciones push.');
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
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // inmediato
    });
  }
}
