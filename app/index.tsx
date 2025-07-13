import { StatusBar } from "expo-status-bar";
import React from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import PrincipalHeader from "./src/components/headers/header";
import SliderCircle from "./src/components/sliders/slider-circle";
import SliderProduct from "./src/components/sliders/slider-product";
import Sliderscroll from "./src/components/sliders/sliderscroll";
/* import { useRouter } from 'expo-router';
 */

export default function Index() {
/*   const router = useRouter(); */

  const images = [
    require("../assets/Icons/opciones/burger.png"),
    require("../assets/Icons/opciones/dog.png"),
    require("../assets/Icons/opciones/drink.png"),
    require("../assets/Icons/opciones/farm.png"),
  ];

  const image2 = [
    require("../assets/Icons/opciones/green.png"),
    require("../assets/Icons/opciones/keys.png"),
    require("../assets/Icons/opciones/rider.png"),
    require("../assets/Icons/opciones/cat.png"),
  ];

  return (
    <>

  {/*   <Stack.Screen
      options={{
        headerShown: false,
        contentStyle: { backgroundColor: "#ffffff" },
      }}
    /> */}


    <PrincipalHeader />

      <StatusBar style='dark' />

      <ScrollView>
        <TextInput
          style={{
            flex: 1,
            justifyContent: "center",
            backgroundColor: "white",
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
          Busca con IGO
        </TextInput>

        <Sliderscroll />

        <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 10, padding: 10 }}> Tiendas destacadas</Text>

        <SliderCircle />

        <View
          style={{
            borderWidth: 0.8,
            backgroundColor: "#e9e1e1",
            margin: 15,
            borderColor:"#e9e1e1",
            marginVertical: 25,
            padding: 0.8
          }}
        />

        <SliderProduct images={images} />
        <SliderProduct images={image2} />
      </ScrollView>
    </>
  );
}
