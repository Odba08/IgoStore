import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  accent: string;
  inputBg: string;
  inputBorder: string;
  divider: string;
  statusBar: 'light' | 'dark';
}

export const lightColors: ThemeColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#F1F5F9',
  text: '#0F0330',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  primary: '#FFC93C',
  accent: '#0F0330',
  inputBg: '#F8FAFC',
  inputBorder: '#E2E8F0',
  divider: '#F1F5F9',
  statusBar: 'dark',
};

export const darkColors: ThemeColors = {
  background: '#0F0330',
  surface: '#1A0D3E',
  card: '#1F1245',
  cardBorder: '#2E2059',
  text: '#FFFFFF',
  textSecondary: '#C5BFDB',
  textMuted: '#8E88A8',
  primary: '#FFC93C',
  accent: '#FFC93C',
  inputBg: '#190F38',
  inputBorder: '#342662',
  divider: '#2A1B57',
  statusBar: 'light',
};

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => Promise<void>;
  setTheme: (mode: ThemeMode) => Promise<void>;
  loadSavedTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'light',
  isDark: false,
  colors: lightColors,

  toggleTheme: async () => {
    const nextMode: ThemeMode = get().mode === 'light' ? 'dark' : 'light';
    await get().setTheme(nextMode);
  },

  setTheme: async (mode: ThemeMode) => {
    const isDark = mode === 'dark';
    const colors = isDark ? darkColors : lightColors;
    set({ mode, isDark, colors });
    try {
      await AsyncStorage.setItem('@igo_theme_mode', mode);
    } catch (e) {
      console.warn('Error saving theme preference:', e);
    }
  },

  loadSavedTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem('@igo_theme_mode');
      if (saved === 'dark' || saved === 'light') {
        const isDark = saved === 'dark';
        set({
          mode: saved,
          isDark,
          colors: isDark ? darkColors : lightColors,
        });
      }
    } catch (e) {
      console.warn('Error loading theme:', e);
    }
  },
}));
