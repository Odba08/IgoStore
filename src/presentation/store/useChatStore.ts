import { create } from 'zustand';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  orderId?: string;
  isSupport?: boolean;
}

interface ChatState {
  unreadCount: number;
  activeNotification: InAppNotification | null;
  incrementUnread: () => void;
  resetUnread: () => void;
  showNotification: (notif: InAppNotification) => void;
  hideNotification: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  unreadCount: 0,
  activeNotification: null,

  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  resetUnread: () => set({ unreadCount: 0 }),

  showNotification: (notif: InAppNotification) => {
    set({ activeNotification: notif });
  },

  hideNotification: () => set({ activeNotification: null }),
}));
