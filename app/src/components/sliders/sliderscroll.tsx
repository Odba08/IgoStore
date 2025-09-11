import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { View, Image, TouchableOpacity, ScrollView, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";

const Sliderscroll = () => {
  const router = useRouter();
  return (
    <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={{ flex: 0.5 }}>
      <Image source={require("../../../../assets/Icons/rectangle.png")} style={styles.Image} />
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.buttonContainer}>
          <LinearGradient
            colors={["#FFD580", "#FFCC00"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            <TouchableOpacity onPress={() => router.push("/src/features/products/products")}>
              <Text style={styles.text}>Ver más</Text>
            </TouchableOpacity>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push("/src/features/products/information")}>
        <Image source={require("../../../../assets/Icons/rectangle.png")} style={styles.Image} />
        <View style={styles.overlay}></View>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/src/features/products/tabcontent")}>
        <Image source={require("../../../../assets/Icons/rectangle.png")} style={styles.Image} />

        <View style={styles.overlay}></View>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  Image: {
    height: 150,
    width: 330,
    flex: 0.2,
    marginStart: 8,
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

export default Sliderscroll;
