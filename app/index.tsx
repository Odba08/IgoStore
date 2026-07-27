import { StatusBar } from "expo-status-bar";
import { ScrollView, Text, View, FlatList, TouchableOpacity, TextInput, StyleSheet, Image, ActivityIndicator, Alert, Clipboard } from "react-native";
import { useRouter } from "expo-router";
import { useAllProducts } from "@/presentation/hooks/useProducts";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { useBusinesses } from "@/presentation/hooks/useBusiness";
import LoadingScreen from "@/presentation/components/loading";
import PrincipalHeader from "@/presentation/components/headers/header";
import { CategoryList } from "@/presentation/components/categoryList/categoryList";
import { PromoSlider } from "@/presentation/components/promoSlider/PromoSlider";
import { BusinessCard } from "@/presentation/components/businessCard/businessCard";
import { useFavoritesStore } from "@/presentation/store/useFavoriteStore";
import { useCartStore } from "@/presentation/store/useCartStore";
import { useLocationStore } from "@/presentation/store/useLocationStore";

export default function Index() {
  const router = useRouter();

  // 1. CARGA DE DATOS
  const { data: businesses, isLoading: loadingBusiness, error } = useBusinesses();
  const { data: products, isLoading: productsLoading } = useAllProducts();

  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'favorites' | 'addresses' | 'payments'>('home');

  const favorites = useFavoritesStore(state => state.favorites);
  const items = useCartStore(state => state.items);
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  // Ubicaciones del store global
  const { savedAddresses, removeSavedAddress } = useLocationStore();

  // 2. FUNCIÓN DE NAVEGACIÓN
  const handleSelectCategory = (id: string, name: string) => {
      router.push({
          pathname: "/category/[id]", 
          params: { id: id, name: name } 
      });
  };

  // 3. LÓGICA DE FILTRADO (Solo permitimos productos aprobados)
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchText) return [];
    
    return products.filter((p: any) => 
       p.isApproved && p.title.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [products, searchText]);

  const favoriteBusinesses = useMemo(() => {
    if (!businesses) return [];
    return businesses.filter(b => favorites.includes(b.id));
  }, [businesses, favorites]);

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
      <StatusBar style='dark' />
      <PrincipalHeader />

      <ScrollView contentContainerStyle={{ paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        
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
        ) : activeTab === 'favorites' ? (
           // PESTAÑA FAVORITAS
           <View style={{ marginTop: 10, paddingHorizontal: 20 }}>
             <Text style={[styles.sectionTitle, { marginLeft: 0, marginBottom: 15 }]}>Tus Tiendas Favoritas</Text>
             {favoriteBusinesses.length === 0 ? (
               <View style={{ alignItems: 'center', marginTop: 60, paddingBottom: 60 }}>
                 <Ionicons name="star-outline" size={48} color="#999" style={{ marginBottom: 10 }} />
                 <Text style={{ color: '#888', fontStyle: 'italic', textAlign: 'center' }}>
                   Aún no tienes tiendas favoritas. ¡Presiona la estrella en las tiendas para agregarlas aquí!
                 </Text>
               </View>
             ) : (
               <View style={{ gap: 15 }}>
                 {favoriteBusinesses.map((item) => (
                   <BusinessCard key={item.id} business={item} />
                 ))}
               </View>
             )}
           </View>
        ) : activeTab === 'addresses' ? (
           // PESTAÑA DIRECCIONES INDEPENDIENTE
           <View style={{ marginTop: 10, paddingHorizontal: 20 }}>
             <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
               <Text style={[styles.sectionTitle, { marginLeft: 0, marginBottom: 0 }]}>Mis Direcciones</Text>
               <TouchableOpacity 
                 style={styles.addAddressHeaderBtn}
                 onPress={() => router.push('/map')}
               >
                 <Ionicons name="add-circle-outline" size={20} color="#EDB422" />
                 <Text style={styles.addAddressHeaderText}>Nueva</Text>
               </TouchableOpacity>
             </View>
             
             {savedAddresses.length === 0 ? (
               <View style={{ alignItems: 'center', marginTop: 60, paddingBottom: 60 }}>
                 <Ionicons name="location-outline" size={48} color="#999" style={{ marginBottom: 10 }} />
                 <Text style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', marginBottom: 20 }}>
                   No tienes direcciones guardadas.
                 </Text>
                 <TouchableOpacity 
                   style={styles.addAddressBtn} 
                   onPress={() => router.push('/map')}
                 >
                   <Text style={styles.addAddressBtnText}>Agregar Dirección</Text>
                 </TouchableOpacity>
               </View>
             ) : (
               <View style={{ gap: 15 }}>
                 {savedAddresses.map((addr: any) => (
                   <View key={addr.id} style={styles.addressCard}>
                     <Ionicons name="location-sharp" size={24} color="#EDB422" style={{ marginRight: 12 }} />
                     <View style={{ flex: 1 }}>
                       <Text style={styles.addressLabel}>{addr.label}</Text>
                       <Text style={styles.addressText} numberOfLines={2}>{addr.address}</Text>
                     </View>
                     <TouchableOpacity 
                       style={styles.deleteAddressBtn} 
                       onPress={() => {
                         Alert.alert(
                           "Eliminar dirección",
                           `¿Seguro que deseas eliminar "${addr.label}"?`,
                           [
                             { text: "Cancelar", style: "cancel" },
                             { text: "Eliminar", style: "destructive", onPress: () => removeSavedAddress(addr.id) }
                           ]
                         );
                       }}
                     >
                       <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                     </TouchableOpacity>
                   </View>
                 ))}
               </View>
             )}
           </View>
        ) : activeTab === 'payments' ? (
           // PESTAÑA MÉTODOS DE PAGO INDEPENDIENTE
           <View style={{ marginTop: 10, paddingHorizontal: 20 }}>
             <Text style={[styles.sectionTitle, { marginLeft: 0, marginBottom: 15 }]}>Métodos de Pago</Text>
             
             <View style={{ gap: 15 }}>
               {/* Pago Móvil */}
               <View style={styles.paymentCard}>
                 <View style={styles.paymentCardHeader}>
                   <Ionicons name="phone-portrait-outline" size={24} color="#EDB422" style={{ marginRight: 10 }} />
                   <Text style={styles.paymentCardTitle}>Pago Móvil Mercantil</Text>
                 </View>
                 <View style={styles.paymentCardBody}>
                   <Text style={styles.paymentDetailLine}>
                     <Text style={{ fontWeight: 'bold' }}>C.I.:</Text> 27284670
                   </Text>
                   <Text style={styles.paymentDetailLine}>
                     <Text style={{ fontWeight: 'bold' }}>Teléfono:</Text> 04127687819
                   </Text>
                 </View>
                 <TouchableOpacity 
                   style={styles.copyButton}
                   onPress={() => {
                     Clipboard.setString("27284670\n04127687819");
                     Alert.alert("Copiado", "Datos de Pago Móvil copiados al portapapeles.");
                   }}
                 >
                   <Ionicons name="copy-outline" size={16} color="#333" />
                   <Text style={styles.copyButtonText}>Copiar Datos</Text>
                 </TouchableOpacity>
               </View>

               {/* Binance Pay */}
               <View style={styles.paymentCard}>
                 <View style={styles.paymentCardHeader}>
                   <Ionicons name="wallet-outline" size={24} color="#EDB422" style={{ marginRight: 10 }} />
                   <Text style={styles.paymentCardTitle}>Binance Pay</Text>
                 </View>
                 <View style={styles.paymentCardBody}>
                   <Text style={styles.paymentDetailLine}>
                     <Text style={{ fontWeight: 'bold' }}>Email:</Text> ingo@gmail.com
                   </Text>
                 </View>
                 <TouchableOpacity 
                   style={styles.copyButton}
                   onPress={() => {
                     Clipboard.setString("ingo@gmail.com");
                     Alert.alert("Copiado", "Email de Binance copiado al portapapeles.");
                   }}
                 >
                   <Ionicons name="copy-outline" size={16} color="#333" />
                   <Text style={styles.copyButtonText}>Copiar Email</Text>
                 </TouchableOpacity>
               </View>

               {/* Zelle */}
               <View style={styles.paymentCard}>
                 <View style={styles.paymentCardHeader}>
                   <Ionicons name="send-outline" size={24} color="#EDB422" style={{ marginRight: 10 }} />
                   <Text style={styles.paymentCardTitle}>Zelle</Text>
                 </View>
                 <View style={styles.paymentCardBody}>
                   <Text style={styles.paymentDetailLine}>
                     <Text style={{ fontWeight: 'bold' }}>Email:</Text> ingo@gmail.com
                   </Text>
                 </View>
                 <TouchableOpacity 
                   style={styles.copyButton}
                   onPress={() => {
                     Clipboard.setString("ingo@gmail.com");
                     Alert.alert("Copiado", "Email de Zelle copiado al portapapeles.");
                   }}
                 >
                   <Ionicons name="copy-outline" size={16} color="#333" />
                   <Text style={styles.copyButtonText}>Copiar Email</Text>
                 </TouchableOpacity>
               </View>
             </View>
           </View>
        ) : (
           // HOME NORMAL
           <>
             <CategoryList onSelectCategory={handleSelectCategory} />
             
             <PromoSlider />

             <View style={{ marginTop: 20 }}>
                <View style={styles.headerRow}>
                    <Text style={styles.sectionTitle}>Tiendas destacadas</Text>
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

      {/* FLOATING CART BUTTON */}
      {totalItems > 0 && (
        <TouchableOpacity 
          style={styles.floatingCartButton} 
          onPress={() => router.push('/cart/cart')}
        >
          <Ionicons name="cart" size={20} color="#000" style={{ marginRight: 8 }} />
          <Text style={styles.floatingCartText}>Sigue con tu compra ({totalItems})</Text>
          <Ionicons name="arrow-forward" size={16} color="#000" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      )}

      {/* --- LA INYECCIÓN TÁCTICA: BOTTOM NAVIGATION BAR --- */}
      <View style={styles.bottomBar}>
          
          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => setActiveTab('home')}
          >
              <Ionicons 
                name="home" 
                size={22} 
                color={activeTab === 'home' ? '#1a1a1a' : '#888'} 
              />
              <Text style={[styles.tabText, activeTab === 'home' && { color: '#1a1a1a', fontWeight: 'bold' }]}>
                Inicio
              </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => setActiveTab('favorites')}
          >
              <Ionicons 
                name={activeTab === 'favorites' ? 'star' : 'star-outline'} 
                size={22} 
                color={activeTab === 'favorites' ? '#EDB422' : '#888'} 
              />
              <Text style={[styles.tabText, activeTab === 'favorites' && { color: '#1a1a1a', fontWeight: 'bold' }]}>
                Favoritos
              </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => setActiveTab('addresses')}
          >
              <Ionicons 
                name={activeTab === 'addresses' ? "location" : "location-outline"} 
                size={22} 
                color={activeTab === 'addresses' ? '#EDB422' : '#888'} 
              />
              <Text style={[styles.tabText, activeTab === 'addresses' && { color: '#1a1a1a', fontWeight: 'bold' }]}>
                Direcciones
              </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => router.push("/orders")}
          >
              <Ionicons name="receipt-outline" size={22} color="#888" />
              <Text style={styles.tabText}>Pedidos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => setActiveTab('payments')}
          >
              <Ionicons 
                name={activeTab === 'payments' ? "card" : "card-outline"} 
                size={22} 
                color={activeTab === 'payments' ? '#EDB422' : '#888'} 
              />
              <Text style={[styles.tabText, activeTab === 'payments' && { color: '#1a1a1a', fontWeight: 'bold' }]}>
                Métodos Pago
              </Text>
          </TouchableOpacity>

      </View>
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
  resultItem: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
      marginHorizontal: 20, marginBottom: 10, padding: 10, borderRadius: 12,
      shadowColor: '#000', shadowOpacity: 0.05, elevation: 2
  },

  // --- FLOATING CART BUTTON ---
  floatingCartButton: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFDB58',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 99
  },
  floatingCartText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000'
  },

  // --- ESTILOS DE LA BARRA INFERIOR ---
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 75,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    elevation: 10,
    zIndex: 99
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabText: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
    fontWeight: '500'
  },

  // --- ESTILOS DE LA PESTAÑA DIRECCIONES ---
  addAddressHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  addAddressHeaderText: {
    fontSize: 14,
    color: '#EDB422',
    fontWeight: 'bold'
  },
  addAddressBtn: {
    backgroundColor: '#FFDB58',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20
  },
  addAddressBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000'
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EBEBEB'
  },
  addressLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333'
  },
  addressText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2
  },
  deleteAddressBtn: {
    padding: 8
  },

  // --- ESTILOS DE LA PESTAÑA MÉTODOS DE PAGO ---
  paymentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EBEBEB'
  },
  paymentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  paymentCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333'
  },
  paymentCardBody: {
    marginBottom: 12
  },
  paymentDetailLine: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333'
  }
});