import { create } from 'zustand';

interface FavoritesState {
  favorites: string[]; // Lista de IDs
  toggleFavorite: (id: string) => void; // Acción para dar/quitar like
}

export const useFavoritesStore = create<FavoritesState>((set) => ({
  favorites: [],
  
  toggleFavorite: (id: string) => set((state) => {
    // Si ya existe, lo filtramos (quitamos)
    if (state.favorites.includes(id)) {
      return { favorites: state.favorites.filter((favId) => favId !== id) };
    }
    // Si no existe, lo agregamos
    return { favorites: [...state.favorites, id] };
  }),
}));