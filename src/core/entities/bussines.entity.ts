import { Producto } from './productos.entity';

// Interfaz auxiliar para la categoría global (Gym, Restaurante, etc.)
export interface GlobalCategory {
  id: string;
  name: string;
}

export interface Image {
  id: string;
  url: string;
}

export interface Business {
  id: string;
  name: string;
  images: Image[];
  description?: string; // Opcional, pero recomendado
  
  category?: GlobalCategory; 
  categoryId?: string; // Déjalo por si acaso alguna parte vieja lo usa
  
  rating?: number;
  reviewsCount?: number;
  freeDeliveryAbove?: number;
  isOfficialStore?: boolean;
  latitude?: number;
  longitude?: number;

  products: Producto[];
}