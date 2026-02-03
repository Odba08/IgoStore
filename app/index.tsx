import { StatusBar } from "expo-status-bar";
import { ScrollView, Text, TextInput, View, Image, FlatList, TouchableOpacity } from "react-native";
import { useBusinesses } from "@/presentation/hooks/Bussiness";
import PrincipalHeader from "./src/components/headers/header";
import SliderProduct from "./src/components/sliders/slider-product";
import Sliderscroll from "./src/components/sliders/sliderscroll";
import LoadingScreen from "./src/components/loading";
import { BusinessCard } from "./src/components/businessCard/businessCard";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();

  const { data: businesses, isLoading: loading, error } = useBusinesses();

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


 if (loading) {
  return (
    <LoadingScreen 
      imageSource={require("../assets/images/adaptive-icon.png")} 
      spinnerColor="#FFDB58" 
    />
  );
}

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "red" }}>{error.message}</Text>
      </View>
    );
  }

  return (
    <>
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
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
          placeholder='Busca con IGO'
        />

        <Sliderscroll />

       {/*  <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 10, padding: 10 }}>
          Tiendas destacadas ({businesses?.length ?? 0})
        </Text> */}

        <View style={{ marginTop: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, marginBottom: 15 }}>
                <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                  Tiendas destacadas ({businesses?.length ?? 0})
                </Text>
                {/* Botón opcional para ver todos */}
                 <TouchableOpacity onPress={() => router.push("/src/features/products/products")}>
                <Text style={{ color: '#EDB422', fontWeight: 'bold' }}>Ver más</Text>
                  </TouchableOpacity>
            </View>

            {/* Aquí usamos FlatList horizontal para mejor performance que .map */}
            <FlatList
                horizontal
                data={businesses}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => <BusinessCard business={item} />}
                contentContainerStyle={{ paddingHorizontal: 15 }}
                showsHorizontalScrollIndicator={false}
            />
        </View>

       {/*  <SliderCircle /> */}

        <View
          style={{
            borderWidth: 0.8,
            backgroundColor: "#e9e1e1",
            margin: 15,
            borderColor: "#e9e1e1",
            marginVertical: 25,
            padding: 0.8,
          }}
        />

        <SliderProduct images={images} />
        <SliderProduct images={image2} />


      {/*   <View style={{ padding: 15 }}>
          <Text style={{ fontWeight: "bold", marginBottom: 10 }}>Datos de API:</Text>
      {businesses?.map((business) => (
        <View key={business.id} style={{ marginBottom: 10 }}>
          <Text style={{ marginBottom: 5 }}>
            • {business.name} - {business.images.length} imágenes
          </Text>
          <Image
            source={{ uri: business.images[0]?.url }}
            style={{ width: 100, height: 100, borderRadius: 10 }} 
          />
        </View>
      ))}
        </View> */}
      </ScrollView>
    </>
  );
}
