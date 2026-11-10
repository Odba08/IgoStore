import { create } from 'zustand';
import SoundService from '@/infrastructure/services/sound.service';

export interface YellowAlertPayload {
  title: string;
  message: string;
  orderNumber?: number | string;
  orderId?: string;
  clientName?: string;
  totalAmount?: number;
  deliveryAddress?: string;
  businessName?: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  playSound?: boolean;
}

interface NotificationAlertState {
  currentAlert: YellowAlertPayload | null;
  isVisible: boolean;
  showAlert: (payload: YellowAlertPayload) => void;
  hideAlert: () => void;
}

export const useNotificationAlertStore = create<NotificationAlertState>((set, get) => ({
  currentAlert: null,
  isVisible: false,

  showAlert: (payload: YellowAlertPayload) => {
    // Si ya está visible, detener sonido anterior
    SoundService.stopOrderAlertSound().catch(() => {});

    // Reproducir alerta sonora + vibración (a menos que explícitamente se desactive)
    if (payload.playSound !== false) {
      SoundService.playOrderAlertSound().catch(() => {});
    }

    set({
      currentAlert: payload,
      isVisible: true,
    });
  },

  hideAlert: () => {
    const { currentAlert } = get();
    SoundService.stopOrderAlertSound().catch(() => {});
    if (currentAlert?.onDismiss) {
      try {
        currentAlert.onDismiss();
      } catch (e) {
        console.warn('Error onDismiss notification:', e);
      }
    }
    set({
      isVisible: false,
      currentAlert: null,
    });
  },
}));
