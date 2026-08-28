import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { igoApi } from '@/infrastructure/api/igo.api';

export interface User {
  id: string;
  email: string;
  fullname: string;
  roles: string[];
  avatarUrl?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, fullName: string) => Promise<boolean>;
  loginWithGoogle: (googleToken: string) => Promise<boolean>;
  changePassword: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUserLocal: (updatedUser: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  isLoading: true,

  login: async (email, password) => {
    try {
      const response = await igoApi.post('/auth/login', { email, password });
      const { user, token } = response.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      set({
        isAuthenticated: true,
        user,
        token,
        isLoading: false,
      });
      return true;
    } catch (error) {
      console.error('Error logging in:', error);
      return false;
    }
  },

  register: async (email, password, fullName) => {
    try {
      await igoApi.post('/users/register', { email, password, fullName });
      return await get().login(email, password);
    } catch (error) {
      console.error('Error registering:', error);
      return false;
    }
  },

  loginWithGoogle: async (googleToken) => {
    try {
      const response = await igoApi.post('/auth/google', { token: googleToken });
      const { user, token } = response.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      set({
        isAuthenticated: true,
        user,
        token,
        isLoading: false,
      });
      return true;
    } catch (error) {
      console.error('Error logging in with Google:', error);
      return false;
    }
  },

  changePassword: async (password) => {
    try {
      const userId = get().user?.id;
      if (!userId) return false;
      await igoApi.patch(`/users/${userId}`, { password });
      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      return false;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    set({ isAuthenticated: false, user: null, token: null, isLoading: false });
  },

  checkAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userJson = await AsyncStorage.getItem('user');
      if (token && userJson) {
        const user = JSON.parse(userJson);
        set({ isAuthenticated: true, user, token, isLoading: false });
      } else {
        set({ isAuthenticated: false, user: null, token: null, isLoading: false });
      }
    } catch (error) {
      set({ isAuthenticated: false, user: null, token: null, isLoading: false });
    }
  },

  updateUserLocal: async (updatedUser) => {
    const currentUser = get().user;
    if (currentUser) {
      const newUser = { ...currentUser, ...updatedUser };
      await AsyncStorage.setItem('user', JSON.stringify(newUser));
      set({ user: newUser });
    }
  },
}));