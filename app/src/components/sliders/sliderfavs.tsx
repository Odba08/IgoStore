import React from "react";
import { View, Image, TouchableOpacity, ScrollView, StyleSheet, Text } from "react-native";


const SliderFavs = () => {
  return (
    <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={{ flex: 0.5 }}>

      <TouchableOpacity>
        <Image source={require("../../../../assets/Icons/rectangle.png")} style={styles.Image} />
        <View style={styles.overlay}></View>
         <View style={{flexDirection: 'row', padding: 15}}>
    
              <View style={{flexDirection: 'column'}}>
              <Text style={{ fontSize: 18, fontWeight: "bold"}}>
                Nombre del resturante
              </Text>
              <Text>
                45min - 875 mts
              </Text>
              <Text>
                Categorias del Restaurante
              </Text>
              </View>
              </View>
      </TouchableOpacity>

      <TouchableOpacity>
        <Image source={require("../../../../assets/Icons/rectangle.png")} style={styles.Image} />

        <View style={styles.overlay}></View>

        <View style={{flexDirection: 'row', padding: 15}}>
            
           
            <View style={{flexDirection: 'column'}}>
            <Text style={{ fontSize: 18, fontWeight: "bold"}}>
              Nombre del resturante
            </Text>
            <Text>
              45min - 875 mts
            </Text>
            <Text>
              Categorias del Restaurante
            </Text>
            </View>
            </View>
      </TouchableOpacity>

      <TouchableOpacity>
        <Image source={require("../../../../assets/Icons/rectangle.png")} style={styles.Image} />

        <View style={styles.overlay}></View>

        <View style={{flexDirection: 'row', padding: 15}}>
            
           
            <View style={{flexDirection: 'column'}}>
            <Text style={{ fontSize: 18, fontWeight: "bold"}}>
              Nombre del resturante
            </Text>
            <Text>
              45min - 875 mts
            </Text>
            <Text>
              Categorias del Restaurante
            </Text>
            </View>
            </View>
      </TouchableOpacity>

       
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  Image: {
    height: 150,
    width: 230,
    flex: 0.2,
    marginStart: 12,
    margin: 8,
    borderRadius: 10,
    
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    /*  backgroundColor: 'rgba(0, 0, 0, 0.35)',  */
    justifyContent: "flex-end",

    marginStart: 8,
    borderRadius: 10,
  },

  buttonContainer: {
    marginBottom: 8,
  },
  gradient: {
    borderRadius: 50,
    width: 120,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default SliderFavs;
