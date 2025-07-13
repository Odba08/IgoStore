import SliderRectangle from '@/app/src/components/sliders/slider-rectangle';
import SliderFavs from '@/app/src/components/sliders/sliderfavs';
import Sliderscroll from '@/app/src/components/sliders/sliderscroll';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Restaurantes from '../restaurantes/restaurantes';

const Productos = () => {

  const router = useRouter();
  return (
  <ScrollView>

  
 <View style={styles.header}>
      <View style={styles.iconRow}>
         <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name='chevron-back-outline' size={25} color='#000' style={styles.icon} />
         </TouchableOpacity>
      </View>


      <View style={styles.locationBox}>
        <Ionicons name='location-outline' size={20} color='#6528FF' />
        <Text numberOfLines={1} style={styles.locationText}>
          Calle 1 con av. 23
        </Text>
        <Ionicons name='chevron-down' size={18} color='#5D5D5D' />
      </View>

      <View style={styles.iconRow}>
        <Ionicons name='cart-outline' size={30} color='#000' style={styles.icon} />
      </View>
    </View>

     <TextInput
              style={{
                flex: 1,
                justifyContent: "center",
                backgroundColor: "#F5F5F5",
                padding: 20,
                margin: 15,
                borderRadius: 20,
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
               
              }}
            >
              ¿Qué te gustaría ordenar hoy?
        </TextInput>

        <SliderRectangle />
        <Sliderscroll />

        <Text style={{ fontSize: 25, fontWeight: "bold", paddingLeft: 20 }}>
          Favoritos
        </Text>
        <SliderFavs />

      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 10, padding: 10 }}>
          Todos los Restaurantes
        </Text>
      <Restaurantes/>
    </ScrollView>
  );
  
}


const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 50,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  locationBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    maxWidth: "70%",
  },
  locationText: {
    marginHorizontal: 5,
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
  borderRadius: 50,
  backgroundColor: 'white',
  borderColor: 'black',
  padding: 12,
  // Sombra para iOS
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  // Sombra para Android
  elevation: 5,
}
});
export default Productos;