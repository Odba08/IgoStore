import { Producto } from './productos';

export interface Image {
  id: string;
  url: string;
}

export interface Business {
  id: string;
  name: string;
  images: Image[];
  
  categoryId: string; 
  
  products: Producto[];
}