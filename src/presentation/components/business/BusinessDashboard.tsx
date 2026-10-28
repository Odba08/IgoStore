import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
  RefreshControl,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { igoApi } from '@/infrastructure/api/igo.api';
import { pickImageFromGallery, takePhotoWithCamera, uploadImage } from '@/infrastructure/services/imageUpload.service';
import { getSocket } from '@/infrastructure/services/socket.service';
import { NotificationService } from '@/infrastructure/services/notification.service';
import { OrderChatModal } from '@/presentation/components/OrderChatModal';
import { SupportChatModal } from '@/presentation/components/SupportChatModal';

interface BusinessDashboardProps {
  user: any;
  onSwitchToClientMode?: () => void;
}

export const BusinessDashboard: React.FC<BusinessDashboardProps> = ({
  user,
  onSwitchToClientMode
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myBusiness, setMyBusiness] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'balance'>('products');
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'PENDING_ACCEPT' | 'PREPARING' | 'READY' | 'DELIVERED'>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Estados de Conciliación y Balance con IGO (Lógica espejo de Panel Admin)
  const [settlementData, setSettlementData] = useState<any | null>(null);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [settlementFilter, setSettlementFilter] = useState<'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_7_DAYS'>('ALL');
  const [supportModalVisible, setSupportModalVisible] = useState(false);

  // Modal para ver Comprobante / Recibo de Pago Móvil en Grande
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<{
    url: string;
    orderNumber: number;
    reference?: string;
    totalAmount?: number;
    clientName?: string;
    paymentMethod?: string;
  } | null>(null);

  // Modal de Chat con Chofer / Cliente
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [selectedOrderForChat, setSelectedOrderForChat] = useState<any | null>(null);

  // Modal Crear / Editar Producto
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productTitle, setProductTitle] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('10');
  const [productDescription, setProductDescription] = useState('');
  const [productImageUri, setProductImageUri] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialOrdersLoadRef = useRef(true);

  const notifyNewOrderInApp = (newOrder: any) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {}

    NotificationService.scheduleLocalNotification(
      '¡Nuevo Pedido Recibido! 🛍️',
      `Has recibido la orden #${String(newOrder.orderNumber || '').padStart(4, '0')} por $${Number(newOrder.totalAmount || 0).toFixed(2)}.`,
      { orderId: newOrder.id }
    ).catch(() => {});

    Alert.alert(
      '🛍️ ¡Nuevo Pedido Recibido!',
      `Has recibido la orden #${String(newOrder.orderNumber || '').padStart(4, '0')} por $${Number(newOrder.totalAmount || 0).toFixed(2)}.\n\nCliente: ${newOrder.user?.fullName || newOrder.userIdTemp || 'Cliente IGO'}\n\n¡Ve a la pestaña de Pedidos para aceptarlo y prepararlo!`,
      [
        { text: 'Ver Pedido', onPress: () => setActiveTab('orders') },
        { text: 'Entendido', style: 'cancel' }
      ]
    );
  };

  const fetchOrdersOnly = async (bizId: string, showRefreshing = false) => {
    if (!bizId) return;
    if (showRefreshing) setRefreshing(true);
    try {
      let bizOrders: any[] = [];
      try {
        const res = await igoApi.get(`/orders/business/${bizId}`);
        if (Array.isArray(res.data)) {
          bizOrders = res.data;
        }
      } catch (e) {
        // Fallback en caso de que el endpoint específico tenga alguna variación
        const ordersRes = await igoApi.get('/orders');
        const allOrders = ordersRes.data || [];
        bizOrders = allOrders.filter((o: any) => o.business?.id === bizId);
      }

      // Detección automática en segundo plano: alertar si llega orden nueva vía polling
      if (!isInitialOrdersLoadRef.current && knownOrderIdsRef.current.size > 0) {
        const newlyArrived = bizOrders.filter(
          (o) => !knownOrderIdsRef.current.has(o.id) && o.status !== 'CANCELLED' && o.status !== 'DELIVERED'
        );
        if (newlyArrived.length > 0) {
          console.log('⚡ [BusinessDashboard Polling] Nuevo pedido detectado:', newlyArrived[0].id, newlyArrived[0].orderNumber);
          notifyNewOrderInApp(newlyArrived[0]);
        }
      }

      bizOrders.forEach((o) => knownOrderIdsRef.current.add(o.id));
      isInitialOrdersLoadRef.current = false;
      setOrders(bizOrders);
    } catch (err) {
      console.warn('Error fetching business orders:', err);
    } finally {
      if (showRefreshing) setRefreshing(false);
    }
  };

  const fetchSettlement = async (
    bizId?: string,
    filterOverride?: 'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_7_DAYS'
  ) => {
    const id = bizId || myBusiness?.id;
    if (!id) return;
    try {
      setSettlementLoading(true);
      const activeFilter = filterOverride || settlementFilter;
      let startDate: string | undefined;
      let endDate: string | undefined;

      const now = new Date();
      if (activeFilter === 'THIS_MONTH') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      } else if (activeFilter === 'LAST_MONTH') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
      } else if (activeFilter === 'LAST_7_DAYS') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        d.setHours(0, 0, 0, 0);
        startDate = d.toISOString();
        endDate = now.toISOString();
      }

      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await igoApi.get(`/orders/business/${id}/settlement`, { params });
      if (res.data) {
        setSettlementData(res.data);
      }
    } catch (err) {
      console.warn('Error fetching business settlement from backend:', err);
    } finally {
      setSettlementLoading(false);
    }
  };

  const fetchBusinessData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // 1. Obtener el comercio propiedad de este usuario
      let biz: any = null;
      try {
        const res = await igoApi.get(`/business/owner/${user.id}`);
        biz = res.data;
      } catch (err) {
        const allBizRes = await igoApi.get('/business');
        if (Array.isArray(allBizRes.data) && allBizRes.data.length > 0) {
          biz = allBizRes.data[0];
        }
      }

      if (!biz) {
        setMyBusiness(null);
        setLoading(false);
        return;
      }

      setMyBusiness(biz);

      // 2. Obtener productos de este comercio
      const prodRes = await igoApi.get(`/business/${biz.id}/products`, { params: { limit: 500 } });
      setProducts(prodRes.data || []);

      // 3. Obtener órdenes del negocio
      await fetchOrdersOnly(biz.id, false);

      // 4. Obtener conciliación y balance con IGO
      fetchSettlement(biz.id);
    } catch (err: any) {
      console.error('Error loading business dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessData();
    // Asegurar registro de push token y permisos del dueño del negocio
    NotificationService.registerForPushNotificationsAsync().then((token) => {
      if (token) {
        NotificationService.syncPushTokenWithBackend(token);
      }
    });
  }, [user]);

  // SUSCRIPCIÓN EN TIEMPO REAL VÍA WEBSOCKETS + POLLING SEGUNDO PLANO
  useEffect(() => {
    if (!myBusiness?.id) return;

    // Polling de respaldo cada 7 segundos
    const pollInterval = setInterval(() => {
      fetchOrdersOnly(myBusiness.id, false);
    }, 7000);

    let socket: any = null;
    try {
      socket = getSocket();
      if (socket) {
        const handleOrderUpdateEvent = (orderData: any) => {
          if (!orderData) return;
          // Validar si pertenece a este negocio
          const orderBizId = orderData.business?.id || orderData.businessId || (typeof orderData.business === 'string' ? orderData.business : null);
          if (orderBizId !== myBusiness.id) return;

          console.log('⚡ [BusinessDashboard WS] Orden actualizada/pagada:', orderData.id, orderData.status, 'isPaid:', orderData.isPaid);

          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          } catch (e) {}

          setOrders((prev) => {
            const exists = prev.some((o) => o.id === orderData.id);
            if (exists) {
              return prev.map((o) => (o.id === orderData.id ? { ...o, ...orderData } : o));
            }
            return [orderData, ...prev];
          });

          // Si el estado es PAID o el pago fue confirmado por admin
          if (orderData.status === 'PAID' || orderData.isPaid) {
            NotificationService.scheduleLocalNotification(
              '¡Pago Confirmado! 🎉',
              `La orden #${String(orderData.orderNumber).padStart(4, '0')} por $${Number(orderData.totalAmount || 0).toFixed(2)} ya está pagada. ¡Toca para aceptarla y prepararla!`,
              { orderId: orderData.id }
            ).catch(() => {});
          }
        };

        const handleNewOrderEvent = (newOrder: any) => {
          if (!newOrder) return;
          const orderBizId = newOrder.business?.id || newOrder.businessId || (typeof newOrder.business === 'string' ? newOrder.business : null);
          if (orderBizId !== myBusiness.id) return;

          console.log('⚡ [BusinessDashboard WS] Nuevo pedido recibido:', newOrder.id, newOrder.orderNumber);

          knownOrderIdsRef.current.add(newOrder.id);
          setOrders((prev) => {
            if (prev.some((o) => o.id === newOrder.id)) return prev;
            return [newOrder, ...prev];
          });

          notifyNewOrderInApp(newOrder);
        };

        socket.on('order:updated', handleOrderUpdateEvent);
        socket.on('order:created', handleNewOrderEvent);
        socket.on('order:payment_verified', handleOrderUpdateEvent);
        socket.on(`business:${myBusiness.id}:new_order`, handleNewOrderEvent);
        socket.on(`business:${myBusiness.id}:order_updated`, handleOrderUpdateEvent);
        socket.on(`business:${myBusiness.id}:payment_verified`, handleOrderUpdateEvent);

        return () => {
          clearInterval(pollInterval);
          socket.off('order:updated', handleOrderUpdateEvent);
          socket.off('order:created', handleNewOrderEvent);
          socket.off('order:payment_verified', handleOrderUpdateEvent);
          socket.off(`business:${myBusiness.id}:new_order`, handleNewOrderEvent);
          socket.off(`business:${myBusiness.id}:order_updated`, handleOrderUpdateEvent);
          socket.off(`business:${myBusiness.id}:payment_verified`, handleOrderUpdateEvent);
        };
      }
    } catch (err) {
      console.warn('Error configurando WebSocket en BusinessDashboard:', err);
    }

    return () => {
      clearInterval(pollInterval);
    };
  }, [myBusiness?.id]);

  // ACCIONES SOBRE PEDIDOS POR PARTE DEL COMERCIO
  const handleAcceptOrder = async (order: any) => {
    try {
      setActionLoadingId(order.id);
      await igoApi.patch(`/orders/${order.id}`, { status: 'PREPARING' });
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: 'PREPARING', acceptedAt: new Date().toISOString() } : o))
      );
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch (e) {}
      Alert.alert('¡Pedido Aceptado! 🍳', `La orden #${String(order.orderNumber).padStart(4, '0')} está ahora en preparación.`);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo aceptar el pedido.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkReady = async (order: any) => {
    try {
      setActionLoadingId(order.id);
      await igoApi.patch(`/orders/${order.id}`, { status: 'READY' });
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: 'READY' } : o))
      );
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch (e) {}
      Alert.alert('¡Pedido Listo! 📦', `La orden #${String(order.orderNumber).padStart(4, '0')} está lista para entrega y retiro por el repartidor.`);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo marcar la orden como lista.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectOrder = (order: any) => {
    Alert.alert(
      'Rechazar Pedido',
      `¿Deseas rechazar la orden #${String(order.orderNumber).padStart(4, '0')}? Se notificará al cliente y se cancelará el pedido.`,
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Rechazar y Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoadingId(order.id);
              await igoApi.patch(`/orders/${order.id}`, { status: 'CANCELLED' });
              setOrders((prev) =>
                prev.map((o) => (o.id === order.id ? { ...o, status: 'CANCELLED' } : o))
              );
              Alert.alert('Pedido Cancelado', 'La orden fue rechazada y cancelada.');
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'No se pudo rechazar el pedido.');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const handleDirectVerifyPayment = (order: any) => {
    Alert.alert(
      'Confirmar Pago Directo',
      `¿Confirmas que recibiste el Pago Móvil (Ref: ${order.paymentReference || 'N/A'}) por $${Number(order.totalAmount || 0).toFixed(2)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar Pago',
          onPress: async () => {
            try {
              setActionLoadingId(order.id);
              await igoApi.patch(`/orders/${order.id}/verify-payment`, { isPaid: true });
              setOrders((prev) =>
                prev.map((o) => (o.id === order.id ? { ...o, isPaid: true, status: 'PAID' } : o))
              );
              Alert.alert('¡Pago Confirmado! ✅', 'La orden ya está marcada como pagada. Ahora puedes aceptarla.');
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'No se pudo confirmar el pago.');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const copyPaymentRef = async (ref: string) => {
    if (!ref) return;
    try {
      if (Clipboard && Clipboard.setStringAsync) {
        await Clipboard.setStringAsync(ref);
      }
      try {
        Haptics.selectionAsync().catch(() => {});
      } catch (e) {}
      Alert.alert('Copiado ✅', `Número de referencia ${ref} copiado al portapapeles.`);
    } catch {
      Alert.alert('Referencia', ref);
    }
  };

  const handleCallPhone = (phone?: string) => {
    if (!phone) {
      Alert.alert('Sin número', 'No hay un número de teléfono registrado.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'No se pudo abrir la aplicación de llamadas.');
    });
  };

  const handleOpenReceiptModal = (order: any) => {
    if (!order.paymentCaptureUrl) {
      Alert.alert(
        'Sin captura adjunta',
        `El cliente no subió imagen de comprobante.\n\nNúmero de Referencia: ${order.paymentReference || 'No registrado'}`
      );
      return;
    }
    setSelectedReceipt({
      url: order.paymentCaptureUrl,
      orderNumber: order.orderNumber,
      reference: order.paymentReference,
      totalAmount: order.totalAmount,
      clientName: order.user?.fullName || order.userIdTemp || 'Cliente IGO',
      paymentMethod: order.paymentMethod,
    });
    setReceiptModalVisible(true);
  };

  const handleOpenChat = (order: any) => {
    setSelectedOrderForChat(order);
    setChatModalVisible(true);
  };

  // Cálculos de métricas
  const totalSales = orders
    .filter((o) => o.status !== 'CANCELLED' && (o.isPaid || o.status === 'DELIVERED'))
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const activeOrdersCount = orders.filter(
    (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
  ).length;

  const pendingAcceptCount = orders.filter(
    (o) => o.status === 'PAID' || (o.isPaid && o.status !== 'PREPARING' && o.status !== 'READY' && o.status !== 'ON_WAY' && o.status !== 'DELIVERED' && o.status !== 'CANCELLED')
  ).length;

  const preparingCount = orders.filter((o) => o.status === 'PREPARING').length;
  const readyCount = orders.filter((o) => o.status === 'READY' || o.status === 'ON_WAY').length;

  const filteredOrders = orders.filter((o) => {
    if (orderFilter === 'PENDING_ACCEPT') {
      return o.status === 'PAID' || (o.isPaid && o.status === 'PENDING');
    }
    if (orderFilter === 'PREPARING') return o.status === 'PREPARING';
    if (orderFilter === 'READY') return o.status === 'READY' || o.status === 'ON_WAY';
    if (orderFilter === 'DELIVERED') return o.status === 'DELIVERED';
    return true;
  });

  const copyTextToClipboard = async (text: string, label: string) => {
    if (!text) return;
    try {
      if (Clipboard && Clipboard.setStringAsync) {
        await Clipboard.setStringAsync(text);
      }
      try {
        Haptics.selectionAsync().catch(() => {});
      } catch (e) {}
      Alert.alert('Copiado ✅', `${label} copiado al portapapeles.`);
    } catch {
      Alert.alert(label, text);
    }
  };

  const copyAllPagoMovil = async () => {
    const bank = settlementData?.paymentInfo?.bank || '0102 - Banco de Venezuela';
    const phone = settlementData?.paymentInfo?.phone || '0412-1234567';
    const id = settlementData?.paymentInfo?.id || 'V-12345678';
    const name = settlementData?.paymentInfo?.name || 'IGO Delivery C.A.';
    const text = `DATOS PAGO MÓVIL IGO:\nBanco: ${bank}\nTeléfono: ${phone}\nC.I./RIF: ${id}\nTitular: ${name}\nMonto: $${Math.abs(displayNetOwed).toFixed(2)} USD (Bs. ${amountDueBs.toFixed(2)})`;
    try {
      if (Clipboard && Clipboard.setStringAsync) {
        await Clipboard.setStringAsync(text);
      }
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch (e) {}
      Alert.alert('¡Copiado! 📋', 'Los datos completos de Pago Móvil de IGO se copiaron al portapapeles.');
    } catch {
      Alert.alert('Datos Pago Móvil', text);
    }
  };

  const handleNotifyPayment = () => {
    const bizName = myBusiness?.name || 'Mi Comercio';
    const debtStr = Math.abs(displayNetOwed).toFixed(2);
    const bsStr = amountDueBs.toFixed(2);
    Alert.alert(
      'Notificar Pago de Balance 💬',
      `¿Deseas reportar tu pago de $${debtStr} USD (Bs. ${bsStr}) por Soporte en la app o por WhatsApp?`,
      [
        {
          text: 'Chat Soporte App',
          onPress: () => setSupportModalVisible(true),
        },
        {
          text: 'WhatsApp',
          onPress: () => {
            const rawPhone = settlementData?.paymentInfo?.phone || '04121234567';
            const digits = rawPhone.replace(/\D/g, '');
            const phone = digits.startsWith('58') ? digits : `58${digits.replace(/^0+/, '')}`;
            const msg = encodeURIComponent(
              `Hola Soporte IGO, soy del comercio *${bizName}*. Adjunto comprobante de pago de liquidación/delivery por monto de *$${debtStr} USD* (Bs. ${bsStr}).`
            );
            Linking.openURL(`https://wa.me/${phone}?text=${msg}`).catch(() => {
              setSupportModalVisible(true);
            });
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  // Cálculos de conciliación y balance con IGO (Lógica espejo exacta de Panel Admin)
  const paidOrders = orders.filter(
    (o) => o.status !== 'CANCELLED' && (o.isPaid || o.status === 'DELIVERED')
  );
  const itemsSubtotal = paidOrders.reduce((sum, o) => sum + (o.totalItems || 0), 0);
  const deliverySubtotal = paidOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
  const commissionRate = myBusiness?.commissionPercentage ?? 10;
  const commissionAmount = itemsSubtotal * (commissionRate / 100);

  // En el modelo IGO Store, el cliente paga el total (productos + delivery) directamente al comercio
  // Por lo tanto, el comercio adeuda a IGO el delivery recaudado (para los repartidores) + la comisión
  const bizOrders = paidOrders.filter((o) => o.paymentRecipient !== 'Pago IGO');
  const iGoOrders = paidOrders.filter((o) => o.paymentRecipient === 'Pago IGO');

  const igoOwesBizProducts = iGoOrders.reduce((sum, o) => sum + (o.totalItems || 0), 0);
  const bizOwesIgoDelivery = bizOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);

  // liveNetOwed = igoOwesBizProducts - commissionAmount - bizOwesIgoDelivery
  // Si < 0: el comercio debe a IGO la diferencia
  // Si > 0: IGO debe al comercio la diferencia
  const liveBizDebt = bizOwesIgoDelivery + commissionAmount;
  const liveNetOwed = igoOwesBizProducts - liveBizDebt;
  const liveBizNetEarnings = itemsSubtotal - commissionAmount;

  const currentSummary = settlementData?.summary;
  const displayNetOwed = currentSummary !== undefined && currentSummary !== null ? currentSummary.netOwed : liveNetOwed;
  const displayBizDebt = currentSummary !== undefined && currentSummary !== null ? currentSummary.totalBizDebt : liveBizDebt;
  const displayItemsSubtotal = currentSummary !== undefined && currentSummary !== null ? currentSummary.itemsSubtotal : itemsSubtotal;
  const displayDeliverySubtotal = currentSummary !== undefined && currentSummary !== null ? currentSummary.deliverySubtotal : deliverySubtotal;
  const displayCommissionAmount = currentSummary !== undefined && currentSummary !== null ? currentSummary.commissionAmount : commissionAmount;
  const displayIgoOwesBiz = currentSummary !== undefined && currentSummary !== null ? currentSummary.igoOwesBizProducts : igoOwesBizProducts;
  const displayBizOwesIgoDelivery = currentSummary !== undefined && currentSummary !== null ? currentSummary.bizOwesIgoDelivery : bizOwesIgoDelivery;
  const displayPaidOrdersCount = currentSummary !== undefined && currentSummary !== null ? currentSummary.totalPaidOrders : paidOrders.length;
  const displayTotalCollected = currentSummary !== undefined && currentSummary !== null
    ? (currentSummary.totalCollectedByBiz || currentSummary.totalAmountSum || (displayItemsSubtotal + displayDeliverySubtotal))
    : (displayItemsSubtotal + displayDeliverySubtotal);
  const displayBizNetEarnings = currentSummary?.bizNetEarnings ?? (displayItemsSubtotal - displayCommissionAmount);

  const bcvRate = settlementData?.paymentInfo?.bcvRate || 75.54;
  const amountDueBs = Math.abs(displayNetOwed) * bcvRate;

  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setProductTitle('');
    setProductPrice('');
    setProductStock('10');
    setProductDescription('');
    setProductImageUri(null);
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (prod: any) => {
    setEditingProduct(prod);
    setProductTitle(prod.title || '');
    setProductPrice(String(prod.price || ''));
    setProductStock(String(prod.stock ?? 10));
    setProductDescription(prod.description || '');
    const currentImg = prod.images && prod.images.length > 0 
      ? (typeof prod.images[0] === 'string' ? prod.images[0] : prod.images[0].url)
      : null;
    setProductImageUri(currentImg);
    setShowProductModal(true);
  };

  const handleDeleteProduct = (productId: string, productTitle: string) => {
    Alert.alert(
      'Eliminar Producto',
      `¿Estás seguro de que deseas eliminar "${productTitle}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await igoApi.delete(`/business/${myBusiness.id}/products/${productId}`);
              Alert.alert('Éxito', 'Producto eliminado correctamente.');
              await fetchBusinessData();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'No se pudo eliminar el producto.');
            }
          }
        }
      ]
    );
  };

  const handlePickGalleryImage = async () => {
    const uri = await pickImageFromGallery();
    if (uri) setProductImageUri(uri);
  };

  const handleTakePhoto = async () => {
    const uri = await takePhotoWithCamera();
    if (uri) setProductImageUri(uri);
  };

  const handleSaveProduct = async () => {
    if (!productTitle.trim()) {
      Alert.alert('Campo requerido', 'Ingresa el nombre o título del producto.');
      return;
    }
    const priceNum = parseFloat(productPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Precio inválido', 'Ingresa un precio válido mayor a 0.');
      return;
    }
    const stockNum = parseInt(productStock, 10);

    setSavingProduct(true);
    try {
      let finalImgUrl = productImageUri;
      // Si la URI es un archivo local (file:// o content://), subirla primero
      if (productImageUri && (productImageUri.startsWith('file://') || productImageUri.startsWith('content://'))) {
        try {
          finalImgUrl = await uploadImage(productImageUri);
        } catch (imgErr) {
          console.warn('Error subiendo imagen de producto, continuando sin imagen nueva:', imgErr);
        }
      }

      const payload: any = {
        title: productTitle.trim(),
        price: priceNum,
        description: productDescription.trim(),
        stock: isNaN(stockNum) ? 10 : stockNum,
        images: finalImgUrl ? [finalImgUrl] : [],
        isApproved: true,
      };

      if (editingProduct) {
        // Actualizar producto existente
        await igoApi.patch(`/business/${myBusiness.id}/products/${editingProduct.id}`, payload);
        Alert.alert('¡Actualizado! ✅', 'El producto se modificó con éxito.');
      } else {
        // Crear nuevo producto
        await igoApi.post(`/business/${myBusiness.id}/products`, payload);
        Alert.alert('¡Creado! 🎉', 'El nuevo producto fue añadido al catálogo.');
      }

      setShowProductModal(false);
      await fetchBusinessData();
    } catch (err: any) {
      console.error('Error saving product:', err);
      Alert.alert('Error', err.response?.data?.message || 'No se pudo guardar el producto.');
    } finally {
      setSavingProduct(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FFDB58" />
        <Text style={styles.loadingText}>Cargando panel de tu negocio...</Text>
      </View>
    );
  }

  if (!myBusiness) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="storefront-outline" size={64} color="#CBD5E1" />
        <Text style={styles.emptyTitle}>Comercio no asignado</Text>
        <Text style={styles.emptySub}>
          Tu usuario tiene permisos de negocio, pero aún no tiene una tienda vinculada.
          Comunícate con soporte para asignarte un comercio.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={fetchBusinessData}>
          <Ionicons name="refresh" size={18} color="#000" style={{ marginRight: 6 }} />
          <Text style={styles.primaryBtnText}>Reintentar</Text>
        </TouchableOpacity>
        {onSwitchToClientMode && (
          <TouchableOpacity style={styles.switchModeBtn} onPress={onSwitchToClientMode}>
            <Text style={styles.switchModeBtnText}>Ver Tienda como Cliente</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER DE LA TIENDA */}
      <View style={styles.header}>
        <View style={styles.businessInfoRow}>
          {myBusiness.imageUrl ? (
            <Image source={{ uri: myBusiness.imageUrl }} style={styles.businessLogo} />
          ) : (
            <View style={styles.businessLogoPlaceholder}>
              <Ionicons name="storefront" size={24} color="#D97706" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.businessName} numberOfLines={1}>{myBusiness.name}</Text>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            </View>
            <Text style={styles.businessRoleText}>Panel de Administración de Tienda</Text>
          </View>

          {onSwitchToClientMode && (
            <TouchableOpacity style={styles.clientModeToggle} onPress={onSwitchToClientMode}>
              <Ionicons name="eye-outline" size={16} color="#334155" />
              <Text style={styles.clientModeToggleText}>Ver Cliente</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* TARJETAS DE MÉTRICAS */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Vendido</Text>
            <Text style={styles.metricValue}>${totalSales.toFixed(2)}</Text>
            <Ionicons name="trending-up" size={18} color="#10B981" style={styles.metricIcon} />
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Pedidos Activos</Text>
            <Text style={[styles.metricValue, { color: activeOrdersCount > 0 ? '#D97706' : '#1E293B' }]}>
              {activeOrdersCount}
            </Text>
            <Ionicons name="receipt-outline" size={18} color="#D97706" style={styles.metricIcon} />
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Productos</Text>
            <Text style={styles.metricValue}>{products.length}</Text>
            <Ionicons name="cube-outline" size={18} color="#6366F1" style={styles.metricIcon} />
          </View>
        </View>

        {/* BALANCE / CONCILIACIÓN CON IGO QUICK BAR */}
        <TouchableOpacity
          style={[
            styles.balanceQuickBar,
            liveNetOwed < 0
              ? styles.balanceQuickBarDebt
              : liveNetOwed > 0
              ? styles.balanceQuickBarCredit
              : styles.balanceQuickBarOk,
          ]}
          onPress={() => {
            setActiveTab('balance');
            if (myBusiness?.id) fetchSettlement(myBusiness.id);
          }}
          activeOpacity={0.85}
        >
          <View style={styles.balanceQuickLeft}>
            <View
              style={[
                styles.balanceQuickIconBg,
                liveNetOwed < 0
                  ? { backgroundColor: '#FEE2E2' }
                  : liveNetOwed > 0
                  ? { backgroundColor: '#DCFCE7' }
                  : { backgroundColor: '#E0F2FE' },
              ]}
            >
              <Ionicons
                name={
                  liveNetOwed < 0
                    ? 'wallet'
                    : liveNetOwed > 0
                    ? 'arrow-down-circle'
                    : 'checkmark-circle'
                }
                size={20}
                color={
                  liveNetOwed < 0
                    ? '#DC2626'
                    : liveNetOwed > 0
                    ? '#16A34A'
                    : '#0284C7'
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.balanceQuickLabel}>
                {liveNetOwed < 0
                  ? 'Por pagar a IGO (Delivery + Comisión)'
                  : liveNetOwed > 0
                  ? 'Saldo a favor en IGO'
                  : 'Balance IGO al día'}
              </Text>
              <Text
                style={[
                  styles.balanceQuickValue,
                  liveNetOwed < 0
                    ? { color: '#DC2626' }
                    : liveNetOwed > 0
                    ? { color: '#16A34A' }
                    : { color: '#0F172A' },
                ]}
              >
                {liveNetOwed < 0
                  ? `-$${Math.abs(liveNetOwed).toFixed(2)} USD`
                  : liveNetOwed > 0
                  ? `+$${liveNetOwed.toFixed(2)} USD`
                  : '$0.00 USD'}
              </Text>
            </View>
          </View>
          <View style={styles.balanceQuickRight}>
            <Text style={styles.balanceQuickActionText}>Ver Detalle</Text>
            <Ionicons name="chevron-forward" size={16} color="#64748B" />
          </View>
        </TouchableOpacity>
      </View>

      {/* TABS SELECTOR */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'products' && styles.activeTabButton]}
          onPress={() => setActiveTab('products')}
        >
          <Ionicons
            name="cube"
            size={18}
            color={activeTab === 'products' ? '#1E293B' : '#94A3B8'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabButtonText, activeTab === 'products' && styles.activeTabButtonText]}>
            Productos ({products.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'orders' && styles.activeTabButton]}
          onPress={() => setActiveTab('orders')}
        >
          <Ionicons
            name="receipt"
            size={18}
            color={activeTab === 'orders' ? '#1E293B' : '#94A3B8'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabButtonText, activeTab === 'orders' && styles.activeTabButtonText]}>
            Pedidos ({orders.length})
          </Text>
          {pendingAcceptCount > 0 && (
            <View style={styles.tabBadgePulse}>
              <Text style={styles.tabBadgePulseText}>{pendingAcceptCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'balance' && styles.activeTabButton]}
          onPress={() => {
            setActiveTab('balance');
            if (myBusiness?.id) fetchSettlement(myBusiness.id);
          }}
        >
          <Ionicons
            name="wallet"
            size={18}
            color={activeTab === 'balance' ? (liveNetOwed < 0 ? '#DC2626' : '#1E293B') : '#94A3B8'}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'balance' && styles.activeTabButtonText,
              liveNetOwed < 0 && activeTab === 'balance' && { color: '#DC2626' },
            ]}
          >
            Balance IGO
          </Text>
          {liveNetOwed < 0 && (
            <View style={styles.tabBadgeDebt}>
              <Text style={styles.tabBadgeDebtText}>!</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* CONTENIDO SEGÚN TAB */}
      {activeTab === 'products' ? (
        <View style={{ flex: 1 }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Catálogo de Productos</Text>
            <TouchableOpacity style={styles.addProductBtn} onPress={handleOpenCreateProduct}>
              <Ionicons name="add" size={18} color="#000" style={{ marginRight: 4 }} />
              <Text style={styles.addProductBtnText}>Nuevo Producto</Text>
            </TouchableOpacity>
          </View>

          {products.length === 0 ? (
            <View style={styles.emptyProductsBox}>
              <Ionicons name="pricetags-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyProductsText}>Aún no has agregado productos a tu tienda.</Text>
              <TouchableOpacity style={styles.addProductBtnSmall} onPress={handleOpenCreateProduct}>
                <Text style={styles.addProductBtnText}>+ Agregar Primer Producto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 100 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => fetchBusinessData()}
                />
              }
              renderItem={({ item }) => {
                const imgUrl = item.images && item.images.length > 0 
                  ? (typeof item.images[0] === 'string' ? item.images[0] : item.images[0].url)
                  : null;

                return (
                  <View style={styles.productCard}>
                    {imgUrl ? (
                      <Image source={{ uri: imgUrl }} style={styles.productThumb} />
                    ) : (
                      <View style={styles.productThumbPlaceholder}>
                        <Ionicons name="image-outline" size={24} color="#94A3B8" />
                      </View>
                    )}

                    <View style={styles.productInfo}>
                      <Text style={styles.productTitle} numberOfLines={1}>{item.title}</Text>
                      {item.description ? (
                        <Text style={styles.productDesc} numberOfLines={2}>{item.description}</Text>
                      ) : null}
                      <View style={styles.productMetaRow}>
                        <Text style={styles.productPrice}>${Number(item.price).toFixed(2)}</Text>
                        <Text style={styles.productStock}>Stock: {item.stock ?? 10}</Text>
                      </View>
                    </View>

                    <View style={styles.productActions}>
                      <TouchableOpacity
                        style={[styles.iconActionBtn, { backgroundColor: '#EFF6FF' }]}
                        onPress={() => handleOpenEditProduct(item)}
                      >
                        <Ionicons name="pencil" size={18} color="#2563EB" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.iconActionBtn, { backgroundColor: '#FEF2F2' }]}
                        onPress={() => handleDeleteProduct(item.id, item.title)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      ) : activeTab === 'orders' ? (
        <View style={{ flex: 1 }}>
          {/* BARRA SUPERIOR DE PEDIDOS */}
          <View style={styles.ordersHeaderBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Gestión de Pedidos</Text>
              <Text style={styles.ordersSubtitle}>
                {pendingAcceptCount > 0
                  ? `🔔 ¡Tienes ${pendingAcceptCount} orden(es) lista(s) para aceptar!`
                  : 'Sincronizado en tiempo real'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshOrdersBtn}
              onPress={() => myBusiness?.id && fetchOrdersOnly(myBusiness.id, true)}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#1E293B" />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color="#1E293B" style={{ marginRight: 4 }} />
                  <Text style={styles.refreshOrdersBtnText}>Actualizar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* FILTROS RÁPIDOS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <TouchableOpacity
              style={[styles.filterChip, orderFilter === 'ALL' && styles.filterChipActive]}
              onPress={() => setOrderFilter('ALL')}
            >
              <Text style={[styles.filterChipText, orderFilter === 'ALL' && styles.filterChipTextActive]}>
                Todos ({orders.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                orderFilter === 'PENDING_ACCEPT' && styles.filterChipActive,
                pendingAcceptCount > 0 && styles.filterChipAlert,
              ]}
              onPress={() => setOrderFilter('PENDING_ACCEPT')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  orderFilter === 'PENDING_ACCEPT' && styles.filterChipTextActive,
                  pendingAcceptCount > 0 && { color: '#B45309', fontWeight: 'bold' },
                ]}
              >
                🔔 Por Aceptar ({pendingAcceptCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, orderFilter === 'PREPARING' && styles.filterChipActive]}
              onPress={() => setOrderFilter('PREPARING')}
            >
              <Text style={[styles.filterChipText, orderFilter === 'PREPARING' && styles.filterChipTextActive]}>
                🍳 En Cocina ({preparingCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, orderFilter === 'READY' && styles.filterChipActive]}
              onPress={() => setOrderFilter('READY')}
            >
              <Text style={[styles.filterChipText, orderFilter === 'READY' && styles.filterChipTextActive]}>
                📦 Listos ({readyCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, orderFilter === 'DELIVERED' && styles.filterChipActive]}
              onPress={() => setOrderFilter('DELIVERED')}
            >
              <Text style={[styles.filterChipText, orderFilter === 'DELIVERED' && styles.filterChipTextActive]}>
                ✅ Entregados
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* LISTA DE PEDIDOS */}
          <FlatList
            data={filteredOrders}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 120 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => myBusiness?.id && fetchOrdersOnly(myBusiness.id, true)}
                colors={['#FFDB58']}
                tintColor="#FFDB58"
              />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyProductsBox}>
                <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyProductsText}>
                  {orderFilter === 'ALL'
                    ? 'Aún no has recibido pedidos en tu tienda.'
                    : 'No hay pedidos con el filtro seleccionado.'}
                </Text>
              </View>
            )}
            renderItem={({ item }) => {
              const isActionLoading = actionLoadingId === item.id;
              const isPaidPendingAccept =
                item.status === 'PAID' ||
                (item.isPaid &&
                  item.status !== 'PREPARING' &&
                  item.status !== 'READY' &&
                  item.status !== 'ON_WAY' &&
                  item.status !== 'ARRIVED' &&
                  item.status !== 'DELIVERED' &&
                  item.status !== 'CANCELLED');
              const isPreparing = item.status === 'PREPARING';
              const isReady = item.status === 'READY';
              const isOnWay = item.status === 'ON_WAY' || item.status === 'ARRIVED';
              const isDelivered = item.status === 'DELIVERED';
              const isCancelled = item.status === 'CANCELLED';
              const isPendingPayment = !item.isPaid && (item.status === 'PENDING' || item.status === 'CREATED');

              // Estilos y badges
              let statusLabel = item.status;
              let statusBg = '#F1F5F9';
              let statusTextColor = '#475569';

              if (isPaidPendingAccept) {
                statusLabel = '¡PAGADO! POR ACEPTAR 🔔';
                statusBg = '#DCFCE7';
                statusTextColor = '#15803D';
              } else if (isPreparing) {
                statusLabel = 'En Cocina / Preparando 🍳';
                statusBg = '#FEF3C7';
                statusTextColor = '#B45309';
              } else if (isReady) {
                statusLabel = 'Listo para Entrega 📦';
                statusBg = '#E0E7FF';
                statusTextColor = '#4338CA';
              } else if (isOnWay) {
                statusLabel = 'En Camino con Repartidor 🛵';
                statusBg = '#F3E8FF';
                statusTextColor = '#6B21A8';
              } else if (isDelivered) {
                statusLabel = 'Entregado con Éxito ✅';
                statusBg = '#ECFDF5';
                statusTextColor = '#047857';
              } else if (isCancelled) {
                statusLabel = 'Cancelado ❌';
                statusBg = '#FEE2E2';
                statusTextColor = '#B91C1C';
              } else if (isPendingPayment) {
                statusLabel = 'Esperando Validación de Pago ⏳';
                statusBg = '#FEF9C3';
                statusTextColor = '#A16207';
              }

              return (
                <View
                  style={[
                    styles.orderCardEnhanced,
                    isPaidPendingAccept && styles.orderCardPendingAcceptHighlight,
                  ]}
                >
                  {/* BANNER DE ATENCIÓN SI REQUIERE ACEPTACIÓN */}
                  {isPaidPendingAccept && (
                    <View style={styles.alertNoticeBanner}>
                      <Ionicons name="sparkles" size={16} color="#059669" />
                      <Text style={styles.alertNoticeText}>
                        ¡Pago confirmado por admin! Toca "Aceptar Pedido" para iniciar preparación.
                      </Text>
                    </View>
                  )}

                  {/* CABECERA DE LA ORDEN */}
                  <View style={styles.orderHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderNumber}>
                        Orden #{String(item.orderNumber).padStart(4, '0')}
                      </Text>
                      <Text style={styles.orderDateText}>
                        {new Date(item.createdAt).toLocaleDateString()} •{' '}
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <View style={[styles.statusBadgeEnhanced, { backgroundColor: statusBg }]}>
                      <Text style={[styles.statusBadgeEnhancedText, { color: statusTextColor }]}>
                        {statusLabel}
                      </Text>
                    </View>
                  </View>

                  {/* DATOS DEL CLIENTE Y DIRECCIÓN */}
                  <View style={styles.clientInfoBox}>
                    <View style={styles.clientRow}>
                      <Ionicons name="person-circle-outline" size={18} color="#64748B" />
                      <Text style={styles.clientNameText}>
                        Cliente: {item.user?.fullName || item.userIdTemp || 'Cliente IGO'}
                      </Text>
                      {item.user?.phoneNumber && (
                        <TouchableOpacity
                          style={styles.callSmallBtn}
                          onPress={() => handleCallPhone(item.user.phoneNumber)}
                        >
                          <Ionicons name="call" size={12} color="#059669" />
                          <Text style={styles.callSmallBtnText}>Llamar</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.addressRow}>
                      <Ionicons name="location" size={16} color="#EF4444" style={{ marginTop: 2 }} />
                      <Text style={styles.orderAddressText} numberOfLines={2}>
                        {item.deliveryAddress}
                      </Text>
                    </View>

                    {item.deliveryUser && (
                      <View style={styles.driverInfoRow}>
                        <Ionicons name="bicycle" size={16} color="#6366F1" />
                        <Text style={styles.driverInfoText} numberOfLines={1}>
                          Repartidor: {item.deliveryUser.fullName || item.deliveryUser.email} (
                          {item.deliveryUser.vehicle || 'Moto'})
                        </Text>
                        {item.deliveryUser.phoneNumber && (
                          <TouchableOpacity
                            style={styles.callSmallBtn}
                            onPress={() => handleCallPhone(item.deliveryUser.phoneNumber)}
                          >
                            <Ionicons name="call" size={12} color="#6366F1" />
                            <Text style={[styles.callSmallBtnText, { color: '#6366F1' }]}>Llamar</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>

                  {/* DETALLE COMPLETO DE PRODUCTOS SOLICITADOS */}
                  <View style={styles.itemsBox}>
                    <View style={styles.itemsBoxHeader}>
                      <Ionicons name="fast-food-outline" size={16} color="#334155" />
                      <Text style={styles.itemsBoxTitle}>
                        Productos solicitados ({item.items?.length || 0})
                      </Text>
                    </View>

                    {item.items && item.items.length > 0 ? (
                      item.items.map((it: any, idx: number) => {
                        const hasCustomOptions =
                          it.selectedOptionsText &&
                          it.selectedOptionsText.trim() !== '' &&
                          it.selectedOptionsText !== 'Sin adicionales';

                        return (
                          <View key={it.id || idx} style={styles.itemDetailedRow}>
                            <View style={styles.itemQuantityBadge}>
                              <Text style={styles.itemQuantityText}>{it.quantity}x</Text>
                            </View>

                            <View style={{ flex: 1, paddingHorizontal: 8 }}>
                              <Text style={styles.itemTitleText}>
                                {it.product?.title || 'Producto'}
                              </Text>
                              {hasCustomOptions && (
                                <View style={styles.itemOptionsChip}>
                                  <Ionicons name="pricetag-outline" size={11} color="#D97706" />
                                  <Text style={styles.itemOptionsChipText}>
                                    {it.selectedOptionsText}
                                  </Text>
                                </View>
                              )}
                            </View>

                            <Text style={styles.itemPriceText}>
                              ${(Number(it.price) * Number(it.quantity)).toFixed(2)}
                            </Text>
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.emptyItemsText}>
                        Servicio: {item.category || 'Envío'} • {item.shippingType || 'Directo'}
                      </Text>
                    )}

                    {/* DESGLOSE TOTAL */}
                    <View style={styles.totalsDivider} />
                    <View style={styles.totalsRow}>
                      <Text style={styles.totalLabel}>Subtotal productos:</Text>
                      <Text style={styles.totalValue}>${Number(item.totalItems || 0).toFixed(2)}</Text>
                    </View>
                    <View style={styles.totalsRow}>
                      <Text style={styles.totalLabel}>Tarifa de entrega:</Text>
                      <Text style={styles.totalValue}>${Number(item.deliveryFee || 0).toFixed(2)}</Text>
                    </View>
                    <View style={[styles.totalsRow, { marginTop: 4 }]}>
                      <Text style={styles.grandTotalLabel}>TOTAL DEL PEDIDO:</Text>
                      <Text style={styles.grandTotalValue}>
                        ${Number(item.totalAmount || 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* INFORMACIÓN DEL PAGO MÓVIL Y COMPROBANTE */}
                  <View style={styles.paymentBox}>
                    <View style={styles.paymentBoxHeader}>
                      <Ionicons name="card-outline" size={16} color="#047857" />
                      <Text style={styles.paymentBoxTitle}>Información del Pago</Text>
                      <View
                        style={[
                          styles.paidBadgeSmall,
                          { backgroundColor: item.isPaid ? '#DCFCE7' : '#FEF3C7' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.paidBadgeSmallText,
                            { color: item.isPaid ? '#15803D' : '#B45309' },
                          ]}
                        >
                          {item.isPaid ? 'Pagado y Verificado ✅' : 'Esperando Validación ⏳'}
                        </Text>
                      </View>
                    </View>

                    {/* NÚMERO DE REFERENCIA */}
                    <View style={styles.referenceContainer}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.refLabelText}>Número de Referencia:</Text>
                        <Text style={styles.refNumberText}>
                          {item.paymentReference ? `#${item.paymentReference}` : 'No especificada'}
                        </Text>
                      </View>
                      {item.paymentReference ? (
                        <TouchableOpacity
                          style={styles.copyRefBtn}
                          onPress={() => copyPaymentRef(item.paymentReference)}
                        >
                          <Ionicons name="copy-outline" size={14} color="#0284C7" />
                          <Text style={styles.copyRefBtnText}>Copiar Ref</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* FOTO DEL COMPROBANTE DE PAGO */}
                    {item.paymentCaptureUrl ? (
                      <View style={styles.receiptPreviewRow}>
                        <TouchableOpacity
                          style={styles.receiptThumbWrapper}
                          onPress={() => handleOpenReceiptModal(item)}
                        >
                          <Image
                            source={{ uri: item.paymentCaptureUrl }}
                            style={styles.receiptThumb}
                          />
                          <View style={styles.receiptZoomOverlay}>
                            <Ionicons name="search" size={14} color="#FFF" />
                          </View>
                        </TouchableOpacity>

                        <View style={{ flex: 1, paddingLeft: 10 }}>
                          <Text style={styles.receiptAttachedTitle}>Comprobante Adjunto</Text>
                          <Text style={styles.receiptAttachedSub}>
                            Captura de pantalla del Pago Móvil enviada por el cliente.
                          </Text>
                          <TouchableOpacity
                            style={styles.viewFullReceiptBtn}
                            onPress={() => handleOpenReceiptModal(item)}
                          >
                            <Ionicons name="expand" size={13} color="#0284C7" style={{ marginRight: 4 }} />
                            <Text style={styles.viewFullReceiptBtnText}>Ver Comprobante en Grande</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.noReceiptBox}>
                        <Ionicons name="alert-circle-outline" size={16} color="#94A3B8" />
                        <Text style={styles.noReceiptText}>
                          El cliente no adjuntó imagen del comprobante. Valida con el número de referencia.
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* BOTONES DE ACCIÓN PARA EL COMERCIO */}
                  <View style={styles.orderActionsContainer}>
                    {/* ACCIÓN 1: ACEPTAR PEDIDO (Cuando está en PAID o pagado) */}
                    {isPaidPendingAccept && (
                      <View style={styles.actionButtonGroup}>
                        <TouchableOpacity
                          style={[styles.acceptOrderBtn, isActionLoading && { opacity: 0.7 }]}
                          onPress={() => handleAcceptOrder(item)}
                          disabled={isActionLoading}
                        >
                          {isActionLoading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <>
                              <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginRight: 6 }} />
                              <Text style={styles.acceptOrderBtnText}>Aceptar y Preparar Pedido</Text>
                            </>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.rejectOrderBtn, isActionLoading && { opacity: 0.7 }]}
                          onPress={() => handleRejectOrder(item)}
                          disabled={isActionLoading}
                        >
                          <Ionicons name="close-circle-outline" size={16} color="#DC2626" style={{ marginRight: 4 }} />
                          <Text style={styles.rejectOrderBtnText}>Rechazar</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* ACCIÓN 2: MARCAR LISTO PARA ENTREGA (Cuando está en PREPARING) */}
                    {isPreparing && (
                      <TouchableOpacity
                        style={[styles.readyOrderBtn, isActionLoading && { opacity: 0.7 }]}
                        onPress={() => handleMarkReady(item)}
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <>
                            <Ionicons name="cube" size={18} color="#FFF" style={{ marginRight: 6 }} />
                            <Text style={styles.readyOrderBtnText}>Marcar Listo para Retiro 📦</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {/* ACCIÓN 3: CONFIRMAR PAGO DIRECTO (Si está en PENDING y el comercio quiere validarlo directo) */}
                    {isPendingPayment && (
                      <View style={styles.actionButtonGroup}>
                        <TouchableOpacity
                          style={[styles.directVerifyBtn, isActionLoading && { opacity: 0.7 }]}
                          onPress={() => handleDirectVerifyPayment(item)}
                          disabled={isActionLoading}
                        >
                          <Ionicons name="checkmark-done" size={16} color="#FFF" style={{ marginRight: 6 }} />
                          <Text style={styles.directVerifyBtnText}>Confirmar Pago Directamente</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.rejectOrderBtn, isActionLoading && { opacity: 0.7 }]}
                          onPress={() => handleRejectOrder(item)}
                          disabled={isActionLoading}
                        >
                          <Ionicons name="close-circle-outline" size={16} color="#DC2626" style={{ marginRight: 4 }} />
                          <Text style={styles.rejectOrderBtnText}>Rechazar</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* BOTÓN SECUNDARIO: CHAT CON CLIENTE / CHOFER */}
                    {!isCancelled && (
                      <View style={styles.chatAndSupportRow}>
                        <TouchableOpacity
                          style={styles.chatActionBtn}
                          onPress={() => handleOpenChat(item)}
                        >
                          <Ionicons name="chatbubbles-outline" size={15} color="#4F46E5" />
                          <Text style={styles.chatActionBtnText}>Chat de la Orden</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            }}
          />
        </View>
      ) : (
        /* VISTA DE BALANCE & CONCILIACIÓN CON IGO (ESPEJO EXACTO PANEL ADMIN) */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 110 }}
          refreshControl={
            <RefreshControl
              refreshing={settlementLoading}
              onRefresh={() => myBusiness?.id && fetchSettlement(myBusiness.id)}
              colors={['#10B981', '#0284C7']}
            />
          }
        >
          {/* BARRA SUPERIOR DE BALANCE & FILTROS */}
          <View style={styles.settlementHeaderBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Balance & Liquidaciones</Text>
              <Text style={styles.settlementSub}>
                Conciliación oficial de pedidos, entregas y comisiones con IGO
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshOrdersBtn}
              onPress={() => myBusiness?.id && fetchSettlement(myBusiness.id)}
              disabled={settlementLoading}
            >
              {settlementLoading ? (
                <ActivityIndicator size="small" color="#1E293B" />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color="#1E293B" style={{ marginRight: 4 }} />
                  <Text style={styles.refreshOrdersBtnText}>Actualizar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* FILTROS DE RANGO DE FECHA */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.settlementFilterScroll}
          >
            {[
              { id: 'ALL', label: 'Histórico Total' },
              { id: 'THIS_MONTH', label: 'Este Mes' },
              { id: 'LAST_MONTH', label: 'Mes Pasado' },
              { id: 'LAST_7_DAYS', label: 'Últimos 7 Días' },
            ].map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filterChip,
                  settlementFilter === f.id && styles.filterChipActive,
                ]}
                onPress={() => {
                  setSettlementFilter(f.id as any);
                  if (myBusiness?.id) fetchSettlement(myBusiness.id, f.id as any);
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    settlementFilter === f.id && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* HERO CARD DE ESTADO NETO */}
          <View
            style={[
              styles.settlementHeroCard,
              displayNetOwed < 0
                ? styles.settlementHeroCardDebt
                : displayNetOwed > 0
                ? styles.settlementHeroCardCredit
                : styles.settlementHeroCardBalanced,
            ]}
          >
            <View style={styles.settlementHeroHeader}>
              <View
                style={[
                  styles.settlementBadge,
                  displayNetOwed < 0
                    ? styles.settlementBadgeDebt
                    : displayNetOwed > 0
                    ? styles.settlementBadgeCredit
                    : styles.settlementBadgeBalanced,
                ]}
              >
                <Ionicons
                  name={
                    displayNetOwed < 0
                      ? 'alert-circle'
                      : displayNetOwed > 0
                      ? 'trending-up'
                      : 'checkmark-circle'
                  }
                  size={14}
                  color={
                    displayNetOwed < 0
                      ? '#DC2626'
                      : displayNetOwed > 0
                      ? '#16A34A'
                      : '#0284C7'
                  }
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.settlementBadgeText,
                    displayNetOwed < 0
                      ? styles.settlementBadgeTextDebt
                      : displayNetOwed > 0
                      ? styles.settlementBadgeTextCredit
                      : styles.settlementBadgeTextBalanced,
                  ]}
                >
                  {displayNetOwed < 0
                    ? 'DEUDA PENDIENTE CON IGO'
                    : displayNetOwed > 0
                    ? 'SALDO A FAVOR DEL COMERCIO'
                    : 'AL DÍA CON IGO'}
                </Text>
              </View>

              <Text style={styles.bcvRateSmallText}>
                BCV: Bs. {Number(bcvRate).toFixed(2)}
              </Text>
            </View>

            <Text style={styles.settlementHeroTitle}>
              {displayNetOwed < 0
                ? 'Debes Transferir a IGO'
                : displayNetOwed > 0
                ? 'Saldo a Favor en IGO'
                : 'Sin deudas pendientes'}
            </Text>

            <Text
              style={[
                styles.settlementHeroAmount,
                displayNetOwed < 0
                  ? { color: '#DC2626' }
                  : displayNetOwed > 0
                  ? { color: '#16A34A' }
                  : { color: '#0F172A' },
              ]}
            >
              {displayNetOwed < 0
                ? `-$${Math.abs(displayNetOwed).toFixed(2)}`
                : displayNetOwed > 0
                ? `+$${displayNetOwed.toFixed(2)}`
                : '$0.00'}{' '}
              <Text style={styles.currencySub}>USD</Text>
            </Text>

            {displayNetOwed !== 0 && (
              <Text style={styles.settlementHeroAmountBs}>
                ≈ Bs. {amountDueBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            )}

            <Text style={styles.settlementHeroExpl}>
              {displayNetOwed < 0
                ? 'Recibiste pagos de pedidos que incluían el cobro de delivery en tu cuenta bancaria (Pago Negocio) y comisión sobre productos. Transfiere este monto a IGO para el pago a los repartidores y la plataforma.'
                : displayNetOwed > 0
                ? 'Tus clientes pagaron directamente a las cuentas de IGO (\'Pago IGO\'). La plataforma debe transferirte el monto correspondiente a tus productos vendidos.'
                : 'Todas las entregas, comisiones y cobros con IGO están completamente liquidados y al día.'}
            </Text>
          </View>

          {/* TARJETA DE DESGLOSE FINANCIERO */}
          <View style={styles.breakdownCard}>
            <View style={styles.breakdownHeaderRow}>
              <Ionicons name="calculator-outline" size={20} color="#1E293B" style={{ marginRight: 8 }} />
              <Text style={styles.breakdownCardTitle}>Conciliación Detallada</Text>
            </View>

            {/* Fila de Métricas Rápidas */}
            <View style={styles.breakdownMetricsRow}>
              <View style={styles.breakdownMiniMetric}>
                <Text style={styles.breakdownMiniLabel}>Órdenes Pagadas</Text>
                <Text style={styles.breakdownMiniValue}>{displayPaidOrdersCount}</Text>
              </View>
              <View style={styles.breakdownMiniMetric}>
                <Text style={styles.breakdownMiniLabel}>Venta Productos</Text>
                <Text style={[styles.breakdownMiniValue, { color: '#10B981' }]}>
                  ${displayItemsSubtotal.toFixed(2)}
                </Text>
              </View>
              <View style={styles.breakdownMiniMetric}>
                <Text style={styles.breakdownMiniLabel}>Delivery Total</Text>
                <Text style={[styles.breakdownMiniValue, { color: '#0284C7' }]}>
                  ${displayDeliverySubtotal.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.breakdownDivider} />

            {/* Líneas de Cálculo */}
            <View style={styles.calcLine}>
              <View style={{ flex: 1 }}>
                <Text style={styles.calcLineTitle}>Total Recaudado en Tienda</Text>
                <Text style={styles.calcLineSub}>Dinero total recibido de clientes (Productos + Delivery)</Text>
              </View>
              <Text style={[styles.calcLineValue, { color: '#16A34A' }]}>
                +${displayTotalCollected.toFixed(2)}
              </Text>
            </View>

            <View style={styles.calcLine}>
              <View style={{ flex: 1 }}>
                <Text style={styles.calcLineTitle}>Delivery a Transferir a IGO</Text>
                <Text style={styles.calcLineSub}>Tarifa de envíos recibida que corresponde a los repartidores</Text>
              </View>
              <Text style={[styles.calcLineValue, { color: '#DC2626' }]}>
                -${displayDeliverySubtotal.toFixed(2)}
              </Text>
            </View>

            <View style={styles.calcLine}>
              <View style={{ flex: 1 }}>
                <Text style={styles.calcLineTitle}>Comisión Plataforma IGO ({commissionRate}%)</Text>
                <Text style={styles.calcLineSub}>Calculada sobre ${displayItemsSubtotal.toFixed(2)} en productos</Text>
              </View>
              <Text style={[styles.calcLineValue, { color: '#DC2626' }]}>
                -${displayCommissionAmount.toFixed(2)}
              </Text>
            </View>

            <View style={styles.breakdownDivider} />

            <View style={styles.calcTotalLine}>
              <View style={{ flex: 1 }}>
                <Text style={styles.calcTotalTitle}>Total Adeudado a IGO</Text>
                <Text style={styles.calcTotalSub}>Delivery recibido en tienda + Comisión de ventas</Text>
              </View>
              <Text style={styles.calcTotalValue}>
                ${displayBizDebt.toFixed(2)}
              </Text>
            </View>

            <View style={styles.breakdownDivider} />

            <View style={styles.calcNetLine}>
              <View style={{ flex: 1 }}>
                <Text style={styles.calcNetTitle}>Tu Ganancia Neta:</Text>
                <Text style={styles.calcLineSub}>Venta de productos menos comisión IGO</Text>
              </View>
              <Text style={[styles.calcNetValue, { color: '#16A34A' }]}>
                +${displayBizNetEarnings.toFixed(2)} USD
              </Text>
            </View>
          </View>

          {/* DATOS DE PAGO MÓVIL OFICIAL IGO */}
          <View style={styles.bankDataCard}>
            <View style={styles.bankDataHeader}>
              <View style={styles.bankDataIconBg}>
                <Ionicons name="card" size={20} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bankDataTitle}>Cuentas Oficiales Pago Móvil IGO</Text>
                <Text style={styles.bankDataSub}>Para transferir tu balance pendiente</Text>
              </View>
            </View>

            <View style={styles.bankItemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bankItemLabel}>Banco Destino</Text>
                <Text style={styles.bankItemValue}>
                  {settlementData?.paymentInfo?.bank || '0102 - Banco de Venezuela'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.copySmallBtn}
                onPress={() => copyTextToClipboard(settlementData?.paymentInfo?.bank || '0102 - Banco de Venezuela', 'Banco')}
              >
                <Ionicons name="copy-outline" size={14} color="#0284C7" />
                <Text style={styles.copySmallBtnText}>Copiar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bankItemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bankItemLabel}>Teléfono</Text>
                <Text style={styles.bankItemValue}>
                  {settlementData?.paymentInfo?.phone || '0412-1234567'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.copySmallBtn}
                onPress={() => copyTextToClipboard(settlementData?.paymentInfo?.phone || '0412-1234567', 'Teléfono')}
              >
                <Ionicons name="copy-outline" size={14} color="#0284C7" />
                <Text style={styles.copySmallBtnText}>Copiar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bankItemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bankItemLabel}>Cédula / RIF</Text>
                <Text style={styles.bankItemValue}>
                  {settlementData?.paymentInfo?.id || 'V-12345678'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.copySmallBtn}
                onPress={() => copyTextToClipboard(settlementData?.paymentInfo?.id || 'V-12345678', 'Cédula / RIF')}
              >
                <Ionicons name="copy-outline" size={14} color="#0284C7" />
                <Text style={styles.copySmallBtnText}>Copiar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bankItemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bankItemLabel}>Beneficiario / Titular</Text>
                <Text style={styles.bankItemValue}>
                  {settlementData?.paymentInfo?.name || 'IGO Delivery C.A.'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.copySmallBtn}
                onPress={() => copyTextToClipboard(settlementData?.paymentInfo?.name || 'IGO Delivery C.A.', 'Beneficiario')}
              >
                <Ionicons name="copy-outline" size={14} color="#0284C7" />
                <Text style={styles.copySmallBtnText}>Copiar</Text>
              </TouchableOpacity>
            </View>

            {/* BOTONES DE ACCIÓN: COPIAR TODO Y NOTIFICAR */}
            <View style={styles.bankActionsRow}>
              <TouchableOpacity style={styles.copyAllBankBtn} onPress={copyAllPagoMovil}>
                <Ionicons name="copy" size={16} color="#0284C7" style={{ marginRight: 6 }} />
                <Text style={styles.copyAllBankBtnText}>Copiar Datos</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.notifyPaymentBtn} onPress={handleNotifyPayment}>
                <Ionicons name="chatbubbles" size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.notifyPaymentBtnText}>Notificar Pago</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* LISTA DE PEDIDOS CONCILIADOS */}
          <View style={styles.ordersAuditContainer}>
            <View style={styles.ordersAuditHeader}>
              <Ionicons name="list-outline" size={18} color="#1E293B" style={{ marginRight: 6 }} />
              <Text style={styles.ordersAuditTitle}>
                Pedidos en este Período ({settlementData?.orders?.length || paidOrders.length})
              </Text>
            </View>

            {(settlementData?.orders || paidOrders).length === 0 ? (
              <View style={styles.emptySettlementOrders}>
                <Ionicons name="receipt-outline" size={36} color="#CBD5E1" />
                <Text style={styles.emptySettlementOrdersText}>
                  No hay pedidos conciliados en el período seleccionado.
                </Text>
              </View>
            ) : (
              (settlementData?.orders || paidOrders).map((ord: any) => {
                const isPagoNegocio = ord.paymentRecipient !== 'Pago IGO';
                const orderItemsVal = Number(ord.totalItems || 0);
                const orderDeliveryVal = Number(ord.deliveryFee || 0);
                const orderCommissionVal = Number((orderItemsVal * (commissionRate / 100)).toFixed(2));
                const orderTotalDebtVal = Number((orderDeliveryVal + orderCommissionVal).toFixed(2));
                const dateStr = new Date(ord.createdAt).toLocaleDateString();
                const timeStr = new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <View key={ord.id} style={styles.auditOrderCard}>
                    <View style={styles.auditOrderTopRow}>
                      <View>
                        <Text style={styles.auditOrderNumber}>
                          Orden #{String(ord.orderNumber || '').padStart(4, '0')}
                        </Text>
                        <Text style={styles.auditOrderDate}>
                          {dateStr} • {timeStr}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.recipientBadge,
                          isPagoNegocio ? styles.recipientBadgeBiz : styles.recipientBadgeIgo,
                        ]}
                      >
                        <Text
                          style={[
                            styles.recipientBadgeText,
                            isPagoNegocio ? styles.recipientBadgeTextBiz : styles.recipientBadgeTextIgo,
                          ]}
                        >
                          {isPagoNegocio ? 'Recaudado en Tienda' : 'Pago IGO'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.auditOrderDetailsRow}>
                      <View style={styles.auditOrderDetailItem}>
                        <Text style={styles.auditOrderLabel}>Productos</Text>
                        <Text style={styles.auditOrderVal}>${orderItemsVal.toFixed(2)}</Text>
                      </View>

                      <View style={styles.auditOrderDetailItem}>
                        <Text style={styles.auditOrderLabel}>Delivery (IGO)</Text>
                        <Text style={[styles.auditOrderVal, { color: '#DC2626', fontWeight: 'bold' }]}>
                          ${orderDeliveryVal.toFixed(2)}
                        </Text>
                      </View>

                      <View style={styles.auditOrderDetailItem}>
                        <Text style={styles.auditOrderLabel}>Comisión</Text>
                        <Text style={[styles.auditOrderVal, { color: '#DC2626', fontWeight: '600' }]}>
                          ${orderCommissionVal.toFixed(2)}
                        </Text>
                      </View>

                      <View style={styles.auditOrderDetailItem}>
                        <Text style={styles.auditOrderLabel}>A Pagar IGO</Text>
                        <Text style={[styles.auditOrderVal, { color: '#DC2626', fontWeight: 'bold' }]}>
                          ${orderTotalDebtVal.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      {/* MODAL PARA VER COMPROBANTE DE PAGO EN GRANDE */}
      <Modal
        visible={receiptModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.receiptModalBackdrop}>
          <View style={styles.receiptModalCard}>
            <View style={styles.receiptModalHeader}>
              <View>
                <Text style={styles.receiptModalTitle}>
                  Comprobante Orden #{String(selectedReceipt?.orderNumber || '').padStart(4, '0')}
                </Text>
                <Text style={styles.receiptModalSub}>
                  Cliente: {selectedReceipt?.clientName || 'Cliente IGO'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setReceiptModalVisible(false)}
                style={styles.closeReceiptBtn}
              >
                <Ionicons name="close" size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>

            {selectedReceipt?.url ? (
              <ScrollView
                maximumZoomScale={3}
                minimumZoomScale={1}
                contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}
                style={styles.receiptImageScroll}
              >
                <Image
                  source={{ uri: selectedReceipt.url }}
                  style={styles.receiptModalFullImage}
                  resizeMode="contain"
                />
              </ScrollView>
            ) : null}

            {/* BARRA INFERIOR DEL MODAL CON REFERENCIA Y TOTAL */}
            <View style={styles.receiptModalFooter}>
              <View style={{ flex: 1 }}>
                <Text style={styles.receiptFooterLabel}>Referencia Pago Móvil:</Text>
                <Text style={styles.receiptFooterRef}>
                  #{selectedReceipt?.reference || 'No registrada'}
                </Text>
              </View>

              {selectedReceipt?.reference ? (
                <TouchableOpacity
                  style={styles.copyModalRefBtn}
                  onPress={() => copyPaymentRef(selectedReceipt.reference || '')}
                >
                  <Ionicons name="copy-outline" size={16} color="#FFF" style={{ marginRight: 4 }} />
                  <Text style={styles.copyModalRefBtnText}>Copiar</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.closeModalFooterBtn}
                onPress={() => setReceiptModalVisible(false)}
              >
                <Text style={styles.closeModalFooterBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CHAT CON CLIENTE / CHOFER */}
      {selectedOrderForChat && (
        <OrderChatModal
          visible={chatModalVisible}
          onClose={() => setChatModalVisible(false)}
          order={selectedOrderForChat}
          currentUser={user}
        />
      )}

      {/* MODAL CREAR / EDITAR PRODUCTO */}
      <Modal
        visible={showProductModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!savingProduct) setShowProductModal(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowProductModal(false)}
                disabled={savingProduct}
              >
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 25 }}>
              {/* IMAGEN DEL PRODUCTO */}
              <View style={styles.imagePickerSection}>
                {productImageUri ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: productImageUri }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setProductImageUri(null)}
                      disabled={savingProduct}
                    >
                      <Ionicons name="trash" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imagePlaceholderBox}>
                    <Ionicons name="cloud-upload-outline" size={36} color="#94A3B8" />
                    <Text style={styles.imagePlaceholderText}>Sube una foto atractiva del producto</Text>
                  </View>
                )}

                <View style={styles.imageButtonsRow}>
                  <TouchableOpacity
                    style={styles.mediaBtn}
                    onPress={handlePickGalleryImage}
                    disabled={savingProduct}
                  >
                    <Ionicons name="images-outline" size={18} color="#334155" style={{ marginRight: 6 }} />
                    <Text style={styles.mediaBtnText}>Galería</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.mediaBtn}
                    onPress={handleTakePhoto}
                    disabled={savingProduct}
                  >
                    <Ionicons name="camera-outline" size={18} color="#334155" style={{ marginRight: 6 }} />
                    <Text style={styles.mediaBtnText}>Cámara</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* CAMPOS DEL FORMULARIO */}
              <Text style={styles.inputLabel}>Título / Nombre del Producto *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej. Hamburguesa Doble Queso"
                value={productTitle}
                onChangeText={setProductTitle}
                editable={!savingProduct}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Precio en USD ($) *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ej. 8.50"
                    keyboardType="numeric"
                    value={productPrice}
                    onChangeText={setProductPrice}
                    editable={!savingProduct}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Stock Disponible</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ej. 25"
                    keyboardType="number-pad"
                    value={productStock}
                    onChangeText={setProductStock}
                    editable={!savingProduct}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Descripción del Producto</Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Ingredientes, porciones, detalles..."
                multiline
                numberOfLines={3}
                value={productDescription}
                onChangeText={setProductDescription}
                editable={!savingProduct}
              />

              <TouchableOpacity
                style={[styles.saveBtn, savingProduct && { opacity: 0.6 }]}
                onPress={handleSaveProduct}
                disabled={savingProduct}
              >
                {savingProduct ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#000" style={{ marginRight: 6 }} />
                    <Text style={styles.saveBtnText}>
                      {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL DE SOPORTE EN TIEMPO REAL / NOTIFICAR PAGO */}
      <SupportChatModal
        visible={supportModalVisible}
        onClose={() => setSupportModalVisible(false)}
        currentUser={user}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#F8FAFC',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFDB58',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
  },
  switchModeBtn: {
    marginTop: 15,
    padding: 10,
  },
  switchModeBtnText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  businessInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  businessLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  businessLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  businessRoleText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  clientModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clientModeToggleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 4,
  },
  metricIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#FFDB58',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  activeTabButtonText: {
    color: '#1E293B',
    fontWeight: 'bold',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFDB58',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addProductBtnSmall: {
    backgroundColor: '#FFDB58',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 15,
  },
  addProductBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
  },
  emptyProductsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyProductsText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 10,
    textAlign: 'center',
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  productThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  productThumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  productDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
  },
  productStock: {
    fontSize: 12,
    color: '#64748B',
  },
  productActions: {
    flexDirection: 'column',
    gap: 6,
  },
  iconActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  orderCustomer: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  orderAddress: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  orderItemsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginVertical: 8,
    gap: 2,
  },
  orderItemRow: {
    fontSize: 12,
    color: '#475569',
  },
  orderFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  orderPaymentStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  imagePickerSection: {
    alignItems: 'center',
    marginBottom: 15,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 14,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 20,
  },
  imagePlaceholderBox: {
    width: '100%',
    height: 100,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  imageButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  mediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mediaBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1E293B',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFDB58',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },

  // --- ESTILOS ENRIQUECIDOS PARA GESTIÓN DE PEDIDOS ---
  tabBadgePulse: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 6,
  },
  tabBadgePulseText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
  },
  ordersHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  ordersSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  refreshOrdersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  refreshOrdersBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  filterScroll: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  filterChipAlert: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  orderCardEnhanced: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  orderCardPendingAcceptHighlight: {
    borderColor: '#10B981',
    borderWidth: 1.5,
    shadowColor: '#10B981',
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  alertNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  alertNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
    flex: 1,
  },
  orderDateText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusBadgeEnhanced: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusBadgeEnhancedText: {
    fontSize: 11,
    fontWeight: '800',
  },
  clientInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    gap: 6,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clientNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  callSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  callSmallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  orderAddressText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    lineHeight: 16,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  driverInfoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338CA',
    flex: 1,
  },
  itemsBox: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  itemsBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemsBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  itemDetailedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  itemQuantityBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  itemQuantityText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  itemTitleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  itemOptionsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  itemOptionsChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  itemPriceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptyItemsText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  totalsDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  totalLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  totalValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#10B981',
  },
  paymentBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  paymentBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
    flex: 1,
  },
  paidBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  paidBadgeSmallText: {
    fontSize: 11,
    fontWeight: '800',
  },
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  refLabelText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  refNumberText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  copyRefBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  copyRefBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  receiptPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  receiptThumbWrapper: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  receiptThumb: {
    width: 60,
    height: 60,
  },
  receiptZoomOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 3,
    borderTopLeftRadius: 6,
  },
  receiptAttachedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  receiptAttachedSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 14,
  },
  viewFullReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  viewFullReceiptBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  noReceiptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  noReceiptText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
    lineHeight: 15,
  },
  orderActionsContainer: {
    marginTop: 14,
    gap: 8,
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptOrderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  acceptOrderBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  rejectOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectOrderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  readyOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#6366F1',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  readyOrderBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  directVerifyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  directVerifyBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  chatAndSupportRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  chatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chatActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },

  // MODAL DE COMPROBANTE DE PAGO EN GRANDE
  receiptModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  receiptModalCard: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  receiptModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  receiptModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  receiptModalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeReceiptBtn: {
    padding: 4,
  },
  receiptImageScroll: {
    flex: 1,
    backgroundColor: '#0F172A',
    minHeight: 350,
  },
  receiptModalFullImage: {
    width: Dimensions.get('window').width - 30,
    height: 450,
  },
  receiptModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
    gap: 10,
  },
  receiptFooterLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  receiptFooterRef: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyModalRefBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyModalRefBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  closeModalFooterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  closeModalFooterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },

  // Quick Bar de Balance en Header
  balanceQuickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
  },
  balanceQuickBarDebt: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  balanceQuickBarCredit: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  balanceQuickBarOk: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  balanceQuickLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  balanceQuickIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceQuickLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  balanceQuickValue: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  balanceQuickRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 8,
  },
  balanceQuickActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },

  // Badge de Deuda en el Tab
  tabBadgeDebt: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  tabBadgeDebtText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFF',
  },

  // Vista de Balance y Conciliación
  settlementHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  settlementSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  settlementFilterScroll: {
    paddingVertical: 6,
    gap: 8,
    marginBottom: 12,
  },

  // Hero Card de Balance
  settlementHeroCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  settlementHeroCardDebt: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FCA5A5',
  },
  settlementHeroCardCredit: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  settlementHeroCardBalanced: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  settlementHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  settlementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  settlementBadgeDebt: {
    backgroundColor: '#FEE2E2',
  },
  settlementBadgeCredit: {
    backgroundColor: '#DCFCE7',
  },
  settlementBadgeBalanced: {
    backgroundColor: '#E0F2FE',
  },
  settlementBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  settlementBadgeTextDebt: {
    color: '#DC2626',
  },
  settlementBadgeTextCredit: {
    color: '#16A34A',
  },
  settlementBadgeTextBalanced: {
    color: '#0284C7',
  },
  bcvRateSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  settlementHeroTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  settlementHeroAmount: {
    fontSize: 32,
    fontWeight: '900',
    marginVertical: 4,
  },
  currencySub: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  settlementHeroAmountBs: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 10,
  },
  settlementHeroExpl: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 8,
  },

  // Tarjeta de Desglose
  breakdownCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  breakdownHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakdownCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  breakdownMetricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  breakdownMiniMetric: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  breakdownMiniLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'center',
  },
  breakdownMiniValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 4,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  calcLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  calcLineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  calcLineSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  calcLineValue: {
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 10,
  },
  calcTotalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  calcTotalTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  calcTotalSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  calcTotalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#DC2626',
  },
  calcNetLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  calcNetTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  calcNetValue: {
    fontSize: 18,
    fontWeight: '900',
  },

  // Tarjeta de Datos Bancarios
  bankDataCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bankDataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  bankDataIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankDataTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  bankDataSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  bankItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  bankItemLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  bankItemValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 2,
  },
  copySmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copySmallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  bankActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  copyAllBankBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  copyAllBankBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  notifyPaymentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 10,
  },
  notifyPaymentBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
  },

  // Auditoría de Pedidos
  ordersAuditContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ordersAuditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ordersAuditTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  emptySettlementOrders: {
    alignItems: 'center',
    paddingVertical: 25,
  },
  emptySettlementOrdersText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
  auditOrderCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  auditOrderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  auditOrderNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  auditOrderDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  recipientBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recipientBadgeBiz: {
    backgroundColor: '#FEF3C7',
  },
  recipientBadgeIgo: {
    backgroundColor: '#DCFCE7',
  },
  recipientBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  recipientBadgeTextBiz: {
    color: '#B45309',
  },
  recipientBadgeTextIgo: {
    color: '#15803D',
  },
  auditOrderDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  auditOrderDetailItem: {
    alignItems: 'center',
  },
  auditOrderLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
  },
  auditOrderVal: {
    fontSize: 12,
    color: '#1E293B',
    marginTop: 2,
  },
});
