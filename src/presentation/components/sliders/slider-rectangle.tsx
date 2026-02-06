import React from "react";
import { View, Image, TouchableOpacity, ScrollView, StyleSheet, Text } from "react-native";
/* import { useRouter } from "expo-router";
 */
const SliderRectangle = () => {
  /*   const router = useRouter();
   */ return (
    <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={{ flex: 0.5 }}>
      <TouchableOpacity>
        <View style={{ flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Image source={require("../../../../assets/Icons/rectangle.png")} style={styles.Image} />
          <Text
            style={{
              marginTop: 5, 
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            Categoría
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity>
        <View style={{ flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Image source={require("../../../../assets/Icons/rectangle.png")} style={styles.Image} />
          <Text
            style={{
              marginTop: 5, // Espacio entre imagen y texto
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            Categoría
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity>
        <View style={{ flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Image source={require("../../../../assets/Icons/rectangle.png")} style={styles.Image} />
          <Text
            style={{
              marginTop: 5, // Espacio entre imagen y texto
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            Categoría
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity>
        <View style={{ flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Image source={require("../../../../assets/Icons/rectangle.png")} style={styles.Image} />
          <Text
            style={{
              marginTop: 5, // Espacio entre imagen y texto
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            Categoría
          </Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  Image: {
    height: 80,
    width: 80,
    flex: 0.2,
    marginStart: 11,
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

export default SliderRectangle;
