import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, FlatList, Dimensions, StyleSheet, TouchableOpacity } from 'react-native';

const { width } = Dimensions.get('window');

// Medidas exactas para que el cálculo matemático funcione perfecto
const CARD_WIDTH = width * 0.9;
const CARD_MARGIN = 15;
const TOTAL_ITEM_WIDTH = CARD_WIDTH + CARD_MARGIN;

const PROMOS = [
  {
    id: '1',
    title: '50% OFF',
    subtitle: 'En tu primera orden',
    color: '#ce3333ff', 
    image: require('../../../../assets/banners/1.jpg'), // Usa tus imágenes
  },
  {
    id: '2',
    title: 'Envío GRATIS',
    subtitle: 'Todo el fin de semana',
    color: '#4e50cdff', 
    image: require('../../../../assets/banners/2.jpg'),
  },
  {
    id: '3',
    title: '2x1 Burgers',
    subtitle: 'Solo por hoy',
    color: '#ff7a3dff', 
    image: require('../../../../assets/banners/3.webp'),
  },
];

export const PromoSlider = () => {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      let nextIndex = currentIndex + 1;
      
      if (nextIndex >= PROMOS.length) {
        nextIndex = 0;
      }

      // Ordenamos al FlatList moverse
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
        viewPosition: 0.5 // Centra la tarjeta
      });

      setCurrentIndex(nextIndex);
    }, 4000); // <-- TIEMPO: Cambia cada 4 segundos (4000ms)

    // Limpieza: Apaga el motor si el usuario sale de la pantalla
    return () => clearInterval(interval);
  }, [currentIndex]);

  return (
    <View style={{ marginTop: 20 }}>
      <FlatList
        ref={flatListRef}
        data={PROMOS}
        horizontal
        showsHorizontalScrollIndicator={false}
        
        // Configuración de Snap (para que se sienta magnético al tocarlo)
        snapToInterval={TOTAL_ITEM_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 15 }}
        
        // Optimización necesaria para scrollToIndex
        getItemLayout={(data, index) => ({
          length: TOTAL_ITEM_WIDTH,
          offset: TOTAL_ITEM_WIDTH * index,
          index,
        })}

        keyExtractor={(item) => item.id}
        
        // Detectar si el usuario lo mueve manualmente para actualizar el índice
        onMomentumScrollEnd={(ev) => {
            const newIndex = Math.round(ev.nativeEvent.contentOffset.x / TOTAL_ITEM_WIDTH);
            setCurrentIndex(newIndex);
        }}

        renderItem={({ item }) => (
          <TouchableOpacity 
            activeOpacity={0.9}
            style={[styles.card, { backgroundColor: item.color }]}
          >
            <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
                <View style={styles.button}>
                    <Text style={styles.buttonText}>Ver ahora</Text>
                </View>
            </View>
            {/* Imagen ilustrativa */}
            <Image source={item.image} style={styles.image} resizeMode="contain"/>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH, 
    height: 160,
    borderRadius: 20,
    marginRight: CARD_MARGIN,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  textContainer: { flex: 0.6 },
  title: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 15 },
  button: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignSelf: 'flex-start' },
  buttonText: { fontSize: 12, fontWeight: 'bold' },
  image: { width: 100, height: 100 }
});