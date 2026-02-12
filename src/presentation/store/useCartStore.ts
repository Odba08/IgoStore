import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native'; // <-- Importación necesaria para el bloqueo

interface CartItem {
  id: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
  business_id: string; // <-- 1. CRÍTICO: El carrito ahora exige saber la tienda
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (item) => set((state) => {
        if (state.items.length > 0) {
          const currentBusinessId = state.items[0].business_id;
          
          if (currentBusinessId !== item.business_id) {
            Alert.alert(
              "Acción no permitida",
              "Solo puedes pedir de una tienda a la vez. Vacía tu carrito actual si deseas comprar en este negocio."
            );
            return state; // Aborta la inserción, devuelve el estado intacto
          }
        }

        // --- 3. LÓGICA DE INSERCIÓN ORIGINAL ---
        const existingItem = state.items.find((i) => i.id === item.id);
        if (existingItem) {
          return { items: state.items.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + item.quantity} : i) };
        }
        return { items: [...state.items, item] };
      }),

      removeItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id)
      })),

      updateQuantity: (id, quantity) => set((state) => {
        if (quantity <= 0) {
          return { items: state.items.filter((item) => item.id !== id) };
        }
        return {
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        };
      }),

      clearCart: () => set({ items: [] }), 
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);