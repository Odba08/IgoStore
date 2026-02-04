import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Business } from '@/infrastructure/interfaces/bussines-response';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // Importamos iconos para darle vida

interface Props {
  business: Business;
}

export const BusinessCard = ({ business }: Props) => {
  const router = useRouter();

  // Usamos un placeholder mejor si no hay imagen (o el adaptive-icon si no tienes otro)
  const mainImage = business.images.length > 0 
    ? { uri: business.images[0].url } 
    : require('../../../../assets/images/adaptive-icon.png'); 

  const handlePress = () => {
    router.push({
      pathname: "/business/[id]",
      params: { id: business.id }
    });
  };

  return (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.9} 
      onPress={handlePress}
    >
      {/* 1. CONTENEDOR DE IMAGEN (Ahora más alto) */}
      <View style={styles.imageContainer}>
        <Image source={mainImage} style={styles.image} resizeMode="cover" />
        
        {/* Badge de Tiempo (Abajo a la derecha) */}
        <View style={styles.timeBadge}>
          <Text style={styles.timeText}>30-45 min</Text>
        </View>

        {/* Badge de Rating (Nuevo - Arriba a la derecha) */}
        <View style={styles.ratingBadge}>
            <Ionicons name="star" size={10} color="black" />
            <Text style={styles.ratingText}>4.5</Text>
        </View>
      </View>
      
      {/* 2. INFORMACIÓN */}
      <View style={styles.infoContainer}>
        {/* Título y Verificado */}
        <View style={styles.row}>
            <Text style={styles.title} numberOfLines={1}>{business.name}</Text>
            {/* Opcional: Icono de verificado */}
            {/* <Ionicons name="checkmark-circle" size={14} color="#00A86B" /> */}
        </View>

        <Text style={styles.subtitle} numberOfLines={1}>
           Restaurante destacado • Internacional
        </Text>
        
        {/* Línea de "Envío Gratis" con estilo píldora */}
        <View style={styles.footerRow}>
           <View style={styles.deliveryBadge}>
              <Ionicons name="bicycle" size={12} color="#00A86B" />
              <Text style={styles.deliveryText}>Envío Gratis</Text>
           </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 260, // Un poco más ancho para dar presencia
    backgroundColor: 'white',
    borderRadius: 16,
    marginRight: 15,
    marginBottom: 10,
    // Sombras estilo iOS (suaves y difusas)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, 
    shadowRadius: 10,
    elevation: 4, // Android
    borderWidth: 1,
    borderColor: '#F0F0F0', // Borde sutil para separar del fondo
  },
  imageContainer: {
    height: 140, // AUMENTADO: De 80 a 140. Esto es clave para que se vea "Pro"
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#E1E1E1', // Color de carga mientras llega la foto
  },
  // Badges flotantes sobre la imagen
  timeBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    shadowColor: "#000", shadowOpacity: 0.1, elevation: 2
  },
  timeText: { fontSize: 11, fontWeight: '800', color: '#333' },

  ratingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFDB58', // Amarillo marca
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    shadowColor: "#000", shadowOpacity: 0.1, elevation: 2
  },
  ratingText: { fontSize: 11, fontWeight: 'bold' },

  // Contenedor de texto
  infoContainer: {
    padding: 12,
    justifyContent: 'space-between',
    minHeight: 85, // Asegura consistencia si falta texto
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: {
    fontSize: 17,
    fontWeight: '800', // Más grueso para jerarquía
    color: '#1a1a1a',
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    fontWeight: '500'
  },
  footerRow: { marginTop: 10, flexDirection: 'row' },
  deliveryBadge: { 
      flexDirection: 'row', alignItems: 'center', gap: 5, 
      backgroundColor: '#E8F5E9', // Verde muy claro
      paddingHorizontal: 8, paddingVertical: 4, 
      borderRadius: 6 
  },
  details: { // (Ya no se usa, reemplazado por deliveryBadge)
    fontSize: 12, fontWeight: '600', color: '#00A86B' 
  },
  deliveryText: {
    fontSize: 12, fontWeight: '700', color: '#00A86B'
  }
});