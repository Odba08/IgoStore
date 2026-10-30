import { StatusBar } from "expo-status-bar";
import { ScrollView, Text, View, FlatList, TouchableOpacity, TextInput, StyleSheet, Image, ActivityIndicator, Alert, Clipboard, Modal, Platform, Linking } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useRef } from 'react';
import { useRouter } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import { useAllProducts } from "@/presentation/hooks/useProducts";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState, useEffect } from "react";
import { useBusinesses } from "@/presentation/hooks/useBusiness";
import LoadingScreen from "@/presentation/components/loading";
import PrincipalHeader from "@/presentation/components/headers/header";
import { CategoryList } from "@/presentation/components/categoryList/categoryList";
import { PromoSlider } from "@/presentation/components/promoSlider/PromoSlider";
import { BusinessCard } from "@/presentation/components/businessCard/businessCard";
import { BusinessCardSkeleton } from "@/presentation/components/shared/Skeleton";
import { useFavoritesStore } from "@/presentation/store/useFavoriteStore";
import { useCartStore } from "@/presentation/store/useCartStore";
import { useLocationStore } from "@/presentation/store/useLocationStore";
import { useAuthStore } from "@/presentation/store/useAuthStore";
import { igoApi } from "@/infrastructure/api/igo.api";
import { getPendingDeliveriesApi, updateOrderApi, getOrderQuoteApi, getMyOrdersApi, getOrderByIdApi, getActiveOrderId } from "@/infrastructure/api/orders.api";
import { getSocket } from "@/infrastructure/services/socket.service";
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { ActiveOrderFloatingWidget } from "@/presentation/components/ActiveOrderFloatingWidget";
import { OrderChatModal } from "@/presentation/components/OrderChatModal";
import { uploadImage } from "@/infrastructure/services/imageUpload.service";
import { BusinessDashboard } from "@/presentation/components/business/BusinessDashboard";
import { AdminDashboard } from "@/presentation/components/admin/AdminDashboard";
import { OrderVerificationModal } from "@/presentation/components/driver/OrderVerificationModal";
import { useThemeStore } from "@/presentation/store/useThemeStore";
import SoundService from "@/infrastructure/services/sound.service";
import { useNotificationAlertStore } from "@/presentation/store/useNotificationAlertStore";

