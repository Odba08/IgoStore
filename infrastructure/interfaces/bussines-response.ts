import { Producto } from './productos';

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
  
  // --- EL CAMBIO CLAVE ---
  // Antes solo tenías el ID, ahora el backend te da el objeto completo
  category?: GlobalCategory; 
  categoryId?: string; // Déjalo por si acaso alguna parte vieja lo usa
  
  products: Producto[];
}