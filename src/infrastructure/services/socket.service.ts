import { io, Socket } from 'socket.io-client';

const getSocketUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.31.236:3000';
  return envUrl.replace(/\/api\/?$/, '');
};

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const url = getSocketUrl();
    console.log('⚡ Conectando Socket.io a:', url);
    socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('⚡ [IgoStore] Conectado exitosamente a WebSockets del Backend:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ [IgoStore] Desconectado de WebSockets:', reason);
    });

    socket.on('connect_error', (error) => {
      console.warn('⚠️ [IgoStore] Error de conexión WebSocket:', error.message);
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default getSocket;
