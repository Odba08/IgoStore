import { StatusBar } from "expo-status-bar";
import { ScrollView, Text, View, FlatList, TouchableOpacity, TextInput, StyleSheet, Image, ActivityIndicator, Alert, Clipboard, Modal } from "react-native";
import { useRouter } from "expo-router";
import { useAllProducts } from "@/presentation/hooks/useProducts";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState, useEffect } from "react";
import { useBusinesses } from "@/presentation/hooks/useBusiness";
import LoadingScreen from "@/presentation/components/loading";
import PrincipalHeader from "@/presentation/components/headers/header";
import { CategoryList } from "@/presentation/components/categoryList/categoryList";
import { PromoSlider } from "@/presentation/components/promoSlider/PromoSlider";
import { BusinessCard } from "@/presentation/components/businessCard/businessCard";
import { useFavoritesStore } from "@/presentation/store/useFavoriteStore";
import { useCartStore } from "@/presentation/store/useCartStore";
import { useLocationStore } from "@/presentation/store/useLocationStore";
import { useAuthStore } from "@/presentation/store/useAuthStore";
import { igoApi } from "@/infrastructure/api/igo.api";
import { getPendingDeliveriesApi, updateOrderApi, getOrderQuoteApi } from "@/infrastructure/api/orders.api";
import MapView, { Marker, Polyline } from 'react-native-maps';

