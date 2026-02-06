import { StatusBar } from "expo-status-bar";
import { ScrollView, Text, View, FlatList, TouchableOpacity, TextInput, StyleSheet, Image, ActivityIndicator } from "react-native";

import { useRouter } from "expo-router";

import { useAllProducts } from "@/presentation/hooks/useProducts";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { useBusinesses } from "@/presentation/hooks/useBusiness";
import LoadingScreen from "@/presentation/components/loading";
import PrincipalHeader from "@/presentation/components/headers/header";
import { CategoryList } from "@/presentation/components/categoryList/categoryList";
import { PromoSlider } from "@/presentation/components/home/promoSlider/PromoSlider";
import { BusinessCard } from "@/presentation/components/businessCard/businessCard";

export default function Index() {
  const router = useRouter();

  // 1. CARGA DE DATOS
  const { data: businesses, isLoading: loadingBusiness, error } = useBusinesses();
  const { data: products, isLoading: productsLoading } = useAllProducts();

  const [searchText, setSearchText] = useState('');

  // 2. FUNCIÓN DE NAVEGACIÓN (NUEVA)
  // Recibe ID y Nombre desde CategoryList y nos manda a la pantalla nueva
  const handleSelectCategory = (id: string, name: string) => {
      router.push({
          pathname: "/category/[id]", // La ruta del archivo que creamos antes
          params: { id: id, name: name } // Pasamos los datos
      });
  };

  // 3. LÓGICA DE FILTRADO (Productos)
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchText) return [];
    
    return products.filter((p: any) => 
       p.title.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [products, searchText]);


  if (loadingBusiness) {
    return (
      <LoadingScreen 
        imageSource={require("../assets/images/adaptive-icon.png")} 
        spinnerColor="#FFDB58" 
      />
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "red" }}>{error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <PrincipalHeader />
      <StatusBar style='dark' />

      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        
        {/* BUSCADOR */}
        <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={{marginRight: 10}} />
            <TextInput
                style={styles.searchInput}
                placeholder='Buscar comida, bebidas...'
                placeholderTextColor="#999"
                value={searchText}
                onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
            )}
        </View>

        {/* RESULTADOS DE BÚSQUEDA */}
        {searchText.length > 0 ? (
           <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Resultados</Text>
                
                {productsLoading ? (
                    <ActivityIndicator size="small" color="#000" style={{marginTop: 20}} />
                ) : filteredProducts.length === 0 ? (
                    <Text style={styles.emptyText}>No encontramos &quot;{searchText}&quot;</Text>
                ) : (
                    filteredProducts.map((item: any) => (
                        <TouchableOpacity 
                            key={item.id} 
                            style={styles.resultItem}
                            onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id }})}
                        >
                            <Image 
                                source={{ uri: item.images[0]?.url }} 
                                style={{ width: 50, height: 50, borderRadius: 8, backgroundColor: '#eee' }}
                            />
                            <View style={{marginLeft: 10, flex: 1}}>
                                <Text style={{fontWeight: 'bold'}}>{item.title}</Text>
                                <Text style={{color: 'green'}}>${item.price}</Text>
                            </View>
                            <Ionicons name="chevron-forward" color="#ccc" size={20}/>
                        </TouchableOpacity>
                    ))
                )}
           </View>
        ) : (
           // HOME NORMAL
           <>

             {/* AQUÍ ESTÁ EL CAMBIO CLAVE: Pasamos la función */}
             <CategoryList onSelectCategory={handleSelectCategory} />
           {/* <View style={styles.divider} /> */}
             
             <PromoSlider />

             <View style={{ marginTop: 20 }}>
                <View style={styles.headerRow}>
                    <Text style={styles.sectionTitle}>Tiendas destacadas{/*  ({businesses?.length ?? 0}) */}</Text>
                    <TouchableOpacity onPress={() => router.push("/products")}>
                       <Text style={{ color: '#EDB422', fontWeight: 'bold' }}>Ver más</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    horizontal
                    data={businesses?.slice(0, 4)}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <BusinessCard business={item} />}
                    contentContainerStyle={{ paddingHorizontal: 15 }}
                    showsHorizontalScrollIndicator={false}
                />
             </View>

             
             
           </>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F2F4F7' }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: "white", paddingHorizontal: 15, height: 50,
    marginHorizontal: 20, marginTop: 10, marginBottom: 10,
    borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.05, elevation: 3
  },
  searchInput: { flex: 1, fontSize: 16, color: '#333' },
  sectionContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginLeft: 20, marginBottom: 10, color: '#1a1a1a' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20, marginBottom: 10 },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#888', fontStyle: 'italic' },
  divider: { height: 1, backgroundColor: "#E0E0E0", marginVertical: 20, marginHorizontal: 20 },
  resultItem: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
      marginHorizontal: 20, marginBottom: 10, padding: 10, borderRadius: 12,
      shadowColor: '#000', shadowOpacity: 0.05, elevation: 2
  }
});