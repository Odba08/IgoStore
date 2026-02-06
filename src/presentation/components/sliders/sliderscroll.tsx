import React from "react";
import { View, Image, TouchableOpacity, ScrollView, StyleSheet } from "react-native";

const Sliderscroll = () => {
 
  return (
    <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={{ flex: 0.5 }}>
      <Image source={require("../../../../assets/Icons/rectangle.png")} style={styles.Image} />
    
      <TouchableOpacity >
        <Image source={require("../../../../assets/Icons/rectangle.png")} style={styles.Image} />
        <View style={styles.overlay}></View>
      </TouchableOpacity>

      <TouchableOpacity >
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