export default function Index() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { colors, isDark } = useThemeStore();

  // 1. CARGA DE DATOS CLIENTE
  const { data: businesses, isLoading: loadingBusiness, error } = useBusinesses();
  const { data: products, isLoading: productsLoading } = useAllProducts();

  const sortedBusinesses = useMemo(() => {
    if (!businesses) return [];
    return [...businesses].sort((a, b) => {
      if (a.isOfficialStore && !b.isOfficialStore) return -1;
      if (!a.isOfficialStore && b.isOfficialStore) return 1;
      return 0;
    });
  }, [businesses]);

  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'favorites' | 'addresses'>('home');

  const favorites = useFavoritesStore(state => state.favorites);
  const items = useCartStore(state => state.items);
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  // Ubicaciones del store global
  const { savedAddresses, removeSavedAddress, initStore, getLocation, lastKnowLocation } = useLocationStore();

  // 1.5 LÓGICA DE ROLES: ADMIN, MOTORIZADO / TRABAJADOR Y COMERCIO
  const isAdmin = user?.roles?.includes('admin');
  const [adminModeActive, setAdminModeActive] = useState<boolean>(true);

  const isEmployee = user?.roles?.includes('empleado') || user?.roles?.includes('worker');
  const isBusiness = user?.roles?.includes('business') || user?.roles?.includes('bussiness');
  const [businessModeActive, setBusinessModeActive] = useState<boolean>(true);

  const [employeeStatus, setEmployeeStatus] = useState<string>('inactive');
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [myAssignedOrders, setMyAssignedOrders] = useState<any[]>([]);
  const [loadingDriverData, setLoadingDriverData] = useState<boolean>(false);

  // Estadísticas acumuladas del repartidor
  const [driverStats, setDriverStats] = useState({
    completedCount: 0,
    accumulatedEarnings: 0,
    todayCount: 0,
    todayEarnings: 0,
  });
  const [driverBcvRate, setDriverBcvRate] = useState<number>(75.54);
  const knownPendingIdsRef = useRef<Set<string>>(new Set());
  const knownAssignedIdsRef = useRef<Set<string>>(new Set());
  const isInitialDriverPollRef = useRef<boolean>(true);

  // Mapa y Tramos de Entrega
  const [selectedRouteOrder, setSelectedRouteOrder] = useState<any | null>(null);
  const [routePolyline, setRoutePolyline] = useState<any[]>([]);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);
  const [showMapModal, setShowMapModal] = useState<boolean>(false);
  const [mapLeg, setMapLeg] = useState<'pickup' | 'delivery'>('pickup');
  const mapModalRef = useRef<MapView>(null);

  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [confirmOrderId, setConfirmOrderId] = useState<string>('');
  const [deliveryPhotoUri, setDeliveryPhotoUri] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [driverChatOrder, setDriverChatOrder] = useState<any | null>(null);
  const [showDriverChatModal, setShowDriverChatModal] = useState<boolean>(false);
  const [verifyingOrder, setVerifyingOrder] = useState<any | null>(null);

  const handleVerificationSuccess = async () => {
    if (!verifyingOrder) return;
    const target = verifyingOrder;
    setVerifyingOrder(null);
    await handleUpdateDriverStage(target.id, 'ON_THE_WAY', 'ON_WAY');
  };

  const handleVerificationSkip = async () => {
    if (!verifyingOrder) return;
    const target = verifyingOrder;
    setVerifyingOrder(null);
    await handleUpdateDriverStage(target.id, 'ON_THE_WAY', 'ON_WAY');
  };

  const handleUpdateDriverStage = async (orderId: string, nextStage: string, nextStatus?: string) => {
    try {
      const payload: any = { driverStage: nextStage };
      if (nextStatus) payload.status = nextStatus;
      await updateOrderApi(orderId, payload);
      await fetchDriverData();
      
      if (selectedRouteOrder && selectedRouteOrder.id === orderId) {
        setSelectedRouteOrder((prev: any) => ({ ...prev, driverStage: nextStage, ...(nextStatus ? { status: nextStatus } : {}) }));
        if (nextStage === 'ON_THE_WAY') {
          setMapLeg('delivery');
          await handleOpenMap(selectedRouteOrder, 'delivery');
        }
      }

      let msg = 'Etapa de ruta actualizada.';
      if (nextStage === 'ARRIVED_PICKUP') msg = '¡Llegaste al punto de recogida! Se notificó al local/cliente 📍';
      if (nextStage === 'ON_THE_WAY') msg = '¡Pedido en mano! En camino a la ubicación del cliente 🛵';
      if (nextStage === 'ARRIVED_DESTINATION') msg = '¡Llegaste a la ubicación del cliente! 🔔';
      Alert.alert("Ruta Actualizada", msg);
    } catch (err: any) {
      console.error("Error updating driver stage:", err);
      Alert.alert("Error", err.message || "No se pudo actualizar la etapa de la ruta.");
    }
  };

  const handleOpenExternalGps = (targetLat: number, targetLng: number, label: string) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(label)}@${targetLat},${targetLng}`,
      android: `geo:0,0?q=${targetLat},${targetLng}(${encodeURIComponent(label)})`
    });
    Linking.openURL(url || `https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}`);
  };

  const handleMarkArrived = async (orderId: string) => {
    await handleUpdateDriverStage(orderId, 'ARRIVED_DESTINATION', 'ARRIVED');
  };

  const fetchDriverData = async () => {
    if (!user) return;
    try {
      // Obtener el estado de servicio del empleado
      const userRes = await igoApi.get(`/users/${user.id}`);
      const st = userRes.data.employeeStatus || 'inactive';
      setEmployeeStatus(st);
      if (st === 'active') {
        registerDriverSocket('active');
      }

      // Obtener los pedidos pendientes sin motorizado
      const pendingRes = await getPendingDeliveriesApi();
      const currentPending = Array.isArray(pendingRes.data) ? pendingRes.data : [];
      setPendingOrders(currentPending);

      // Obtener todas las órdenes de la plataforma
      const allRes = await igoApi.get('/orders');
      const allOrders = Array.isArray(allRes.data) ? allRes.data : [];

      // 1. Mis entregas activas en curso
      const myAssigned = allOrders.filter((ord: any) => 
        ord.deliveryUser?.id === user.id && 
        ord.status !== 'DELIVERED' && 
        ord.status !== 'CANCELLED'
      );
      setMyAssignedOrders(myAssigned);

      // 2. Mis entregas completadas históricas (cuántos pedidos lleva)
      const myCompleted = allOrders.filter((ord: any) => 
        ord.deliveryUser?.id === user.id && 
        ord.status === 'DELIVERED'
      );

      // 3. Monto total en $ acumulado por envíos realizados
      const totalAccumulated = myCompleted.reduce((sum: number, ord: any) => {
        return sum + (Number(ord.deliveryFee) || 0);
      }, 0);

      // 4. Pedidos y ganancias de hoy
      const todayStr = new Date().toDateString();
      const todayCompleted = myCompleted.filter((ord: any) => 
        ord.createdAt && new Date(ord.createdAt).toDateString() === todayStr
      );
      const todayAccumulated = todayCompleted.reduce((sum: number, ord: any) => {
        return sum + (Number(ord.deliveryFee) || 0);
      }, 0);

      setDriverStats({
        completedCount: myCompleted.length,
        accumulatedEarnings: totalAccumulated,
        todayCount: todayCompleted.length,
        todayEarnings: todayAccumulated,
      });

      // 5. Obtener tasa BCV oficial
      try {
        const bcvRes = await igoApi.get('/settings/BCV_RATE');
        if (bcvRes.data?.value) {
          setDriverBcvRate(parseFloat(bcvRes.data.value) || 75.54);
        }
      } catch (e) {}

      // 6. Alerta Sonora + Pantalla Amarilla si llega un pedido nuevo mientras está activo
      if (!isInitialDriverPollRef.current && (st === 'active' || employeeStatus === 'active')) {
        // ¿Hay pedidos asignados nuevos para este chofer?
        const newlyAssigned = myAssigned.filter((o: any) => !knownAssignedIdsRef.current.has(o.id));
        if (newlyAssigned.length > 0) {
          const first = newlyAssigned[0];
          console.log('🔔 [Driver Polling] ¡Nuevo pedido asignado detectado! Sonando...', first.orderNumber);
          SoundService.playOrderAlertSound().catch(() => {});
          useNotificationAlertStore.getState().showAlert({
            title: '🛵 ¡Nuevo Pedido Asignado!',
            message: `¡Te han asignado la orden #${String(first.orderNumber || '').padStart(4, '0')} para entrega!`,
            orderNumber: first.orderNumber,
            orderId: first.id,
            totalAmount: Number(first.totalAmount || 0),
            clientName: first.user?.fullName || first.userIdTemp || 'Cliente IGO',
            deliveryAddress: first.deliveryAddress,
            actionLabel: 'VER ENTREGA',
            onAction: () => {
              setActiveTab('home');
            },
          });
        }

        // ¿Hay pedidos nuevos disponibles en la plataforma?
        const newlyPending = currentPending.filter((o: any) => !knownPendingIdsRef.current.has(o.id));
        if (newlyPending.length > 0) {
          const first = newlyPending[0];
          console.log('🔔 [Driver Polling] ¡Nuevo pedido disponible detectado! Sonando...', first.orderNumber);
          SoundService.playOrderAlertSound().catch(() => {});
          useNotificationAlertStore.getState().showAlert({
            title: '📦 ¡Nuevo Pedido Disponible!',
            message: `Hay una nueva orden #${String(first.orderNumber || '').padStart(4, '0')} lista para tomar en tu zona.`,
            orderNumber: first.orderNumber,
            orderId: first.id,
            totalAmount: Number(first.totalAmount || 0),
            businessName: first.business?.name,
            deliveryAddress: first.deliveryAddress,
            actionLabel: 'TOMAR PEDIDO',
            onAction: () => {
              handleClaimOrder(first.id);
            },
          });
        }
      }

      currentPending.forEach((o: any) => knownPendingIdsRef.current.add(o.id));
      myAssigned.forEach((o: any) => knownAssignedIdsRef.current.add(o.id));
      isInitialDriverPollRef.current = false;

    } catch (err: any) {
      if (err?.response?.status === 401) {
        console.warn("⚠️ Sesión de empleado expirada o no autorizada (401). Limpiando sesión...");
        await logout();
      } else {
        console.error("Error loading driver dashboard:", err);
      }
    }
  };

  useEffect(() => {
    initStore();
  }, []);

  useEffect(() => {
    if (isEmployee) {
      getLocation(); // Obtener ubicación actual al iniciar
      fetchDriverData();
      // Polling cada 8 segundos
      const interval = setInterval(fetchDriverData, 8000);

      // Conexión WebSockets en tiempo real para repartidores
      const socket = getSocket();
      const handleDriverNewOrder = (ord: any) => {
        if (!ord) return;
        console.log('⚡ [Driver WS] Notificación de pedido para motorizado:', ord.orderNumber);
        fetchDriverData();
        SoundService.playOrderAlertSound().catch(() => {});
        useNotificationAlertStore.getState().showAlert({
          title: '🛵 ¡Nuevo Pedido en la Plataforma!',
          message: `Orden #${String(ord.orderNumber || '').padStart(4, '0')} disponible para entrega. Costo de envío: $${Number(ord.deliveryFee || 0).toFixed(2)}.`,
          orderNumber: ord.orderNumber,
          orderId: ord.id,
          totalAmount: Number(ord.totalAmount || 0),
          businessName: ord.business?.name,
          deliveryAddress: ord.deliveryAddress,
          actionLabel: 'VER PEDIDOS',
          onAction: () => {
            setActiveTab('home');
          },
        });
      };

      const handleDriverAssigned = (data: any) => {
        const orderData = data?.order || data;
        const driverId = data?.driverId || orderData?.deliveryUser?.id;
        if (driverId === user?.id) {
          console.log('⚡ [Driver WS] ¡Te asignaron una orden!', orderData.orderNumber);
          fetchDriverData();
          SoundService.playOrderAlertSound().catch(() => {});
          useNotificationAlertStore.getState().showAlert({
            title: '🛵 ¡Te Han Asignado un Pedido!',
            message: `Has sido seleccionado para entregar la orden #${String(orderData.orderNumber || '').padStart(4, '0')}.`,
            orderNumber: orderData.orderNumber,
            orderId: orderData.id,
            totalAmount: Number(orderData.totalAmount || 0),
            clientName: orderData.user?.fullName || 'Cliente IGO',
            businessName: orderData.business?.name,
            deliveryAddress: orderData.deliveryAddress,
            actionLabel: 'VER ENTREGA',
            onAction: () => {
              setActiveTab('home');
            },
          });
        }
      };

      socket.on('order:created', handleDriverNewOrder);
      socket.on('order:driver_assigned', handleDriverAssigned);
      if (user?.id) {
        socket.on(`driver:${user.id}:new_assignment`, handleDriverAssigned);
      }

      return () => {
        clearInterval(interval);
        socket.off('order:created', handleDriverNewOrder);
        socket.off('order:driver_assigned', handleDriverAssigned);
        if (user?.id) {
          socket.off(`driver:${user.id}:new_assignment`, handleDriverAssigned);
        }
      };
    }
  }, [isEmployee, user?.id]);

  // 1.6 PEDIDO ACTIVO PARA CLIENTES (Widget flotante estilo Quik)
  const [clientActiveOrder, setClientActiveOrder] = useState<any | null>(null);

  const fetchClientOrders = async () => {
    try {
      const res = await getMyOrdersApi();
      if (Array.isArray(res.data) && res.data.length > 0) {
        // Encontrar la orden más reciente activa (no cancelada y entregada sólo si aún no ha sido calificada)
        const active = res.data.find(
          (o: any) =>
            o.status !== 'CANCELLED' &&
            (o.status !== 'DELIVERED' || !o.businessRating)
        );
        if (active) {
          setClientActiveOrder(active);
          return;
        }
      }

      // Respaldo directo en el dispositivo (pedidos invitados o locales)
      const localActiveId = await getActiveOrderId();
      if (localActiveId) {
        try {
          const singleRes = await getOrderByIdApi(localActiveId);
          if (
            singleRes.data &&
            singleRes.data.status !== 'CANCELLED' &&
            (singleRes.data.status !== 'DELIVERED' || !singleRes.data.businessRating)
          ) {
            setClientActiveOrder(singleRes.data);
            return;
          }
        } catch {
          // ignore
        }
      }

      setClientActiveOrder(null);
    } catch {
      // Ignorar error temporal de red
    }
  };

  useEffect(() => {
    fetchClientOrders();
    const interval = setInterval(fetchClientOrders, 8000);

    const socket = getSocket();
    const handleLiveOrderUpdate = () => {
      fetchClientOrders();
    };

    socket.on('order:updated', handleLiveOrderUpdate);
    socket.on('order:payment_verified', handleLiveOrderUpdate);
    socket.on('order:driver_assigned', handleLiveOrderUpdate);

    return () => {
      clearInterval(interval);
      socket.off('order:updated', handleLiveOrderUpdate);
      socket.off('order:payment_verified', handleLiveOrderUpdate);
      socket.off('order:driver_assigned', handleLiveOrderUpdate);
    };
  }, []);

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

  const handleOpenMap = async (order: any, leg?: 'pickup' | 'delivery') => {
    try {
      setShowMapModal(true);
      setSelectedRouteOrder(order);
      setLoadingRoute(true);

      const currentLeg = leg || (order.driverStage === 'ARRIVED_PICKUP' || order.driverStage === 'ON_THE_WAY' || order.driverStage === 'ARRIVED_DESTINATION' ? 'delivery' : 'pickup');
      setMapLeg(currentLeg);

      const startLat = order.business?.latitude || order.pickupLat || (lastKnowLocation?.latitude ?? 0);
      const startLng = order.business?.longitude || order.pickupLong || (lastKnowLocation?.longitude ?? 0);

      let originLat = startLat;
      let originLng = startLng;
      let destLat = order.deliveryLat;
      let destLng = order.deliveryLong;

      if (currentLeg === 'pickup' && lastKnowLocation?.latitude) {
        originLat = lastKnowLocation.latitude;
        originLng = lastKnowLocation.longitude;
        destLat = startLat;
        destLng = startLng;
      }
      
      const res = await getOrderQuoteApi({
        businessId: order.business?.id || '00000000-0000-0000-0000-000000000000',
        pickupLat: originLat,
        pickupLong: originLng,
        deliveryLat: destLat,
        deliveryLong: destLng
      });
      
      if (res.data && res.data.routePolyline) {
        setRoutePolyline(res.data.routePolyline);
      } else {
        setRoutePolyline([
          { latitude: originLat, longitude: originLng },
          { latitude: destLat, longitude: destLng }
        ]);
      }
    } catch (err) {
      console.error("Error loading route polyline:", err);
      setRoutePolyline([
        { latitude: order.business?.latitude || order.pickupLat || 0, longitude: order.business?.longitude || order.pickupLong || 0 },
        { latitude: order.deliveryLat, longitude: order.deliveryLong }
      ]);
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleCompleteOrderClick = (orderId: string) => {
    setConfirmOrderId(orderId);
    setDeliveryPhotoUri(null);
    setShowConfirmModal(true);
  };

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permiso requerido", "Se necesitan permisos para utilizar la cámara.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.6,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setDeliveryPhotoUri(result.assets[0].uri);
    }
  };

  const handleSelectPhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permiso requerido", "Se necesitan permisos para acceder a la galería.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.6,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setDeliveryPhotoUri(result.assets[0].uri);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!deliveryPhotoUri || !confirmOrderId) return;
    
    try {
      setIsUploadingPhoto(true);
      
      const photoUrl = await uploadImage(deliveryPhotoUri, 'entrega_comprobante.jpg');
      if (!photoUrl) throw new Error("No se obtuvo la URL de la imagen cargada.");

      await updateOrderApi(confirmOrderId, { status: 'DELIVERED', photoUrl });
      
      Alert.alert("Éxito", "Entrega confirmada con comprobante fotográfico.");
      setShowConfirmModal(false);
      setDeliveryPhotoUri(null);
      setConfirmOrderId('');
      await fetchDriverData();

    } catch (err: any) {
      console.error("Error confirming delivery with photo:", err);
      Alert.alert("Error", "No se pudo subir la foto o completar el pedido: " + (err.message || 'Error desconocido'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const registerDriverSocket = (status = 'active') => {
    if (!user) return;
    try {
      const socket = getSocket();
      if (socket) {
        socket.emit('driver:register', {
          userId: user.id,
          name: (user as any).fullName || user.fullname || user.email,
          vehicle: (user as any).vehicle || 'Moto',
          phone: (user as any).phoneNumber || '',
          employeeStatus: status,
        });
        if (lastKnowLocation) {
          socket.emit('driver:location_update', {
            latitude: lastKnowLocation.latitude,
            longitude: lastKnowLocation.longitude,
          });
        }
      }
    } catch (err) {
      console.warn('Error registrando driver en socket:', err);
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
              registerDriverSocket('active');
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
              registerDriverSocket('break');
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
              registerDriverSocket('inactive');
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

  if (loadingBusiness && !isEmployee && !(isBusiness && businessModeActive) && !(isAdmin && adminModeActive)) {
    return (
      <LoadingScreen 
        imageSource={require("../assets/images/adaptive-icon.png")} 
        spinnerColor="#FFDB58" 
      />
    );
  }

  if (error && !isEmployee && !(isBusiness && businessModeActive) && !(isAdmin && adminModeActive)) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "red" }}>{error.message}</Text>
      </View>
    );
  }

  // Si el usuario es administrador y tiene activo el modo admin, renderizar AdminDashboard
  if (isAdmin && adminModeActive) {
    return (
      <View style={styles.mainContainer}>
        <StatusBar style='light' />
        <AdminDashboard 
          user={user} 
          onSwitchToClientMode={() => setAdminModeActive(false)} 
        />
      </View>
    );
  }

  // Si el usuario es dueño de negocio y tiene activo el modo comercio, renderizar BusinessDashboard
  if (isBusiness && businessModeActive) {
    return (
      <View style={styles.mainContainer}>
        <StatusBar style='dark' />
        <PrincipalHeader />
        <BusinessDashboard 
          user={user} 
          onSwitchToClientMode={() => setBusinessModeActive(false)} 
        />
      </View>
    );
  }

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <PrincipalHeader />

      {/* BARRA PARA VOLVER AL MODO ADMIN SI ESTÁ EN MODO CLIENTE */}
      {isAdmin && !adminModeActive && (
        <TouchableOpacity 
          style={styles.switchBackToAdminBar}
          onPress={() => setAdminModeActive(true)}
        >
          <Ionicons name="shield-checkmark" size={18} color="#000" />
          <Text style={styles.switchBackToAdminText}>
            Estás en Modo Cliente. Toca aquí para volver al Panel de Administrador 👑
          </Text>
        </TouchableOpacity>
      )}

      {/* BARRA PARA VOLVER AL MODO COMERCIO SI ESTÁ EN MODO CLIENTE */}
      {isBusiness && !businessModeActive && (
        <TouchableOpacity 
          style={styles.switchBackToBusinessBar}
          onPress={() => setBusinessModeActive(true)}
        >
          <Ionicons name="storefront" size={18} color="#000" />
          <Text style={styles.switchBackToBusinessText}>
            Estás en Modo Cliente. Toca aquí para volver a tu Panel de Tienda 🏪
          </Text>
        </TouchableOpacity>
      )}

      {/* WIDGET FLOTANTE DE PEDIDO EN VIVO (ESTILO QUIK) */}
      {clientActiveOrder && (
        <ActiveOrderFloatingWidget
          order={clientActiveOrder}
          currentUser={user}
          onRefreshOrders={fetchClientOrders}
        />
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: isEmployee ? 60 : 160 }} showsVerticalScrollIndicator={false}>
        
        {/* BUSCADOR (Solo para clientes) */}
        {!isEmployee && (
          <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Ionicons name="search" size={20} color={colors.textMuted} style={{marginRight: 10}} />
              <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder='Buscar comida, bebidas...'
                  placeholderTextColor={colors.textMuted}
                  value={searchText}
                  onChangeText={setSearchText}
              />
              {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchText('')}>
                      <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
              )}
          </View>
        )}

        {/* RESULTADOS DE BÚSQUEDA */}
        {searchText.length > 0 ? (
           <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Resultados</Text>
                
                {productsLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{marginTop: 20}} />
                ) : filteredProducts.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>No encontramos &quot;{searchText}&quot;</Text>
                ) : (
                    filteredProducts.map((item: any) => (
                        <TouchableOpacity 
                            key={item.id} 
                            style={[styles.resultItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                            onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id }})}
                        >
                            <Image 
                                source={{ uri: item.images[0]?.url }} 
                                style={{ width: 50, height: 50, borderRadius: 8, backgroundColor: isDark ? '#231254' : '#eee' }}
                            />
                            <View style={{marginLeft: 10, flex: 1}}>
                                <Text style={[{fontWeight: 'bold'}, { color: colors.text }]}>{item.title}</Text>
                                <Text style={{color: '#10B981', fontWeight: '700'}}>${item.price}</Text>
                            </View>
                            <Ionicons name="chevron-forward" color={colors.textMuted} size={20}/>
                        </TouchableOpacity>
                    ))
                )}
           </View>
        ) : activeTab === 'favorites' ? (
           // PESTAÑA FAVORITAS
           <View style={{ marginTop: 10, paddingHorizontal: 20 }}>
             <Text style={[styles.sectionTitle, { marginLeft: 0, marginBottom: 15, color: colors.text }]}>Tus Tiendas Favoritas</Text>
             {favoriteBusinesses.length === 0 ? (
               <View style={{ alignItems: 'center', marginTop: 60, paddingBottom: 60 }}>
                 <Ionicons name="star-outline" size={48} color={colors.textMuted} style={{ marginBottom: 10 }} />
                 <Text style={{ color: colors.textMuted, fontStyle: 'italic', textAlign: 'center' }}>
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
               <Text style={[styles.sectionTitle, { marginLeft: 0, marginBottom: 0, color: colors.text }]}>Mis Direcciones</Text>
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
                 <Ionicons name="location-outline" size={48} color={colors.textMuted} style={{ marginBottom: 10 }} />
                 <Text style={{ color: colors.textMuted, fontStyle: 'italic', textAlign: 'center', marginBottom: 20 }}>
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
                   <View key={addr.id} style={[styles.addressCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                     <Ionicons name="location-sharp" size={24} color="#EDB422" style={{ marginRight: 12 }} />
                     <View style={{ flex: 1 }}>
                       <Text style={[styles.addressLabel, { color: colors.text }]}>{addr.label}</Text>
                       <Text style={[styles.addressText, { color: colors.textMuted }]} numberOfLines={2}>{addr.address}</Text>
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

             {/* TARJETA DESTACADA DE GANANCIAS Y PEDIDOS LLEVADOS */}
             <View style={styles.driverEarningCard}>
               <View style={styles.driverEarningTop}>
                 <View style={{ flex: 1 }}>
                   <Text style={styles.driverEarningLabel}>GANANCIAS ACUMULADAS 💰</Text>
                   <Text style={styles.driverEarningAmount}>
                     ${driverStats.accumulatedEarnings.toFixed(2)} USD
                   </Text>
                   <Text style={styles.driverEarningBs}>
                     ≈ Bs. {(driverStats.accumulatedEarnings * driverBcvRate).toFixed(2)} (Tasa {driverBcvRate} Bs/$)
                   </Text>
                 </View>
                 <View style={styles.driverEarningIconBox}>
                   <Ionicons name="wallet" size={26} color="#000" />
                 </View>
               </View>

               {/* FILA DE CONTADORES DE PEDIDOS */}
               <View style={styles.driverStatsRow}>
                 <View style={styles.driverStatCol}>
                   <Text style={styles.driverStatVal}>{driverStats.completedCount}</Text>
                   <Text style={styles.driverStatLbl}>Pedidos Llevados</Text>
                 </View>
                 <View style={styles.driverStatDivider} />
                 <View style={styles.driverStatCol}>
                   <Text style={styles.driverStatVal}>{myAssignedOrders.length}</Text>
                   <Text style={styles.driverStatLbl}>En Curso Activos</Text>
                 </View>
                 <View style={styles.driverStatDivider} />
                 <View style={styles.driverStatCol}>
                   <Text style={styles.driverStatVal}>{driverStats.todayCount}</Text>
                   <Text style={styles.driverStatLbl}>Entregados Hoy</Text>
                   <Text style={styles.driverStatSub}>(${driverStats.todayEarnings.toFixed(2)})</Text>
                 </View>
               </View>

               {/* BOTÓN PROBAR ALERTA SONORA DE PEDIDO */}
               <TouchableOpacity
                 style={styles.driverTestSoundBtn}
                 onPress={() => {
                   SoundService.playOrderAlertSound().catch(() => {});
                   Alert.alert(
                     '🔔 Prueba de Alerta Sonora',
                     'Si escuchaste el timbre y tu teléfono vibró, tu audio está listo para avisarte de nuevos pedidos.'
                   );
                 }}
               >
                 <Ionicons name="volume-high" size={16} color="#000" style={{ marginRight: 6 }} />
                 <Text style={styles.driverTestSoundText}>Probar Timbre de Nuevo Pedido</Text>
               </TouchableOpacity>
             </View>

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

                     <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                       <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: '#F1F5F9' }]} onPress={() => handleOpenMap(order)}>
                         <Ionicons name="map-outline" size={16} color="#333" style={{ marginRight: 4 }} />
                         <Text style={[styles.actionBtnText, { color: '#333' }]}>Ver Ruta</Text>
                       </TouchableOpacity>

                       <TouchableOpacity
                         style={[styles.actionBtn, { flex: 1, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' }]}
                         onPress={() => {
                           setDriverChatOrder(order);
                           setShowDriverChatModal(true);
                         }}
                       >
                         <Ionicons name="chatbubbles" size={16} color="#2563EB" style={{ marginRight: 4 }} />
                         <Text style={[styles.actionBtnText, { color: '#2563EB' }]}>Chat Cliente</Text>
                       </TouchableOpacity>
                     </View>

                     {/* BOTONES DE PROGRESIÓN DE ENTREGA (4 ETAPAS) */}
                     <View style={{ marginTop: 8, gap: 6 }}>
                       {(!order.driverStage || order.driverStage === 'TO_PICKUP') && (
                         <TouchableOpacity
                           style={[styles.actionBtn, { backgroundColor: '#F59E0B', width: '100%', paddingVertical: 10 }]}
                           onPress={() => handleUpdateDriverStage(order.id, 'ARRIVED_PICKUP')}
                         >
                           <Ionicons name="location" size={16} color="white" style={{ marginRight: 6 }} />
                           <Text style={[styles.actionBtnText, { color: 'white' }]}>📍 1. ¡Llegué al Local / Punto A!</Text>
                         </TouchableOpacity>
                       )}

                       {order.driverStage === 'ARRIVED_PICKUP' && (
                         <TouchableOpacity
                           style={[styles.actionBtn, { backgroundColor: '#2563EB', width: '100%', paddingVertical: 10 }]}
                           onPress={() => setVerifyingOrder(order)}
                         >
                           <Ionicons name="qr-code-outline" size={16} color="white" style={{ marginRight: 6 }} />
                           <Text style={[styles.actionBtnText, { color: 'white' }]}>🛵 2. ¡Validar y Recoger Pedido (QR/PIN)!</Text>
                         </TouchableOpacity>
                       )}

                       {order.driverStage === 'ON_THE_WAY' && (
                         <TouchableOpacity
                           style={[styles.actionBtn, { backgroundColor: '#EC4899', width: '100%', paddingVertical: 10 }]}
                           onPress={() => handleUpdateDriverStage(order.id, 'ARRIVED_DESTINATION', 'ARRIVED')}
                         >
                           <Ionicons name="notifications" size={16} color="white" style={{ marginRight: 6 }} />
                           <Text style={[styles.actionBtnText, { color: 'white' }]}>🔔 3. ¡Llegué donde el cliente!</Text>
                         </TouchableOpacity>
                       )}

                       {(order.driverStage === 'ARRIVED_DESTINATION' || order.status === 'ARRIVED') && (
                         <TouchableOpacity
                           style={[styles.actionBtn, { backgroundColor: '#10B981', width: '100%', paddingVertical: 10 }]}
                           onPress={() => handleCompleteOrderClick(order.id)}
                         >
                           <Ionicons name="camera" size={16} color="white" style={{ marginRight: 6 }} />
                           <Text style={[styles.actionBtnText, { color: 'white' }]}>📸 4. Entregar con Foto Comprobante</Text>
                         </TouchableOpacity>
                       )}
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
             {/* ACCESOS RÁPIDOS A SERVICIOS IGO */}
             <View style={styles.servicesContainer}>
               <TouchableOpacity 
                 style={[styles.serviceBox, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}
                 onPress={() => {
                   router.push({
                     pathname: '/map',
                     params: {
                       serviceType: 'favor',
                       mode: 'delivery',
                     }
                   });
                 }}
               >
                 <View style={[styles.serviceIconWrapper, { backgroundColor: isDark ? '#2D1854' : '#F3E8FF' }]}>
                   <ExpoImage 
                     source={require('../assets/Icons/igo-iconos-categorias/igo-cat-igo-favor.svg')} 
                     style={{ width: 40, height: 40 }} 
                     contentFit="contain" 
                   />
                 </View>
                 <Text style={[styles.serviceTitle, { color: colors.text }]}>IGO Favor</Text>
                 <Text style={[styles.serviceSub, { color: colors.textMuted }]}>Envíos Express</Text>
               </TouchableOpacity>

               <TouchableOpacity 
                 style={[styles.serviceBox, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}
                 onPress={() => {
                   router.push({
                     pathname: '/map',
                     params: {
                       serviceType: 'moto',
                       mode: 'delivery',
                     }
                   });
                 }}
               >
                 <View style={[styles.serviceIconWrapper, { backgroundColor: isDark ? '#1C2954' : '#E0F2FE' }]}>
                   <ExpoImage 
                     source={require('../assets/Icons/igo-iconos-categorias/igo-cat-express.svg')} 
                     style={{ width: 40, height: 40 }} 
                     contentFit="contain" 
                   />
                 </View>
                 <Text style={[styles.serviceTitle, { color: colors.text }]}>IGO Moto</Text>
                 <Text style={[styles.serviceSub, { color: colors.textMuted }]}>Moto Taxi</Text>
               </TouchableOpacity>

               <TouchableOpacity 
                 style={[styles.serviceBox, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}
                 onPress={() => {
                   router.push({
                     pathname: '/map',
                     params: {
                       serviceType: 'taxi',
                       mode: 'delivery',
                     }
                   });
                 }}
               >
                 <View style={[styles.serviceIconWrapper, { backgroundColor: isDark ? '#3D3014' : '#FFF8E1' }]}>
                   <ExpoImage 
                     source={require('../assets/Icons/igo-iconos-categorias/igo-cat-taxi.svg')} 
                     style={{ width: 40, height: 40 }} 
                     contentFit="contain" 
                   />
                 </View>
                 <Text style={[styles.serviceTitle, { color: colors.text }]}>IGO Taxi</Text>
                 <Text style={[styles.serviceSub, { color: colors.textMuted }]}>Taxi Carro</Text>
               </TouchableOpacity>
             </View>

             <CategoryList onSelectCategory={handleSelectCategory} />
             
             <PromoSlider />

             <View style={{ marginTop: 20 }}>
                <View style={styles.headerRow}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Tiendas destacadas</Text>
                    <TouchableOpacity onPress={() => router.push("/products")}>
                       <Text style={{ color: '#EDB422', fontWeight: 'bold' }}>Ver más</Text>
                    </TouchableOpacity>
                </View>

                {loadingBusiness ? (
                  <View style={{ flexDirection: 'row', paddingHorizontal: 15, gap: 12 }}>
                    <View style={{ width: 260 }}>
                      <BusinessCardSkeleton />
                    </View>
                    <View style={{ width: 260 }}>
                      <BusinessCardSkeleton />
                    </View>
                  </View>
                ) : (
                  <FlatList
                    horizontal
                    data={sortedBusinesses.slice(0, 6)}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <BusinessCard business={item} />}
                    contentContainerStyle={{ paddingHorizontal: 15 }}
                    showsHorizontalScrollIndicator={false}
                  />
                )}
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
          {selectedRouteOrder && (() => {
            const startLat = selectedRouteOrder.business?.latitude || selectedRouteOrder.pickupLat || 0;
            const startLng = selectedRouteOrder.business?.longitude || selectedRouteOrder.pickupLong || 0;
            const startName = selectedRouteOrder.business?.name || selectedRouteOrder.pickupAddress || 'Origen (Punto A)';
            
            return (
              <>
                {loadingRoute ? (
                  <View style={styles.center}>
                    <ActivityIndicator size="large" color="#FFDB58" />
                    <Text style={{ marginTop: 10, color: '#666' }}>Cargando ruta de entrega...</Text>
                  </View>
                ) : (
                  <View style={{ flex: 1 }}>
                    <MapView
                      ref={mapModalRef}
                      style={{ flex: 1 }}
                      mapType={Platform.OS === 'android' ? 'none' : 'standard'}
                      showsUserLocation={true}
                      initialRegion={{
                        latitude: (startLat + selectedRouteOrder.deliveryLat) / 2,
                        longitude: (startLng + selectedRouteOrder.deliveryLong) / 2,
                        latitudeDelta: Math.abs(startLat - selectedRouteOrder.deliveryLat) * 2.5 || 0.05,
                        longitudeDelta: Math.abs(startLng - selectedRouteOrder.deliveryLong) * 2.5 || 0.05,
                      }}
                    >
                      {Platform.OS === 'android' && (
                        <UrlTile
                          urlTemplate="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                          maximumZ={20}
                          flipY={false}
                          zIndex={-1}
                        />
                      )}
                      {/* Marcador del Local/Origen */}
                      <Marker
                        coordinate={{
                          latitude: startLat,
                          longitude: startLng
                        }}
                        title={startName}
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

                    {/* Botón flotante para centrar en mi ubicación actual (Repartidor) */}
                    {lastKnowLocation && (
                      <TouchableOpacity 
                        style={styles.repartidorLocationBtn} 
                        onPress={() => {
                          mapModalRef.current?.animateToRegion({
                            latitude: lastKnowLocation.latitude,
                            longitude: lastKnowLocation.longitude,
                            latitudeDelta: 0.008,
                            longitudeDelta: 0.008
                          }, 1000);
                        }}
                      >
                        <Ionicons name="locate" size={24} color="#6528FF" />
                      </TouchableOpacity>
                    )}

                    {/* Panel de Info Flotante del Mapa con Tramos y Acciones */}
                    <View style={styles.mapInfoPanel}>
                      {/* SELECTOR DE TRAMO DE ENTREGA */}
                      <View style={styles.mapLegToggleRow}>
                        <TouchableOpacity
                          style={[styles.mapLegBtn, mapLeg === 'pickup' && styles.mapLegBtnActive]}
                          onPress={() => handleOpenMap(selectedRouteOrder, 'pickup')}
                        >
                          <Text style={[styles.mapLegBtnText, mapLeg === 'pickup' && styles.mapLegBtnTextActive]}>
                            🏪 Tramo 1: Al Local
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.mapLegBtn, mapLeg === 'delivery' && styles.mapLegBtnActive]}
                          onPress={() => handleOpenMap(selectedRouteOrder, 'delivery')}
                        >
                          <Text style={[styles.mapLegBtnText, mapLeg === 'delivery' && styles.mapLegBtnTextActive]}>
                            🏠 Tramo 2: Al Cliente
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1E293B' }}>
                        Pedido #{String(selectedRouteOrder.orderNumber).padStart(4, '0')}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                        <Text style={{ fontWeight: 'bold' }}>Punto A:</Text> {startName}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748B', marginTop: 1 }} numberOfLines={1}>
                        <Text style={{ fontWeight: 'bold' }}>Punto B:</Text> {selectedRouteOrder.deliveryAddress}
                      </Text>

                      {/* BOTÓN NAVEGAR CON GPS EXTERNO */}
                      <TouchableOpacity
                        style={styles.navGpsBtn}
                        onPress={() => {
                          if (mapLeg === 'pickup') {
                            handleOpenExternalGps(startLat, startLng, startName);
                          } else {
                            handleOpenExternalGps(selectedRouteOrder.deliveryLat, selectedRouteOrder.deliveryLong, selectedRouteOrder.deliveryAddress);
                          }
                        }}
                      >
                        <Ionicons name="navigate" size={16} color="white" />
                        <Text style={styles.navGpsBtnText}>
                          {mapLeg === 'pickup' ? 'Navegar hacia el Local (Waze/Google)' : 'Navegar hacia el Cliente (Waze/Google)'}
                        </Text>
                      </TouchableOpacity>

                      {/* BOTÓN DE ACCIÓN DIRECTA DE ETAPA */}
                      <View style={{ marginTop: 8 }}>
                        {(!selectedRouteOrder.driverStage || selectedRouteOrder.driverStage === 'TO_PICKUP') && (
                          <TouchableOpacity
                            style={[styles.stageActionBtn, { backgroundColor: '#F59E0B' }]}
                            onPress={() => handleUpdateDriverStage(selectedRouteOrder.id, 'ARRIVED_PICKUP')}
                          >
                            <Ionicons name="location" size={16} color="white" style={{ marginRight: 6 }} />
                            <Text style={styles.stageActionBtnText}>1. ¡Llegué al Local / Punto A! 📍</Text>
                          </TouchableOpacity>
                        )}

                        {selectedRouteOrder.driverStage === 'ARRIVED_PICKUP' && (
                          <TouchableOpacity
                            style={[styles.stageActionBtn, { backgroundColor: '#2563EB' }]}
                            onPress={() => setVerifyingOrder(selectedRouteOrder)}
                          >
                            <Ionicons name="qr-code-outline" size={16} color="white" style={{ marginRight: 6 }} />
                            <Text style={styles.stageActionBtnText}>2. ¡Validar y Recoger Pedido (QR/PIN)! 🛵</Text>
                          </TouchableOpacity>
                        )}

                        {selectedRouteOrder.driverStage === 'ON_THE_WAY' && (
                          <TouchableOpacity
                            style={[styles.stageActionBtn, { backgroundColor: '#EC4899' }]}
                            onPress={() => handleUpdateDriverStage(selectedRouteOrder.id, 'ARRIVED_DESTINATION', 'ARRIVED')}
                          >
                            <Ionicons name="notifications" size={16} color="white" style={{ marginRight: 6 }} />
                            <Text style={styles.stageActionBtnText}>3. ¡Llegué donde el cliente! 🔔</Text>
                          </TouchableOpacity>
                        )}

                        {(selectedRouteOrder.driverStage === 'ARRIVED_DESTINATION' || selectedRouteOrder.status === 'ARRIVED') && (
                          <TouchableOpacity
                            style={[styles.stageActionBtn, { backgroundColor: '#10B981' }]}
                            onPress={() => {
                              setShowMapModal(false);
                              handleCompleteOrderClick(selectedRouteOrder.id);
                            }}
                          >
                            <Ionicons name="camera" size={16} color="white" style={{ marginRight: 6 }} />
                            <Text style={styles.stageActionBtnText}>4. Entregar con Foto Comprobante 📸</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                )}
              </>
            );
          })()}

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

      {/* MODAL VALIDACIÓN QR / PIN PARA EL MOTORIZADO */}
      <OrderVerificationModal
        visible={!!verifyingOrder}
        order={verifyingOrder}
        onSuccess={handleVerificationSuccess}
        onSkip={handleVerificationSkip}
        onClose={() => setVerifyingOrder(null)}
      />

      {/* MODAL DE CONFIRMACIÓN DE ENTREGA CON FOTO PARA EL MOTORIZADO */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!isUploadingPhoto) {
            setShowConfirmModal(false);
            setDeliveryPhotoUri(null);
            setConfirmOrderId('');
          }
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={styles.confirmModalContent}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', textAlign: 'center' }}>Confirmar Entrega</Text>
            <Text style={{ fontSize: 13, color: '#666', textAlign: 'center', marginTop: 6 }}>
              Por favor, sube o captura una foto del pedido entregado como comprobante.
            </Text>

            {deliveryPhotoUri ? (
              <Image source={{ uri: deliveryPhotoUri }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera-outline" size={48} color="#94A3B8" />
                <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>Sin imagen seleccionada</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginBottom: 15 }}>
              <TouchableOpacity 
                style={[styles.actionBtn, { flex: 0.5, backgroundColor: '#F1F5F9', borderStyle: 'solid', borderWidth: 1, borderColor: '#CBD5E1', height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }]} 
                onPress={handleTakePhoto}
                disabled={isUploadingPhoto}
              >
                <Ionicons name="camera" size={16} color="#475569" style={{ marginRight: 6 }} />
                <Text style={{ color: '#475569', fontWeight: 'bold', fontSize: 12 }}>Tomar Foto</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, { flex: 0.5, backgroundColor: '#F1F5F9', borderStyle: 'solid', borderWidth: 1, borderColor: '#CBD5E1', height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }]} 
                onPress={handleSelectPhoto}
                disabled={isUploadingPhoto}
              >
                <Ionicons name="image" size={16} color="#475569" style={{ marginRight: 6 }} />
                <Text style={{ color: '#475569', fontWeight: 'bold', fontSize: 12 }}>Galería</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.actionBtn, { width: '100%', backgroundColor: '#4CD964', marginBottom: 10, opacity: (!deliveryPhotoUri || isUploadingPhoto) ? 0.6 : 1, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }]} 
              onPress={handleConfirmDelivery}
              disabled={!deliveryPhotoUri || isUploadingPhoto}
            >
              {isUploadingPhoto ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="white" style={{ marginRight: 6 }} />
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Subir y Completar</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, { width: '100%', backgroundColor: '#EF4444', height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }]} 
              onPress={() => {
                setShowConfirmModal(false);
                setDeliveryPhotoUri(null);
                setConfirmOrderId('');
              }}
              disabled={isUploadingPhoto}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- LA INYECCIÓN TÁCTICA: BOTTOM NAVIGATION BAR --- */}
      {!isEmployee && (
        <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
            
            <TouchableOpacity 
              style={styles.tabItem} 
              onPress={() => setActiveTab('home')}
            >
                <Ionicons 
                  name="home" 
                  size={22} 
                  color={activeTab === 'home' ? (isDark ? '#FFC93C' : '#0F0330') : colors.textMuted} 
                />
                <Text style={[styles.tabText, { color: activeTab === 'home' ? (isDark ? '#FFC93C' : '#0F0330') : colors.textMuted, fontWeight: activeTab === 'home' ? 'bold' : '500' }]}>
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
                  color={activeTab === 'favorites' ? '#FFC93C' : colors.textMuted} 
                />
                <Text style={[styles.tabText, { color: activeTab === 'favorites' ? (isDark ? '#FFC93C' : '#0F0330') : colors.textMuted, fontWeight: activeTab === 'favorites' ? 'bold' : '500' }]}>
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
                  color={activeTab === 'addresses' ? '#FFC93C' : colors.textMuted} 
                />
                <Text style={[styles.tabText, { color: activeTab === 'addresses' ? (isDark ? '#FFC93C' : '#0F0330') : colors.textMuted, fontWeight: activeTab === 'addresses' ? 'bold' : '500' }]}>
                  Direcciones
                </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.tabItem} 
              onPress={() => router.push("/orders")}
            >
                <Ionicons name="receipt-outline" size={22} color={colors.textMuted} />
                <Text style={[styles.tabText, { color: colors.textMuted }]}>Pedidos</Text>
            </TouchableOpacity>

        </View>
      )}

      {/* MODAL DE CHAT MOTORIZADO <-> CLIENTE */}
      {driverChatOrder && (
        <OrderChatModal
          visible={showDriverChatModal}
          onClose={() => {
            setShowDriverChatModal(false);
            setDriverChatOrder(null);
          }}
          order={driverChatOrder}
          currentUser={user}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC' }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    height: 50,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    shadowColor: '#0F0330',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0F0330', fontWeight: '500' },
  sectionContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginLeft: 20, marginBottom: 10, color: '#0F0330' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20, marginBottom: 10 },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#888', fontStyle: 'italic' },
  resultItem: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
      marginHorizontal: 20, marginBottom: 10, padding: 10, borderRadius: 12,
      borderWidth: 1, borderColor: '#F1F5F9',
      shadowColor: '#0F0330', shadowOpacity: 0.04, elevation: 2
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
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 15,
    paddingTop: 10,
    borderTopWidth: 1.2,
    borderTopColor: '#F1F5F9',
    shadowColor: '#0F0330',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
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
  },
  servicesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
    marginTop: 10,
    gap: 10,
  },
  serviceBox: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  serviceIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 2,
    textAlign: 'center',
  },
  serviceSub: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  repartidorLocationBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    right: 15,
    backgroundColor: 'white',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    elevation: 6,
    zIndex: 20
  },
  confirmModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10
  },
  photoPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginVertical: 15
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginVertical: 15
  },
  stageNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  stageNoticeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#B45309',
    flex: 1,
  },
  stageActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stageActionBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFF',
  },
  switchBackToBusinessBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFDB58',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
  },
  switchBackToBusinessText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
  },
  mapLegToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  mapLegBtn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapLegBtnActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  mapLegBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  mapLegBtnTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  navGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6528FF',
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 8,
  },
  navGpsBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
  },
  switchBackToAdminBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFCC00',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  switchBackToAdminText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
  },
  driverEarningCard: {
    backgroundColor: '#FFCC00',
    borderRadius: 18,
    padding: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  driverEarningTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverEarningLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.5,
  },
  driverEarningAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#000',
    marginTop: 2,
  },
  driverEarningBs: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E1238',
    marginTop: 2,
  },
  driverEarningIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  driverStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  driverStatVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  driverStatLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 1,
    textAlign: 'center',
  },
  driverStatSub: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10B981',
  },
  driverStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  driverTestSoundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#000',
  },
  driverTestSoundText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
});