import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Business } from '@/infrastructure/interfaces/bussines-response'; // Asegura que la ruta sea correct
import { useRouter } from 'expo-router';

interface Props {
  business: Business;
}

export const BusinessCard = ({ business }: Props) => {
  const router = useRouter();
  const mainImage = business.images.length > 0 
    ? { uri: business.images[0].url } 
    : require('../../../../assets/images/adaptive-icon.png'); 

   const handlePress = () => {
  router.push({
    pathname: "/business/[id]", // La ruta tal cual como se llama el archivo
    params: { id: business.id } // Los parámetros van separados
  });
};

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={handlePress}>
      <View style={styles.imageContainer}>
        <Image source={mainImage} style={styles.image} resizeMode="cover" />
        {/* Badge de ejemplo (puedes dinamizarlo luego) */}
        <View style={styles.timeBadge}>
          <Text style={styles.timeText}>30-45 min</Text>
        </View>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>{business.name}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
            Restaurante destacado
        </Text>
        <Text style={styles.details}>Envío Gratis • ⭐ 4.5</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 250, // Ancho fijo para sliders horizontales
    backgroundColor: 'white',
    borderRadius: 16,
    marginRight: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Sombra para Android
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 140,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  timeBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  infoContainer: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  details: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00A86B', // Verde tipo UberEats/Rappi
  }
});