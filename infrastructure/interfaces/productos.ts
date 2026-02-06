export interface ProductImage {
  id?: string;
  url: string;
}

export interface BusinessShort {
  id: string;
  name: string;
}

// Interfaz auxiliar para no causar ciclos de importación complejos
export interface MenuCategoryRef {
  id: string;
  name: string;
}

export interface Producto {
  id: string;
  title: string;
  price: number;
  description: string;
  slug: string;
  stock: number;
  
  options: string[]; 
  tags?: string[]; // Agregué tags que suele ser útil
  
  // --- LOS CAMPOS NUEVOS QUE FALTABAN ---
  isPromo?: boolean;         // Para saber si tachar el precio
  discountPrice?: number;    // El precio de oferta
  menuCategory?: MenuCategoryRef; // La categoría del menú (Mancuernas, Bebidas, etc.)
  
  // Compatibilidad
  categoryId?: string; 
    
  images: ProductImage[]; 
  business: BusinessShort; 
}