import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native'; 

// ⚡ CONTRATO EXTENDIDO Y ESTRICTO
export interface CartItem {
  id: string;
  productId?: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
  businessId: string; // ⚡ PROPIEDAD CARDINAL (camelCase)
  selectedOptionsText?: string;
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
        // 1. CANDADO DE NEGOCIO UNIFICADO
        if (state.items.length > 0) {
          // ⚡ LECTURA CORREGIDA: Usamos estrictamente businessId
          const currentBusinessId = state.items[0].businessId;
          
          if (currentBusinessId !== item.businessId) {
            Alert.alert(
              "Acción no permitida",
              "Solo puedes pedir de una tienda a la vez. Vacía tu carrito actual si deseas comprar en este negocio."
            );
            return state; // Aborta la inserción, devuelve el estado intacto
          }
        }

        // 2. LÓGICA DE INSERCIÓN ORIGINAL
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