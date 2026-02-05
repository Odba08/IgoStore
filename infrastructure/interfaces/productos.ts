export interface ProductImage {
  id?: string; // El ID es opcional porque a veces solo viene la URL
  url: string;
}

export interface BusinessShort {
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
  categoryId: string; 
    
  images: ProductImage[]; 
  business: BusinessShort; 
}