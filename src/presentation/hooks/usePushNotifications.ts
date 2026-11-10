import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { NotificationService } from '@/infrastructure/services/notification.service';
import { SafeNotifications } from '@/infrastructure/services/expo-notifications-safe';
import { useAuthStore } from '../store/useAuthStore';

import { useNotificationAlertStore } from '../store/useNotificationAlertStore';

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any>(null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    // Si no está disponible expo-notifications (ej. Expo Go Android), salir sin error
    if (!SafeNotifications) return;

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
    try {
      notificationListener.current = SafeNotifications.addNotificationReceivedListener?.((incomingNotification: any) => {
        const content = incomingNotification?.request?.content;
        console.log('📬 [PushNotification] Notificación recibida:', content);
        setNotification(incomingNotification);

        if (content) {
          const data = content.data || {};
          useNotificationAlertStore.getState().showAlert({
            title: content.title || '🔔 ¡Nueva Notificación!',
            message: content.body || '',
            orderId: data.orderId,
            orderNumber: data.orderNumber,
            totalAmount: data.totalAmount ? Number(data.totalAmount) : undefined,
            clientName: data.clientName,
            actionLabel: 'VER PEDIDO',
            onAction: () => {
              if (data.orderId) {
                try {
                  router.push('/orders' as any);
                } catch (e) {}
              }
            },
          });
        }
      });
    } catch (e) {
      console.warn('No se pudo registrar listener de notificación recibida:', e);
    }

    // 3. Listener cuando el usuario hace tap/clic en la notificación
    try {
      responseListener.current = SafeNotifications.addNotificationResponseReceivedListener?.((response: any) => {
        const data = response?.notification?.request?.content?.data;
        console.log('👉 [PushNotification] Usuario interactuó con la notificación:', data);

        if (data?.orderId) {
          try {
            router.push('/(tabs)/orders' as any);
          } catch (e) {
            console.log('No se pudo navegar a la orden:', e);
          }
        }
      });
    } catch (e) {
      console.warn('No se pudo registrar listener de respuesta a notificación:', e);
    }

    return () => {
      notificationListener.current?.remove?.();
      responseListener.current?.remove?.();
    };
  }, [isAuthenticated, user?.id]);

  return {
    expoPushToken,
    notification,
  };
}
