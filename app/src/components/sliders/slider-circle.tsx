import React from "react";
import { ScrollView, TouchableOpacity, Image, StyleSheet } from "react-native";

const SliderCircle = () => {
  return (
    <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={{ flex: 0.5 }}>
      <TouchableOpacity>
        <Image source={require("../../../../assets/Icons/circle.png")} style={style.image} />
      </TouchableOpacity>
      <TouchableOpacity>
        <Image source={require("../../../../assets/Icons/circle.png")} style={style.image} />
      </TouchableOpacity>
      <TouchableOpacity>
        <Image source={require("../../../../assets/Icons/circle.png")} style={style.image} />
      </TouchableOpacity>
      <TouchableOpacity>
        <Image source={require("../../../../assets/Icons/circle.png")} style={style.image} />
      </TouchableOpacity>
      <TouchableOpacity>
        <Image source={require("../../../../assets/Icons/circle.png")} style={style.image} />
      </TouchableOpacity>
      <TouchableOpacity>
        <Image source={require("../../../../assets/Icons/circle.png")} style={style.image} />
      </TouchableOpacity>
      <TouchableOpacity>
        <Image source={require("../../../../assets/Icons/circle.png")} style={style.image} />
      </TouchableOpacity>
      <TouchableOpacity>
        <Image source={require("../../../../assets/Icons/circle.png")} style={style.image} />
      </TouchableOpacity>
      <TouchableOpacity>
        <Image source={require("../../../../assets/Icons/circle.png")} style={style.image} />
      </TouchableOpacity>
      <TouchableOpacity>
        <Image source={require("../../../../assets/Icons/circle.png")} style={style.image} />
        <Image source={require("../../../../assets/Icons/circle.png")} style={style.image} />
      </TouchableOpacity>
      <TouchableOpacity>
        <Image source={require("../../../../assets/Icons/circle.png")} style={style.image} />
      </TouchableOpacity>
    </ScrollView>
  );
};

const style = StyleSheet.create({
  image: {
    height: 60,
    width: 60,
    flex: 0.2,
    marginStart: 8,
  },
});

export default SliderCircle;
