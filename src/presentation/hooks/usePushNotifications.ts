import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { NotificationService } from '@/infrastructure/services/notification.service';
import { useAuthStore } from '../store/useAuthStore';

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    // 1. Solicitar permisos y obtener token
    NotificationService.registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);
        // Si el usuario está autenticado, sincronizar con el backend
        if (isAuthenticated) {
          NotificationService.syncPushTokenWithBackend(token);
        }
      }
    });

    // 2. Listener cuando llega una notificación (app en primer plano)
    notificationListener.current = Notifications.addNotificationReceivedListener((incomingNotification) => {
      console.log('📬 [PushNotification] Notificación recibida:', incomingNotification.request.content);
      setNotification(incomingNotification);
    });

    // 3. Listener cuando el usuario hace tap/clic en la notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log('👉 [PushNotification] Usuario interactuó con la notificación:', data);

      if (data?.orderId) {
        // Redirigir a la pantalla de órdenes / detalles del pedido si aplica
        try {
          router.push('/(tabs)/orders' as any);
        } catch (e) {
          console.log('No se pudo navegar a la orden:', e);
        }
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated, user?.id]);

  return {
    expoPushToken,
    notification,
  };
}
