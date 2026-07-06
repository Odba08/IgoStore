import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false, // Inicia la app bloqueada
  login: (email, password) => {
    // Credenciales estáticas para la demostración
    if (email === 'oscar@igo.com' && password === 'admin123') {
      set({ isAuthenticated: true });
      return true;
    }
    return false;
  },
  logout: () => set({ isAuthenticated: false }),
}));