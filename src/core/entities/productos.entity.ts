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

export interface OptionChoice {
  name: string;
  additionalPrice: number;
}

export interface ProductOption {
  title: string;
  isRequired: boolean;
  maxAllowed: number;
  choices: OptionChoice[];
}

export interface Producto {
  id: string;
  title: string;
  price: number;
  description: string;
  slug: string;
  stock: number;
  
  options?: ProductOption[];
  tags?: string[]; // Agregué tags que suele ser útil
  
  isPromo?: boolean;         // Para saber si tachar el precio
  discountPrice?: number;    // El precio de oferta
  menuCategory?: MenuCategoryRef; // La categoría del menú (Mancuernas, Bebidas, etc.)
  isApproved?: boolean;      // Estado de aprobación en el panel administrador
  
  // Compatibilidad
  categoryId?: string; 
    
  images: ProductImage[]; 
  business: BusinessShort; 
}