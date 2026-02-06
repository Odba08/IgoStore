import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useCategories } from '@/presentation/hooks/useCategories';

const CATEGORY_ICONS: Record<string, any> = {
  'Restaurantes': require('../../../../assets/Icons/opciones/burger.png'),
  'Veterinaria': require('../../../../assets/Icons/opciones/cat.png'), 
  'Mascotas': require('../../../../assets/Icons/opciones/dog.png'),
  'Bebidas': require('../../../../assets/Icons/opciones/drink.png'),
  'Farmacia': require('../../../../assets/Icons/opciones/farm.png'),
  'Helados': require('../../../../assets/Icons/opciones/green.png'),
  'Pizza': require('../../../../assets/Icons/opciones/keys.png'),
  'Tecnología': require('../../../../assets/Icons/opciones/rider.png'), 
  'Default': require('../../../../assets/Icons/opciones/green.png'),
};

interface Props {
  selectedCategoryId?: string | null;
  // CAMBIO 1: La función ahora acepta (id, name)
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
          
          const iconSource = CATEGORY_ICONS[cat.name] || CATEGORY_ICONS['Default'];
          const isSelected = selectedCategoryId === cat.id;

          return (
            <TouchableOpacity 
              key={cat.id} 
              style={styles.itemContainer}
              // CAMBIO 2: Enviamos ID y Nombre al padre
              onPress={() => onSelectCategory && onSelectCategory(cat.id, cat.name)}
            >
              <View style={[
                styles.iconCircle,
                isSelected && styles.iconCircleSelected 
              ]}>
                <Image source={iconSource} style={styles.icon} resizeMode="contain" />
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

// ... (Los estilos se mantienen igual)
const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginBottom: 15, color: '#1a1a1a' },
  scrollContent: { paddingHorizontal: 15 },
  itemContainer: { alignItems: 'center', marginRight: 20 },
  iconCircle: {
    width: 80, height: 80,
    backgroundColor: '#F5F5F5', 
    borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent' 
  },
  iconCircleSelected: {
    backgroundColor: '#fff', 
    borderColor: '#FFDB58', 
    elevation: 5
  },
  icon: { width: 70, height: 70 },
  label: { fontSize: 12, fontWeight: '600', color: '#555' },
  labelSelected: { color: '#000', fontWeight: 'bold' }
});