export default function Index() {
  const router = useRouter();
  const { user } = useAuthStore();

  // 1. CARGA DE DATOS CLIENTE
  const { data: businesses, isLoading: loadingBusiness, error } = useBusinesses();
  const { data: products, isLoading: productsLoading } = useAllProducts();

  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'favorites' | 'addresses' | 'payments'>('home');

  const favorites = useFavoritesStore(state => state.favorites);
  const items = useCartStore(state => state.items);
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  // Ubicaciones del store global
  const { savedAddresses, removeSavedAddress, initStore } = useLocationStore();

  // 1.5 LÓGICA DE MOTORIZADO / TRABAJADOR
  const isEmployee = user?.roles.includes('empleado') || user?.roles.includes('worker');
  const [employeeStatus, setEmployeeStatus] = useState<string>('inactive');
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [myAssignedOrders, setMyAssignedOrders] = useState<any[]>([]);
  const [loadingDriverData, setLoadingDriverData] = useState<boolean>(false);

  // Mapa
  const [selectedRouteOrder, setSelectedRouteOrder] = useState<any | null>(null);
  const [routePolyline, setRoutePolyline] = useState<any[]>([]);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);
  const [showMapModal, setShowMapModal] = useState<boolean>(false);

  const fetchDriverData = async () => {
    if (!user) return;
    try {
      // Obtener el estado de servicio del empleado
      const userRes = await igoApi.get(`/users/${user.id}`);
      setEmployeeStatus(userRes.data.employeeStatus || 'inactive');

      // Obtener los pedidos pendientes sin motorizado
      const pendingRes = await getPendingDeliveriesApi();
      setPendingOrders(pendingRes.data);

      // Obtener todas las órdenes y filtrar las mías activas (no entregadas/canceladas)
      const allRes = await igoApi.get('/orders');
      const myAssigned = allRes.data.filter((ord: any) => 
        ord.deliveryUser?.id === user.id && 
        ord.status !== 'DELIVERED' && 
        ord.status !== 'CANCELLED'
      );
      setMyAssignedOrders(myAssigned);
    } catch (err) {
      console.error("Error loading driver dashboard:", err);
    }
  };

  useEffect(() => {
    initStore();
  }, []);

  useEffect(() => {
    if (isEmployee) {
      fetchDriverData();
      // Polling cada 10 segundos
      const interval = setInterval(fetchDriverData, 10000);
      return () => clearInterval(interval);
    }
  }, [isEmployee]);

  const handleClaimOrder = async (orderId: string) => {
    try {
      setLoadingDriverData(true);
      await updateOrderApi(orderId, { deliveryUserId: user?.id, status: 'ON_WAY' });
      Alert.alert("Pedido Tomado", "Has tomado este pedido con éxito. Ve a tu sección de Entregas Activas.");
      await fetchDriverData();
    } catch (err) {
      console.error("Error claiming order:", err);
      Alert.alert("Error", "No se pudo reclamar el pedido.");
    } finally {
      setLoadingDriverData(false);
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    try {
      setLoadingDriverData(true);
      await updateOrderApi(orderId, { status: 'DELIVERED' });
      Alert.alert("Pedido Entregado", "¡Buen trabajo! El pedido ha sido completado.");
      await fetchDriverData();
    } catch (err) {
      console.error("Error completing order:", err);
      Alert.alert("Error", "No se pudo completar el pedido.");
    } finally {
      setLoadingDriverData(false);
    }
  };

  const handleOpenMap = async (order: any) => {
    try {
      setShowMapModal(true);
      setSelectedRouteOrder(order);
      setLoadingRoute(true);
      
      const res = await getOrderQuoteApi({
        businessId: order.business.id,
        deliveryLat: order.deliveryLat,
        deliveryLong: order.deliveryLong
      });
      
      if (res.data && res.data.routePolyline) {
        setRoutePolyline(res.data.routePolyline);
      } else {
        setRoutePolyline([
          { latitude: order.business.latitude, longitude: order.business.longitude },
          { latitude: order.deliveryLat, longitude: order.deliveryLong }
        ]);
      }
    } catch (err) {
      console.error("Error loading route polyline:", err);
      setRoutePolyline([
        { latitude: order.business.latitude, longitude: order.business.longitude },
        { latitude: order.deliveryLat, longitude: order.deliveryLong }
      ]);
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleChangeStatus = () => {
    Alert.alert(
      "Cambiar Estado de Servicio",
      "Selecciona tu estado actual:",
      [
        {
          text: "Trabajando 🟢",
          onPress: async () => {
            try {
              await igoApi.patch(`/users/${user?.id}`, { employeeStatus: 'active' });
              setEmployeeStatus('active');
            } catch (err) {
              Alert.alert("Error", "No se pudo cambiar el estado.");
            }
          }
        },
        {
          text: "De descanso 🟡",
          onPress: async () => {
            try {
              await igoApi.patch(`/users/${user?.id}`, { employeeStatus: 'break' });
              setEmployeeStatus('break');
            } catch (err) {
              Alert.alert("Error", "No se pudo cambiar el estado.");
            }
          }
        },
        {
          text: "Fuera de Servicio 🔴",
          onPress: async () => {
            try {
              await igoApi.patch(`/users/${user?.id}`, { employeeStatus: 'inactive' });
              setEmployeeStatus('inactive');
            } catch (err) {
              Alert.alert("Error", "No se pudo cambiar el estado.");
            }
          }
        },
        {
          text: "Cancelar",
          style: "cancel"
        }
      ]
    );
  };

  // 2. FUNCIÓN DE NAVEGACIÓN CLIENTE
  const handleSelectCategory = (id: string, name: string) => {
      router.push({
          pathname: "/category/[id]", 
          params: { id: id, name: name } 
      });
  };

  // 3. LÓGICA DE FILTRADO CLIENTE (Solo permitimos productos aprobados)
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

  if (loadingBusiness && !isEmployee) {
    return (
      <LoadingScreen 
        imageSource={require("../assets/images/adaptive-icon.png")} 
        spinnerColor="#FFDB58" 
      />
    );
  }

  if (error && !isEmployee) {
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

      <ScrollView contentContainerStyle={{ paddingBottom: isEmployee ? 60 : 160 }} showsVerticalScrollIndicator={false}>
        
        {/* BUSCADOR (Solo para clientes) */}
        {!isEmployee && (
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
        )}

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
        ) : activeTab === 'home' && isEmployee ? (
           // DASHBOARD DEL MOTORIZADO / EMPLEADO
           <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
             {/* HEADER DE ESTADO DE SERVICIO */}
             <View style={styles.driverHeader}>
               <View style={{ flex: 1 }}>
                 <Text style={{ fontSize: 13, color: '#666' }}>Hola, Motorizado</Text>
                 <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginTop: 2 }}>{user?.fullname}</Text>
               </View>
               <TouchableOpacity style={styles.statusIndicator} onPress={handleChangeStatus}>
                 <View style={[styles.statusDot, { 
                   backgroundColor: employeeStatus === 'active' ? '#4CD964' : employeeStatus === 'break' ? '#FFCC00' : '#FF3B30' 
                 }]} />
                 <Text style={[styles.statusText, {
                   color: employeeStatus === 'active' ? '#4CD964' : employeeStatus === 'break' ? '#EDB422' : '#FF3B30'
                 }]}>
                   {employeeStatus === 'active' ? 'Trabajando' : employeeStatus === 'break' ? 'De descanso' : 'Fuera de Servicio'}
                 </Text>
               </TouchableOpacity>
             </View>

             <TouchableOpacity style={styles.refreshBtn} onPress={fetchDriverData}>
               <Ionicons name="refresh-outline" size={16} color="#666" style={{ marginRight: 6 }} />
               <Text style={{ fontSize: 13, color: '#666', fontWeight: 'bold' }}>Actualizar Pedidos</Text>
             </TouchableOpacity>

             {/* SECCIÓN 1: ENTREGAS ACTIVAS (ASIGNADAS) */}
             <Text style={styles.driverSectionTitle}>Mis Entregas Activas ({myAssignedOrders.length})</Text>
             {myAssignedOrders.length === 0 ? (
               <View style={styles.emptyDriverBox}>
                 <Ionicons name="bicycle-outline" size={32} color="#aaa" />
                 <Text style={styles.emptyDriverText}>No tienes entregas asignadas actualmente.</Text>
               </View>
             ) : (
               <View style={{ gap: 15 }}>
                 {myAssignedOrders.map((order) => (
                   <View key={order.id} style={styles.orderCard}>
                      <View style={styles.orderCardHeader}>
                        <View>
                          <Text style={styles.orderTitle}>Pedido #{String(order.orderNumber).padStart(4, '0')}</Text>
                          {order.category === "Comida" ? (
                            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEE2E2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4, alignSelf: 'flex-start' }}>
                              <Ionicons name="flame" size={12} color="#EF4444" style={{ marginRight: 3 }} />
                              <Text style={{ fontSize: 10, color: "#EF4444", fontWeight: "bold" }}>¡MANTENER CALIENTE!</Text>
                            </View>
                          ) : order.category ? (
                            <View style={{ backgroundColor: "#F1F5F9", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4, alignSelf: 'flex-start' }}>
                              <Text style={{ fontSize: 10, color: "#475569", fontWeight: "bold" }}>{order.category}</Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={styles.statusBadge}>
                          <Text style={styles.statusBadgeText}>{order.status}</Text>
                        </View>
                      </View>
                     
                     <View style={styles.orderCardBody}>
                       <Text style={styles.orderDetailText}>
                         <Text style={{ fontWeight: 'bold' }}>Local:</Text> {order.business?.name}
                       </Text>
                       <Text style={styles.orderDetailText}>
                         <Text style={{ fontWeight: 'bold' }}>Destino:</Text> {order.deliveryAddress}
                       </Text>
                       <View style={styles.orderCostRow}>
                         <Text style={styles.orderCostText}>Total: ${order.totalAmount.toFixed(2)}</Text>
                         <Text style={styles.feeText}>Envío: ${order.deliveryFee.toFixed(2)}</Text>
                       </View>
                     </View>

                     <View style={styles.cardActions}>
                       <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F1F5F9' }]} onPress={() => handleOpenMap(order)}>
                         <Ionicons name="map-outline" size={18} color="#333" style={{ marginRight: 6 }} />
                         <Text style={[styles.actionBtnText, { color: '#333' }]}>Ver Ruta</Text>
                       </TouchableOpacity>
                       <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4CD964' }]} onPress={() => handleCompleteOrder(order.id)}>
                         <Ionicons name="checkmark-circle-outline" size={18} color="white" style={{ marginRight: 6 }} />
                         <Text style={[styles.actionBtnText, { color: 'white' }]}>Completar</Text>
                       </TouchableOpacity>
                     </View>
                   </View>
                 ))}
               </View>
             )}

             {/* SECCIÓN 2: PEDIDOS PENDIENTES EN LA PLATAFORMA */}
             <Text style={[styles.driverSectionTitle, { marginTop: 25 }]}>Pedidos Disponibles ({pendingOrders.length})</Text>
             {pendingOrders.length === 0 ? (
               <View style={styles.emptyDriverBox}>
                 <Ionicons name="albums-outline" size={32} color="#aaa" />
                 <Text style={styles.emptyDriverText}>No hay pedidos disponibles en la plataforma.</Text>
               </View>
             ) : (
               <View style={{ gap: 15 }}>
                 {pendingOrders.map((order) => (
                   <View key={order.id} style={styles.orderCard}>
                      <View style={styles.orderCardHeader}>
                        <View>
                          <Text style={styles.orderTitle}>Pedido #{String(order.orderNumber).padStart(4, '0')}</Text>
                          {order.category === "Comida" ? (
                            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEE2E2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4, alignSelf: 'flex-start' }}>
                              <Ionicons name="flame" size={12} color="#EF4444" style={{ marginRight: 3 }} />
                              <Text style={{ fontSize: 10, color: "#EF4444", fontWeight: "bold" }}>¡COMIDA CALIENTE!</Text>
                            </View>
                          ) : order.category ? (
                            <View style={{ backgroundColor: "#F1F5F9", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4, alignSelf: 'flex-start' }}>
                              <Text style={{ fontSize: 10, color: "#475569", fontWeight: "bold" }}>{order.category}</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={{ fontSize: 12, color: '#888' }}>Disponible</Text>
                      </View>

                     <View style={styles.orderCardBody}>
                       <Text style={styles.orderDetailText}>
                         <Text style={{ fontWeight: 'bold' }}>Local:</Text> {order.business?.name}
                       </Text>
                       <Text style={styles.orderDetailText}>
                         <Text style={{ fontWeight: 'bold' }}>Destino:</Text> {order.deliveryAddress}
                       </Text>
                       <View style={styles.orderCostRow}>
                         <Text style={styles.orderCostText}>Total: ${order.totalAmount.toFixed(2)}</Text>
                         <Text style={styles.feeText}>Envío: ${order.deliveryFee.toFixed(2)}</Text>
                       </View>
                     </View>

                     <View style={styles.cardActions}>
                       <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F1F5F9' }]} onPress={() => handleOpenMap(order)}>
                         <Ionicons name="map-outline" size={18} color="#333" style={{ marginRight: 6 }} />
                         <Text style={[styles.actionBtnText, { color: '#333' }]}>Ver Ruta</Text>
                       </TouchableOpacity>
                       <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFDB58' }]} onPress={() => handleClaimOrder(order.id)}>
                         <Ionicons name="bicycle-outline" size={18} color="black" style={{ marginRight: 6 }} />
                         <Text style={[styles.actionBtnText, { color: 'black' }]}>Tomar Pedido</Text>
                       </TouchableOpacity>
                     </View>
                   </View>
                 ))}
               </View>
             )}
           </View>
        ) : (
           // HOME NORMAL CLIENTE
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

      {/* FLOATING CART BUTTON (Solo para clientes) */}
      {!isEmployee && totalItems > 0 && (
        <TouchableOpacity 
          style={styles.floatingCartButton} 
          onPress={() => router.push('/cart/cart')}
        >
          <Ionicons name="cart" size={20} color="#000" style={{ marginRight: 8 }} />
          <Text style={styles.floatingCartText}>Sigue con tu compra ({totalItems})</Text>
          <Ionicons name="arrow-forward" size={16} color="#000" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      )}

      {/* MODAL DE MAPA DE RUTA PARA EL MOTORIZADO */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        onRequestClose={() => {
          setShowMapModal(false);
          setSelectedRouteOrder(null);
          setRoutePolyline([]);
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'white' }}>
          {selectedRouteOrder && (
            <>
              {loadingRoute ? (
                <View style={styles.center}>
                  <ActivityIndicator size="large" color="#FFDB58" />
                  <Text style={{ marginTop: 10, color: '#666' }}>Cargando ruta de entrega...</Text>
                </View>
              ) : (
                <View style={{ flex: 1 }}>
                  <MapView
                    style={{ flex: 1 }}
                    initialRegion={{
                      latitude: (selectedRouteOrder.business.latitude + selectedRouteOrder.deliveryLat) / 2,
                      longitude: (selectedRouteOrder.business.longitude + selectedRouteOrder.deliveryLong) / 2,
                      latitudeDelta: Math.abs(selectedRouteOrder.business.latitude - selectedRouteOrder.deliveryLat) * 2.5 || 0.05,
                      longitudeDelta: Math.abs(selectedRouteOrder.business.longitude - selectedRouteOrder.deliveryLong) * 2.5 || 0.05,
                    }}
                  >
                    {/* Marcador del Local */}
                    <Marker
                      coordinate={{
                        latitude: selectedRouteOrder.business.latitude,
                        longitude: selectedRouteOrder.business.longitude
                      }}
                      title={selectedRouteOrder.business.name}
                      description="Punto de Recogida"
                      pinColor="green"
                    />

                    {/* Marcador del Cliente */}
                    <Marker
                      coordinate={{
                        latitude: selectedRouteOrder.deliveryLat,
                        longitude: selectedRouteOrder.deliveryLong
                      }}
                      title="Cliente"
                      description={selectedRouteOrder.deliveryAddress}
                      pinColor="red"
                    />

                    {/* Línea de Ruta */}
                    {routePolyline.length > 0 && (
                      <Polyline
                        coordinates={routePolyline}
                        strokeColor="#6528FF"
                        strokeWidth={4}
                      />
                    )}
                  </MapView>

                  {/* Panel de Info Flotante */}
                  <View style={styles.mapInfoPanel}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>
                      Ruta del Pedido #{String(selectedRouteOrder.orderNumber).padStart(4, '0')}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                      <Text style={{ fontWeight: 'bold' }}>De:</Text> {selectedRouteOrder.business.name}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#666', marginTop: 2 }} numberOfLines={2}>
                      <Text style={{ fontWeight: 'bold' }}>Para:</Text> {selectedRouteOrder.deliveryAddress}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, alignItems: 'center' }}>
                      <Text style={{ fontSize: 14, color: '#00A86B', fontWeight: 'bold' }}>
                        Envío: ${selectedRouteOrder.deliveryFee.toFixed(2)}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#333', fontWeight: 'bold' }}>
                        Total: ${selectedRouteOrder.totalAmount.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}

          {/* Botón de Cerrar */}
          <TouchableOpacity 
            style={styles.closeMapBtn} 
            onPress={() => {
              setShowMapModal(false);
              setSelectedRouteOrder(null);
              setRoutePolyline([]);
            }}
          >
            <Ionicons name="close" size={24} color="black" />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* --- LA INYECCIÓN TÁCTICA: BOTTOM NAVIGATION BAR --- */}
      {!isEmployee && (
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
      )}
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
  },

  // --- ESTILOS PANEL MOTORIZADO ---
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    elevation: 2
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20
  },
  driverSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  emptyDriverBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    borderStyle: 'dashed'
  },
  emptyDriverText: {
    fontSize: 13,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    elevation: 2
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 10
  },
  orderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a1a'
  },
  statusBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  statusBadgeText: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: 'bold'
  },
  orderCardBody: {
    marginBottom: 12
  },
  orderDetailText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    marginBottom: 4
  },
  orderCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8
  },
  orderCostText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  feeText: {
    fontSize: 14,
    color: '#64748b'
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 1
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: 'bold'
  },

  // --- MAPA FLOTANTE ---
  mapInfoPanel: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  closeMapBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'white',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    elevation: 5
  }
});