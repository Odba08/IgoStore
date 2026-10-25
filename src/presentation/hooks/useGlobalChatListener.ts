import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { getSocket } from '@/infrastructure/services/socket.service';
import { useAuthStore } from '@/presentation/store/useAuthStore';
import { useChatStore } from '@/presentation/store/useChatStore';

export function useGlobalChatListener() {
  const { user } = useAuthStore();
  const { incrementUnread, showNotification } = useChatStore();

  useEffect(() => {
    if (!user?.id) return;

    let socket: any = null;
    try {
      socket = getSocket();
    } catch (e) {
      console.warn('Socket no disponible para chat listener:', e);
      return;
    }

    if (!socket) return;

    // 1. Mensajes de pedidos (Cliente <-> Motorizado <-> Admin)
    const handleOrderChatMessage = (payload: any) => {
      // Ignorar mensajes enviados por mí mismo
      if (payload?.senderId === user.id) return;

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch (e) {}

      incrementUnread();
      showNotification({
        id: payload?.id || Date.now().toString(),
        title: `💬 ${payload?.senderName || 'Mensaje de pedido'}`,
        body: payload?.text || 'Nuevo mensaje recibido',
        orderId: payload?.orderId,
        isSupport: false,
      });
    };

    // 2. Mensajes de soporte directo con Administrador
    const handleSupportChatMessage = (payload: any) => {
      if (payload?.senderId === user.id) return;
      if (payload?.userId && payload.userId !== user.id && !user.roles?.includes('admin')) return;

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch (e) {}

      incrementUnread();
      showNotification({
        id: payload?.id || Date.now().toString(),
        title: `🎧 Soporte IGO (${payload?.senderName || 'Admin'})`,
        body: payload?.text || 'Nuevo mensaje de soporte',
        isSupport: true,
      });
    };

    socket.on('order:chat_message', handleOrderChatMessage);
    socket.on('support:chat_message', handleSupportChatMessage);
    socket.on(`support:${user.id}:message`, handleSupportChatMessage);

    return () => {
      socket.off('order:chat_message', handleOrderChatMessage);
      socket.off('support:chat_message', handleSupportChatMessage);
      socket.off(`support:${user.id}:message`, handleSupportChatMessage);
    };
  }, [user?.id]);
}
