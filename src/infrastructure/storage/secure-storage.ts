import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SecureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
        });
      }
    } catch (error) {
      console.warn(`Error setting secure item ${key}:`, error);
      await AsyncStorage.setItem(key, value);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return await AsyncStorage.getItem(key);
      }
      const item = await SecureStore.getItemAsync(key);
      if (item !== null) return item;
      // Fallback a AsyncStorage por si el usuario ya tenía sesión iniciada antes de la migración
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn(`Error getting secure item ${key}:`, error);
      return await AsyncStorage.getItem(key);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
      await AsyncStorage.removeItem(key).catch(() => {});
    } catch (error) {
      console.warn(`Error removing secure item ${key}:`, error);
      await AsyncStorage.removeItem(key).catch(() => {});
    }
  },
};
