// Ubicación recomendada: src/presentation/store/useOrdersStore.ts
import { create } from 'zustand';

export interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface HistoricalOrder {
  id: string;
  orderNumber: string;
  date: string;
  items: OrderItem[];
  deliveryAddress: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  businessName: string;
  status: string;
}

interface OrdersState {
  orders: HistoricalOrder[];
  addOrder: (order: Omit<HistoricalOrder, 'id' | 'orderNumber' | 'date' | 'status'>) => void;
}

export const useOrdersStore = create<OrdersState>()((set) => ({
  // ✅ Pedido de prueba inicial para que veas cómo luce
  orders: [
    {
      id: '1',
      orderNumber: '#0001',
      date: '07/07/2026, 09:30 PM',
      businessName: 'McDonalds C2',
      deliveryAddress: 'Zona Norte, Maracaibo',
      subtotal: 15.50,
      deliveryFee: 3.00,
      totalAmount: 18.50,
      status: 'ENTREGADO',
      items: [
        { id: 'p1', title: 'Hamburguesa Doble con Queso', quantity: 2, price: 5.00, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200' },
        { id: 'p2', title: 'Papas Fritas Medianas', quantity: 1, price: 2.50, image: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=200' },
      ]
    }
  ],

  addOrder: (newOrder) => set((state) => {
    const nextNum = state.orders.length + 1;
    const formattedNum = `#${String(nextNum).padStart(4, '0')}`;
    const dateStr = new Date().toLocaleString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return {
      orders: [
        {
          ...newOrder,
          id: Date.now().toString(),
          orderNumber: formattedNum,
          date: dateStr,
          status: 'ENTREGADO'
        },
        ...state.orders
      ]
    };
  })
}));