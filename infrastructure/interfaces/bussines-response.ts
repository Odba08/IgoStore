export interface Image {
  id: string;
  url: string;
}

export interface Business {
  id: string;
  name: string;
  images: Image[];
  products: any[]; // Puedes definir una interfaz específica para los productos si lo deseas
}
