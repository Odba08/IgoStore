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

// --- NUEVO CONTRATO PARA LAS OPCIONES ---
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
// ----------------------------------------

export interface Producto {
  id: string;
  title: string;
  price: number;
  description: string;
  slug: string;
  stock: number;
  
  // --- EL CANDADO ABIERTO ---
  // Ahora TypeScript sabe que esto es un árbol lógico, no texto plano.
  options?: ProductOption[]; 
  
  tags?: string[]; 
  
  isPromo?: boolean;         // Para saber si tachar el precio
  discountPrice?: number;    // El precio de oferta
  menuCategory?: MenuCategoryRef; // La categoría del menú (Mancuernas, Bebidas, etc.)
  
  // Compatibilidad
  categoryId?: string; 
    
  images: ProductImage[]; 
  business: BusinessShort; 
}