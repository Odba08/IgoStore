export interface ProductImage {
  id?: string;
  url: string;
}

export interface BusinessShort {
  id: string;
  name: string;
}

export interface Producto {
  id: string; // Faltaba el ID
  title: string;
  price: number;
  description: string;
  slug: string;
  stock: number;
  sizes: string[];    
  gender: string;     
  tags: string[];     
  // CORRECCIÓN 1: Las imágenes son objetos, no strings planos
  images: ProductImage[]; 
  // CORRECCIÓN 2: Agregamos la referencia al negocio
  business: BusinessShort; 
}