import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useCategories } from '@/presentation/hooks/useCategories';

export const CATEGORY_ICONS_MAP: Record<string, any> = {
  restaurantes: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-restaurantes.svg'),
  restaurante: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-restaurantes.svg'),
  comida: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-restaurantes.svg'),
  hamburguesas: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-restaurantes.svg'),
  pizza: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-restaurantes.svg'),
  supermercado: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-mercado.svg'),
  mercado: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-mercado.svg'),
  bodega: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-mercado.svg'),
  viveres: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-mercado.svg'),
  víveres: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-mercado.svg'),
  farmacia: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-farmacias.svg'),
  farmacias: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-farmacias.svg'),
  salud: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-farmacias.svg'),
  licoreria: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-bebidas.svg'),
  licorería: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-bebidas.svg'),
  licores: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-bebidas.svg'),
  bebidas: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-bebidas.svg'),
  mascotas: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-mascotas.svg'),
  veterinaria: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-mascotas.svg'),
  express: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-express.svg'),
  mensajeria: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-express.svg'),
  mensajería: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-express.svg'),
  tiendas: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-tiendas.svg'),
  tienda: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-tiendas.svg'),
  compras: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-tiendas.svg'),
  ropa: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-tiendas.svg'),
  panaderia: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-panaderia.svg'),
  panadería: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-panaderia.svg'),
  reposteria: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-panaderia.svg'),
  repostería: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-panaderia.svg'),
  belleza: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-belleza.svg'),
  cosmeticos: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-belleza.svg'),
  cosméticos: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-belleza.svg'),
  tecnologia: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-tecnologia.svg'),
  tecnología: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-tecnologia.svg'),
  ferreteria: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-ferreteria.svg'),
  ferretería: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-ferreteria.svg'),
  aguaygas: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-agua-y-gas.svg'),
  'agua y gas': require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-agua-y-gas.svg'),
  agua: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-agua-y-gas.svg'),
  gas: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-agua-y-gas.svg'),
  regalos: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-regalos.svg'),
  detalles: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-regalos.svg'),
  ofertas: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-ofertas.svg'),
  promociones: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-ofertas.svg'),
  igofavor: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-igo-favor.svg'),
  'igo favor': require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-igo-favor.svg'),
  favor: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-igo-favor.svg'),
  taxi: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-taxi.svg'),
  igotaxi: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-taxi.svg'),
  'igo taxi': require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-taxi.svg'),
  default: require('../../../../assets/Icons/igo-iconos-categorias/igo-cat-ver-todo.svg'),
};

export const getCategoryIcon = (name?: string) => {
  if (!name) return CATEGORY_ICONS_MAP['default'];
  const key = name.toLowerCase().trim();
  if (CATEGORY_ICONS_MAP[key]) return CATEGORY_ICONS_MAP[key];
  for (const [k, icon] of Object.entries(CATEGORY_ICONS_MAP)) {
    if (key.includes(k) || k.includes(key)) return icon;
  }
  return CATEGORY_ICONS_MAP['default'];
};

interface Props {
  selectedCategoryId?: string | null;
  onSelectCategory?: (id: string, name: string) => void; 
}

export const CategoryList = ({ selectedCategoryId, onSelectCategory }: Props) => {
  const { categories, isLoading } = useCategories();

  if (isLoading) {
    return <ActivityIndicator size="small" color="#FFDB58" style={{ margin: 20 }} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Categorías</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {categories.map((cat) => {
          const iconSource = getCategoryIcon(cat.name);
          const isSelected = selectedCategoryId === cat.id;

          return (
            <TouchableOpacity 
              key={cat.id} 
              style={styles.itemContainer}
              onPress={() => onSelectCategory && onSelectCategory(cat.id, cat.name)}
            >
              <View style={[
                styles.iconCircle,
                isSelected && styles.iconCircleSelected 
              ]}>
                <Image 
                  source={iconSource} 
                  style={styles.icon} 
                  contentFit="contain" 
                  transition={200}
                />
              </View>
              
              <Text style={[
                styles.label,
                isSelected && styles.labelSelected
              ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginBottom: 15, color: '#1a1a1a' },
  scrollContent: { paddingHorizontal: 15 },
  itemContainer: { alignItems: 'center', marginRight: 20 },
  iconCircle: {
    width: 80, 
    height: 80,
    backgroundColor: '#F5F5F5', 
    borderRadius: 30,
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent' 
  },
  iconCircleSelected: {
    backgroundColor: '#fff', 
    borderColor: '#FFDB58', 
    elevation: 5
  },
  icon: { width: 56, height: 56 },
  label: { fontSize: 12, fontWeight: '600', color: '#555' },
  labelSelected: { color: '#000', fontWeight: 'bold' }
});