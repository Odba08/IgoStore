import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
  Switch,
  Image,
  Dimensions,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminService } from '@/infrastructure/services/admin.service';
import { getSocket } from '@/infrastructure/services/socket.service';
import SoundService from '@/infrastructure/services/sound.service';
import { useNotificationAlertStore } from '@/presentation/store/useNotificationAlertStore';

const { width } = Dimensions.get('window');

interface AdminDashboardProps {
  user: any;
  onSwitchToClientMode?: () => void;
}

type AdminTab = 'metrics' | 'orders' | 'businesses' | 'team' | 'settings' | 'debts';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  onSwitchToClientMode,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('metrics');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Estados de datos
  const [orders, setOrders] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [debtsReport, setDebtsReport] = useState<any[]>([]);
  const [activeDrivers, setActiveDrivers] = useState<any[]>([]);

  // Tasa BCV
  const [bcvRate, setBcvRate] = useState<string>('75.54');
  const [showBcvModal, setShowBcvModal] = useState<boolean>(false);
  const [tempBcvRate, setTempBcvRate] = useState<string>('');
  const [savingBcv, setSavingBcv] = useState<boolean>(false);

  // Alerta sonora
  const [soundAlertEnabled, setSoundAlertEnabled] = useState<boolean>(true);
  const prevOrdersCountRef = useRef<number>(0);

  // Filtros de Pedidos
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'PENDING' | 'IN_PREPARATION' | 'ON_WAY' | 'DELIVERED' | 'CANCELLED'>('ALL');
  const [orderSearchText, setOrderSearchText] = useState<string>('');

  // Modal Detalle / Pago de Pedido
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState<boolean>(false);

  // Modal Asignar Repartidor
  const [orderToAssign, setOrderToAssign] = useState<any | null>(null);
  const [showAssignDriverModal, setShowAssignDriverModal] = useState<boolean>(false);
  const [assigningDriver, setAssigningDriver] = useState<boolean>(false);

  // Modal Crear Comercio
  const [showCreateBizModal, setShowCreateBizModal] = useState<boolean>(false);
  const [newBizName, setNewBizName] = useState<string>('');
  const [newBizAddress, setNewBizAddress] = useState<string>('');
  const [newBizCategory, setNewBizCategory] = useState<string>('Restaurantes');
  const [newBizPhone, setNewBizPhone] = useState<string>('');
  const [newBizCommission, setNewBizCommission] = useState<string>('10');
  const [savingBiz, setSavingBiz] = useState<boolean>(false);

  // Modal Ver/Crear Productos de Comercio
  const [selectedBizForProducts, setSelectedBizForProducts] = useState<any | null>(null);
  const [bizProducts, setBizProducts] = useState<any[]>([]);
  const [loadingBizProducts, setLoadingBizProducts] = useState<boolean>(false);
  const [showBizProductsModal, setShowBizProductsModal] = useState<boolean>(false);

  // Modal Crear Producto dentro del comercio
  const [showCreateProdModal, setShowCreateProdModal] = useState<boolean>(false);
  const [newProdTitle, setNewProdTitle] = useState<string>('');
  const [newProdPrice, setNewProdPrice] = useState<string>('');
  const [newProdStock, setNewProdStock] = useState<string>('10');
  const [newProdDesc, setNewProdDesc] = useState<string>('');
  const [savingProd, setSavingProd] = useState<boolean>(false);

  // Modal Editar Comisión de Comercio
  const [editingBizCommission, setEditingBizCommission] = useState<any | null>(null);
  const [tempCommissionVal, setTempCommissionVal] = useState<string>('');
  const [showCommissionModal, setShowCommissionModal] = useState<boolean>(false);

  // Modal Registrar Repartidor / Empleado
  const [showCreateUserModal, setShowCreateUserModal] = useState<boolean>(false);
  const [newUserFullName, setNewUserFullName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<string>('empleado');
  const [newUserVehicle, setNewUserVehicle] = useState<string>('Moto');
  const [newUserPhone, setNewUserPhone] = useState<string>('');
  const [savingUser, setSavingUser] = useState<boolean>(false);

  // Ajustes del Sistema
  const [settings, setSettings] = useState<Record<string, string>>({
    BCV_RATE: '75.54',
    IGO_PAGO_MOVIL_BANK: '0102 - Banco de Venezuela',
    IGO_PAGO_MOVIL_PHONE: '0412-1234567',
    IGO_PAGO_MOVIL_ID: 'V-12345678',
    IGO_PAGO_MOVIL_NAME: 'IGO Delivery C.A.',
    COMMISSION_IGO_DELIVERY: '20',
    COMMISSION_IGO_TAXI: '15',
    COMMISSION_DRIVER: '80',
    FEE_BASE_DELIVERY: '3.00',
    FEE_KM_DELIVERY: '1.00',
    FEE_BASE_FAVOR: '3.00',
    FEE_KM_FAVOR: '1.00',
    NIGHT_SHIFT_START: '22:00',
    NIGHT_SHIFT_END: '06:00',
    NIGHT_SHIFT_SURCHARGE: '1.5',
  });
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // --- CARGA DE DATOS ---
  const loadDashboardData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const [ordersRes, usersRes, bizRes, bcvRes, settingsRes, debtsRes, driversRes] = await Promise.allSettled([
        AdminService.getOrders(),
        AdminService.getUsers(),
        AdminService.getBusinesses(),
        AdminService.getSetting('BCV_RATE'),
        AdminService.getAllSettings(),
        AdminService.getBusinessDebtsReport(),
        AdminService.getActiveDrivers(),
      ]);

      if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value.data)) {
        const ords = ordersRes.value.data;
        setOrders(ords);

        // Detectar si llegaron nuevas órdenes pendientes
        const pendingCount = ords.filter((o: any) => o.status === 'PENDING').length;
        if (soundAlertEnabled && prevOrdersCountRef.current > 0 && pendingCount > prevOrdersCountRef.current) {
          SoundService.playOrderAlertSound().catch(() => {});
        }
        prevOrdersCountRef.current = pendingCount;
      }

      if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value.data)) {
        setUsersList(usersRes.value.data);
      }

      if (bizRes.status === 'fulfilled' && Array.isArray(bizRes.value.data)) {
        setBusinesses(bizRes.value.data);
      }

      if (bcvRes.status === 'fulfilled' && bcvRes.value.data?.value) {
        setBcvRate(String(bcvRes.value.data.value));
      }

      if (settingsRes.status === 'fulfilled' && settingsRes.value.data) {
        setSettings((prev) => ({ ...prev, ...settingsRes.value.data }));
      }

      if (debtsRes.status === 'fulfilled' && Array.isArray(debtsRes.value.data)) {
        setDebtsReport(debtsRes.value.data);
      }

      if (driversRes.status === 'fulfilled' && Array.isArray(driversRes.value.data)) {
        setActiveDrivers(driversRes.value.data);
      }
    } catch (e) {
      console.warn('Error loading admin dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Polling cada 8 segundos para mantener el panel vivo
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 8000);

    // Conexión WebSockets para actualizaciones en vivo
    let socket: any = null;
    try {
      socket = getSocket();
      if (socket) {
        const handleOrderEvent = (ord: any) => {
          console.log('⚡ [Admin WS] Evento de orden recibido:', ord?.id, ord?.status);
          loadDashboardData(true);
          if (soundAlertEnabled) {
            SoundService.playOrderAlertSound().catch(() => {});
            useNotificationAlertStore.getState().showAlert({
              title: '👑 ¡Alerta Admin - Nueva Orden!',
              message: `Orden #${String(ord?.orderNumber || '').padStart(4, '0')} recibida por $${Number(ord?.totalAmount || 0).toFixed(2)}.`,
              orderNumber: ord?.orderNumber,
              orderId: ord?.id,
              clientName: ord?.user?.fullName || 'Cliente IGO',
              totalAmount: Number(ord?.totalAmount || 0),
              actionLabel: 'GESTIONAR PEDIDO',
              onAction: () => {
                setActiveTab('orders');
                setSelectedOrder(ord);
                setShowOrderDetailModal(true);
              },
            });
          }
        };

        socket.on('order:created', handleOrderEvent);
        socket.on('order:updated', handleOrderEvent);
        socket.on('order:payment_verified', handleOrderEvent);

        return () => {
          clearInterval(interval);
          socket.off('order:created', handleOrderEvent);
          socket.off('order:updated', handleOrderEvent);
          socket.off('order:payment_verified', handleOrderEvent);
        };
      }
    } catch (e) {}

    return () => clearInterval(interval);
  }, [soundAlertEnabled]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData(true);
  };

  // --- OPERACIONES DE TASA BCV ---
  const handleSaveBcvRate = async () => {
    if (!tempBcvRate.trim() || isNaN(Number(tempBcvRate))) {
      Alert.alert('Valor inválido', 'Ingresa una tasa numérica válida (ej: 75.54).');
      return;
    }
    try {
      setSavingBcv(true);
      await AdminService.updateSetting('BCV_RATE', tempBcvRate.trim());
      setBcvRate(tempBcvRate.trim());
      setShowBcvModal(false);
      Alert.alert('✅ Tasa Actualizada', `La tasa oficial BCV se actualizó a ${tempBcvRate.trim()} Bs/$ en toda la plataforma.`);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || err.message || 'No se pudo actualizar la tasa.');
    } finally {
      setSavingBcv(false);
    }
  };

  // --- OPERACIONES DE PEDIDOS ---
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
    try {
      await AdminService.updateOrder(orderId, { status: nextStatus });
      Alert.alert('Estado Actualizado', `La orden cambió a: ${nextStatus}`);
      setShowOrderDetailModal(false);
      loadDashboardData(true);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'No se pudo actualizar el estado');
    }
  };

  const handleVerifyPayment = async (orderId: string, isPaid: boolean) => {
    try {
      await AdminService.verifyOrderPayment(orderId, isPaid);
      Alert.alert('Pago Actualizado', isPaid ? 'El pago ha sido verificado como PAGADO ✅' : 'El pedido se marcó como PENDIENTE DE PAGO ⏳');
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, isPaid });
      }
      loadDashboardData(true);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'No se pudo verificar el pago');
    }
  };

  const handleAssignDriver = async (orderId: string, driverId: string | null) => {
    try {
      setAssigningDriver(true);
      await AdminService.assignOrderDriver(orderId, driverId);
      Alert.alert('Repartidor Asignado', driverId ? 'El repartidor fue asignado exitosamente al pedido 🛵' : 'Se desasignó el repartidor de la orden.');
      setShowAssignDriverModal(false);
      setOrderToAssign(null);
      loadDashboardData(true);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'No se pudo asignar el repartidor');
    } finally {
      setAssigningDriver(false);
    }
  };

  // --- OPERACIONES DE COMERCIOS ---
  const handleCreateBusiness = async () => {
    if (!newBizName.trim()) {
      Alert.alert('Campo requerido', 'Ingresa el nombre del comercio.');
      return;
    }
    try {
      setSavingBiz(true);
      await AdminService.createBusiness({
        name: newBizName.trim(),
        address: newBizAddress.trim() || 'Valera, Trujillo',
        category: newBizCategory,
        phoneNumber: newBizPhone.trim(),
        commissionPercentage: parseFloat(newBizCommission) || 10,
        ownerId: user?.id,
      });
      setShowCreateBizModal(false);
      setNewBizName('');
      setNewBizAddress('');
      setNewBizPhone('');
      Alert.alert('¡Comercio Creado!', 'El comercio ha sido registrado con éxito.');
      loadDashboardData(true);
    } catch (err: any) {
      Alert.alert('Error al crear comercio', err?.response?.data?.message || err.message);
    } finally {
      setSavingBiz(false);
    }
  };

  const handleSaveCommission = async () => {
    if (!editingBizCommission || !tempCommissionVal.trim()) return;
    try {
      await AdminService.updateBusiness(editingBizCommission.id, {
        commissionPercentage: parseFloat(tempCommissionVal) || 10,
      });
      setShowCommissionModal(false);
      setEditingBizCommission(null);
      Alert.alert('Comisión Guardada', `Se actualizó la comisión al ${tempCommissionVal}%`);
      loadDashboardData(true);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || err.message);
    }
  };

  const handleDeleteBusiness = (biz: any) => {
    Alert.alert(
      '¿Eliminar Comercio?',
      `¿Estás seguro de eliminar "${biz.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await AdminService.deleteBusiness(biz.id);
              Alert.alert('Comercio Eliminado');
              loadDashboardData(true);
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message || 'No se pudo eliminar el comercio');
            }
          },
        },
      ]
    );
  };

  const handleOpenBizProducts = async (biz: any) => {
    setSelectedBizForProducts(biz);
    setShowBizProductsModal(true);
    try {
      setLoadingBizProducts(true);
      const res = await AdminService.getBusinessProducts(biz.id);
      setBizProducts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Error fetching biz products:', err);
    } finally {
      setLoadingBizProducts(false);
    }
  };

  const handleCreateProductInBiz = async () => {
    if (!selectedBizForProducts || !newProdTitle.trim() || !newProdPrice.trim()) {
      Alert.alert('Campos requeridos', 'Por favor ingresa nombre y precio.');
      return;
    }
    try {
      setSavingProd(true);
      await AdminService.createBusinessProduct(selectedBizForProducts.id, {
        title: newProdTitle.trim(),
        price: parseFloat(newProdPrice) || 1,
        stock: parseInt(newProdStock, 10) || 10,
        description: newProdDesc.trim(),
      });
      setShowCreateProdModal(false);
      setNewProdTitle('');
      setNewProdPrice('');
      setNewProdStock('10');
      setNewProdDesc('');
      // Refrescar lista de productos del comercio
      const res = await AdminService.getBusinessProducts(selectedBizForProducts.id);
      setBizProducts(Array.isArray(res.data) ? res.data : []);
      Alert.alert('¡Producto Agregado!', 'El producto fue agregado a este comercio.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || err.message);
    } finally {
      setSavingProd(false);
    }
  };

  const handleDeleteProduct = (productId: string) => {
    if (!selectedBizForProducts) return;
    Alert.alert(
      '¿Eliminar Producto?',
      '¿Deseas eliminar este producto del comercio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await AdminService.deleteBusinessProduct(selectedBizForProducts.id, productId);
              setBizProducts((prev) => prev.filter((p) => p.id !== productId));
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'No se pudo eliminar');
            }
          },
        },
      ]
    );
  };

  // --- OPERACIONES DE REPARTIDORES Y EQUIPO ---
  const handleToggleUserActive = async (u: any) => {
    const nextStatus = !u.isActive;
    try {
      await AdminService.updateUserStatus(u.id, nextStatus);
      setUsersList((prev) => prev.map((item) => (item.id === u.id ? { ...item, isActive: nextStatus } : item)));
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo cambiar el estado de la cuenta');
    }
  };

  const handleChangeEmployeeStatus = async (u: any, nextStatus: string) => {
    try {
      await AdminService.updateEmployeeStatus(u.id, nextStatus);
      setUsersList((prev) => prev.map((item) => (item.id === u.id ? { ...item, employeeStatus: nextStatus } : item)));
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo actualizar el estado de servicio');
    }
  };

  const handleCreateUser = async () => {
    if (!newUserFullName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      Alert.alert('Campos requeridos', 'Por favor llena nombre, email y contraseña.');
      return;
    }
    try {
      setSavingUser(true);
      await AdminService.createUser({
        fullName: newUserFullName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword.trim(),
        roles: [newUserRole],
        vehicle: newUserRole === 'empleado' ? newUserVehicle : undefined,
        phoneNumber: newUserPhone.trim(),
      });
      setShowCreateUserModal(false);
      setNewUserFullName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserPhone('');
      Alert.alert('Usuario Creado', `Se registró al ${newUserRole === 'empleado' ? 'repartidor' : newUserRole} exitosamente.`);
      loadDashboardData(true);
    } catch (err: any) {
      Alert.alert('Error al registrar usuario', err?.response?.data?.message || err.message);
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = (u: any) => {
    Alert.alert(
      '¿Eliminar Usuario?',
      `¿Deseas eliminar a ${u.fullName || u.email}? Se revocará su acceso inmediatamente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await AdminService.deleteUser(u.id);
              loadDashboardData(true);
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'No se pudo eliminar');
            }
          },
        },
      ]
    );
  };

  // --- OPERACIONES DE AJUSTES GLOBALES ---
  const handleSaveAllSettings = async () => {
    try {
      setSavingSettings(true);
      await AdminService.updateBulkSettings(settings);
      Alert.alert('✅ Ajustes Guardados', 'Todos los parámetros globales del sistema fueron actualizados con éxito.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'No se pudieron guardar los ajustes');
    } finally {
      setSavingSettings(false);
    }
  };

  // --- CÁLCULO DE MÉTRICAS ---
  const totalSales = orders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
  const activeOrdersCount = orders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length;
  const driversList = usersList.filter((u) => u.roles?.includes('empleado') || u.roles?.includes('worker'));
  const activeDriversCount = driversList.filter((d) => d.employeeStatus === 'active').length;

  // Rendimiento por comercio
  const bizPerformanceMap = orders.reduce((acc: any, o: any) => {
    if (!o.isPaid || !o.business) return acc;
    const bId = o.business.id;
    const bName = o.business.name;
    const itemsTotal = parseFloat(o.totalItems) || 0;
    const commPct = parseFloat(o.business.commissionPercentage) || 10;
    const commEarned = itemsTotal * (commPct / 100);

    if (!acc[bId]) {
      acc[bId] = { id: bId, name: bName, totalSales: 0, commission: 0, orderCount: 0 };
    }
    acc[bId].totalSales += parseFloat(o.totalAmount) || 0;
    acc[bId].commission += commEarned;
    acc[bId].orderCount += 1;
    return acc;
  }, {});

  const bizPerformanceList = Object.values(bizPerformanceMap).sort((a: any, b: any) => b.totalSales - a.totalSales);

  // Filtrado de órdenes
  const filteredOrders = orders.filter((o) => {
    const matchesFilter =
      orderFilter === 'ALL'
        ? true
        : orderFilter === 'PENDING'
        ? o.status === 'PENDING'
        : orderFilter === 'IN_PREPARATION'
        ? o.status === 'IN_PREPARATION' || o.status === 'PREPARING'
        : orderFilter === 'ON_WAY'
        ? o.status === 'ON_WAY' || o.status === 'ON_THE_WAY'
        : orderFilter === 'DELIVERED'
        ? o.status === 'DELIVERED'
        : o.status === 'CANCELLED';

    const search = orderSearchText.toLowerCase();
    const matchesSearch =
      !search ||
      String(o.orderNumber || '').includes(search) ||
      (o.user?.fullName || '').toLowerCase().includes(search) ||
      (o.business?.name || '').toLowerCase().includes(search);

    return matchesFilter && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* HEADER SUPERIOR ADMIN */}
      <View style={styles.adminHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#000" />
            <Text style={styles.adminBadgeText}>PANEL SUPERADMIN</Text>
          </View>
          <Text style={styles.headerTitle}>IGO Control Central</Text>
          <Text style={styles.headerSubtitle}>Administrador: {user?.fullname || user?.email}</Text>
        </View>

        <View style={styles.headerRight}>
          {/* BOTÓN MODO CLIENTE */}
          {onSwitchToClientMode && (
            <TouchableOpacity
              style={styles.clientModeBtn}
              onPress={onSwitchToClientMode}
              activeOpacity={0.8}
            >
              <Ionicons name="cart-outline" size={16} color="#FFCC00" />
              <Text style={styles.clientModeBtnText}>Modo Cliente</Text>
            </TouchableOpacity>
          )}

          {/* TOGGLE ALERTA SONORA */}
          <TouchableOpacity
            style={[styles.soundToggleBtn, { backgroundColor: soundAlertEnabled ? '#10B981' : '#4B5563' }]}
            onPress={() => {
              const next = !soundAlertEnabled;
              setSoundAlertEnabled(next);
              if (next) SoundService.playOrderAlertSound().catch(() => {});
            }}
          >
            <Ionicons name={soundAlertEnabled ? 'volume-high' : 'volume-mute'} size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* WIDGET OFICIAL TASA BCV */}
      <View style={styles.bcvWidget}>
        <View style={styles.bcvInfo}>
          <Text style={styles.bcvLabel}>TASA OFICIAL BCV</Text>
          <Text style={styles.bcvValue}>{bcvRate} Bs/$</Text>
        </View>
        <TouchableOpacity
          style={styles.bcvUpdateBtn}
          onPress={() => {
            setTempBcvRate(bcvRate);
            setShowBcvModal(true);
          }}
        >
          <Ionicons name="create-outline" size={16} color="#000" style={{ marginRight: 4 }} />
          <Text style={styles.bcvUpdateBtnText}>Actualizar Tasa</Text>
        </TouchableOpacity>
      </View>

      {/* BARRA DE PESTAÑAS NAVEGABLES */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScroll}
      >
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'metrics' && styles.tabItemActive]}
          onPress={() => setActiveTab('metrics')}
        >
          <Ionicons name="stats-chart" size={16} color={activeTab === 'metrics' ? '#000' : '#94A3B8'} />
          <Text style={[styles.tabItemText, activeTab === 'metrics' && styles.tabItemTextActive]}>Métricas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'orders' && styles.tabItemActive]}
          onPress={() => setActiveTab('orders')}
        >
          <Ionicons name="receipt" size={16} color={activeTab === 'orders' ? '#000' : '#94A3B8'} />
          <Text style={[styles.tabItemText, activeTab === 'orders' && styles.tabItemTextActive]}>
            Pedidos ({orders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'businesses' && styles.tabItemActive]}
          onPress={() => setActiveTab('businesses')}
        >
          <Ionicons name="storefront" size={16} color={activeTab === 'businesses' ? '#000' : '#94A3B8'} />
          <Text style={[styles.tabItemText, activeTab === 'businesses' && styles.tabItemTextActive]}>
            Comercios ({businesses.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'team' && styles.tabItemActive]}
          onPress={() => setActiveTab('team')}
        >
          <Ionicons name="bicycle" size={16} color={activeTab === 'team' ? '#000' : '#94A3B8'} />
          <Text style={[styles.tabItemText, activeTab === 'team' && styles.tabItemTextActive]}>
            Repartidores ({driversList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'debts' && styles.tabItemActive]}
          onPress={() => setActiveTab('debts')}
        >
          <Ionicons name="wallet" size={16} color={activeTab === 'debts' ? '#000' : '#94A3B8'} />
          <Text style={[styles.tabItemText, activeTab === 'debts' && styles.tabItemTextActive]}>Deudas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'settings' && styles.tabItemActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons name="settings" size={16} color={activeTab === 'settings' ? '#000' : '#94A3B8'} />
          <Text style={[styles.tabItemText, activeTab === 'settings' && styles.tabItemTextActive]}>Ajustes</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* CONTENIDO PRINCIPAL POR PESTAÑA */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FFCC00" />
          <Text style={styles.loadingText}>Cargando datos administrativos...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.contentContainer}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFCC00" />}
        >
          {/* ===================== TAB 1: MÉTRICAS ===================== */}
          {activeTab === 'metrics' && (
            <View style={styles.section}>
              {/* KPIS PRINCIPALES */}
              <View style={styles.kpiGrid}>
                <View style={styles.kpiCard}>
                  <View style={styles.kpiIconWrap}>
                    <Ionicons name="cash" size={22} color="#10B981" />
                  </View>
                  <Text style={styles.kpiLabel}>Ventas Totales</Text>
                  <Text style={styles.kpiValue}>${totalSales.toFixed(2)}</Text>
                  <Text style={styles.kpiSub}>Bs. {(totalSales * parseFloat(bcvRate || '1')).toFixed(2)}</Text>
                </View>

                <View style={styles.kpiCard}>
                  <View style={styles.kpiIconWrap}>
                    <Ionicons name="bicycle" size={22} color="#F59E0B" />
                  </View>
                  <Text style={styles.kpiLabel}>Pedidos Activos</Text>
                  <Text style={styles.kpiValue}>{activeOrdersCount}</Text>
                  <Text style={styles.kpiSub}>Total: {orders.length}</Text>
                </View>

                <View style={styles.kpiCard}>
                  <View style={styles.kpiIconWrap}>
                    <Ionicons name="storefront" size={22} color="#3B82F6" />
                  </View>
                  <Text style={styles.kpiLabel}>Comercios</Text>
                  <Text style={styles.kpiValue}>{businesses.length}</Text>
                  <Text style={styles.kpiSub}>Asociados IGO</Text>
                </View>

                <View style={styles.kpiCard}>
                  <View style={styles.kpiIconWrap}>
                    <Ionicons name="people" size={22} color="#8B5CF6" />
                  </View>
                  <Text style={styles.kpiLabel}>Repartidores</Text>
                  <Text style={styles.kpiValue}>{driversList.length}</Text>
                  <Text style={styles.kpiSub}>{activeDriversCount} trabajando</Text>
                </View>
              </View>

              {/* RENDIMIENTO POR COMERCIO */}
              <Text style={styles.sectionHeaderTitle}>Rendimiento por Comercio</Text>
              {bizPerformanceList.length === 0 ? (
                <Text style={styles.emptyText}>No hay ventas registradas aún.</Text>
              ) : (
                bizPerformanceList.map((biz: any, index) => (
                  <View key={biz.id || index} style={styles.bizRow}>
                    <View style={styles.bizRank}>
                      <Text style={styles.bizRankText}>#{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bizNameText}>{biz.name}</Text>
                      <Text style={styles.bizSubText}>{biz.orderCount} pedidos entregados</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.bizSalesText}>${biz.totalSales.toFixed(2)}</Text>
                      <Text style={styles.bizCommText}>Comisión: ${biz.commission.toFixed(2)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ===================== TAB 2: PEDIDOS / INVOICES ===================== */}
          {activeTab === 'orders' && (
            <View style={styles.section}>
              {/* BUSCADOR */}
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar por orden #, cliente o comercio..."
                  placeholderTextColor="#64748B"
                  value={orderSearchText}
                  onChangeText={setOrderSearchText}
                />
                {orderSearchText ? (
                  <TouchableOpacity onPress={() => setOrderSearchText('')}>
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* FILTROS POR ESTADO */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {[
                  { key: 'ALL', label: 'Todos' },
                  { key: 'PENDING', label: 'Pendientes' },
                  { key: 'IN_PREPARATION', label: 'En Preparación' },
                  { key: 'ON_WAY', label: 'En Camino' },
                  { key: 'DELIVERED', label: 'Entregados' },
                  { key: 'CANCELLED', label: 'Cancelados' },
                ].map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.filterChip, orderFilter === f.key && styles.filterChipActive]}
                    onPress={() => setOrderFilter(f.key as any)}
                  >
                    <Text style={[styles.filterChipText, orderFilter === f.key && styles.filterChipTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* LISTA DE PEDIDOS */}
              {filteredOrders.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="receipt-outline" size={40} color="#64748B" />
                  <Text style={styles.emptyText}>No hay pedidos que coincidan con el filtro.</Text>
                </View>
              ) : (
                filteredOrders.map((order) => {
                  const isPaid = order.isPaid || order.status === 'PAID';
                  return (
                    <View key={order.id} style={styles.orderCard}>
                      <View style={styles.orderCardHeader}>
                        <View>
                          <Text style={styles.orderNumberTitle}>
                            Pedido #{String(order.orderNumber).padStart(4, '0')}
                          </Text>
                          <Text style={styles.orderDateText}>
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Hoy'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor:
                                order.status === 'DELIVERED'
                                  ? '#10B981'
                                  : order.status === 'CANCELLED'
                                  ? '#EF4444'
                                  : order.status === 'ON_WAY' || order.status === 'ON_THE_WAY'
                                  ? '#3B82F6'
                                  : '#F59E0B',
                            },
                          ]}
                        >
                          <Text style={styles.statusBadgeText}>{order.status}</Text>
                        </View>
                      </View>

                      <View style={styles.orderCardInfo}>
                        <Text style={styles.orderInfoLine}>
                          <Text style={styles.boldLabel}>Cliente: </Text>
                          {order.user?.fullName || order.userIdTemp || 'Cliente General'}
                          {order.user?.phoneNumber ? ` (${order.user.phoneNumber})` : ''}
                        </Text>
                        <Text style={styles.orderInfoLine}>
                          <Text style={styles.boldLabel}>Comercio: </Text>
                          {order.business?.name || 'Envío Directo IGO'}
                        </Text>
                        <Text style={styles.orderInfoLine}>
                          <Text style={styles.boldLabel}>Destino: </Text>
                          {order.deliveryAddress || 'Dirección de entrega'}
                        </Text>
                        <View style={styles.orderAmountsRow}>
                          <Text style={styles.orderAmountMain}>Total: ${Number(order.totalAmount || 0).toFixed(2)}</Text>
                          <Text style={styles.orderDeliveryFee}>Envío: ${Number(order.deliveryFee || 0).toFixed(2)}</Text>
                          <View
                            style={[
                              styles.paymentStatusBadge,
                              { backgroundColor: isPaid ? '#DCFCE7' : '#FEF3C7' },
                            ]}
                          >
                            <Text style={{ color: isPaid ? '#15803D' : '#B45309', fontWeight: 'bold', fontSize: 11 }}>
                              {isPaid ? 'PAGADO' : 'PENDIENTE PAGO'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Repartidor asignado */}
                      <View style={styles.driverSection}>
                        <Ionicons name="bicycle" size={16} color="#64748B" style={{ marginRight: 6 }} />
                        <Text style={styles.driverText}>
                          Repartidor: {order.deliveryUser?.fullName || order.deliveryUser?.email || 'Sin Asignar'}
                        </Text>
                      </View>

                      {/* Botones de acción */}
                      <View style={styles.orderActionsRow}>
                        <TouchableOpacity
                          style={styles.orderActionBtnSecondary}
                          onPress={() => {
                            setOrderToAssign(order);
                            setShowAssignDriverModal(true);
                          }}
                        >
                          <Ionicons name="person-add-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
                          <Text style={styles.orderActionBtnText}>Asignar Chofer</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.orderActionBtnPrimary,
                            { backgroundColor: isPaid ? '#10B981' : '#F59E0B' },
                          ]}
                          onPress={() => {
                            setSelectedOrder(order);
                            setShowOrderDetailModal(true);
                          }}
                        >
                          <Ionicons name="eye-outline" size={14} color="#000" style={{ marginRight: 4 }} />
                          <Text style={styles.orderActionBtnTextPrimary}>Gestionar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ===================== TAB 3: COMERCIOS ===================== */}
          {activeTab === 'businesses' && (
            <View style={styles.section}>
              <View style={styles.sectionTopBar}>
                <Text style={styles.sectionHeaderTitle}>Comercios ({businesses.length})</Text>
                <TouchableOpacity
                  style={styles.createBtn}
                  onPress={() => setShowCreateBizModal(true)}
                >
                  <Ionicons name="add-circle" size={18} color="#000" style={{ marginRight: 4 }} />
                  <Text style={styles.createBtnText}>Nuevo Comercio</Text>
                </TouchableOpacity>
              </View>

              {businesses.length === 0 ? (
                <Text style={styles.emptyText}>No hay comercios registrados.</Text>
              ) : (
                businesses.map((biz) => (
                  <View key={biz.id} style={styles.bizCard}>
                    <View style={styles.bizCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bizCardTitle}>{biz.name}</Text>
                        <Text style={styles.bizCardCategory}>{biz.category || 'Restaurante'} • {biz.address}</Text>
                        {biz.phoneNumber ? <Text style={styles.bizCardPhone}>Tel: {biz.phoneNumber}</Text> : null}
                      </View>
                      <TouchableOpacity
                        style={styles.deleteMiniBtn}
                        onPress={() => handleDeleteBusiness(biz)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    {/* Comisión actual */}
                    <View style={styles.bizCommissionRow}>
                      <Text style={styles.bizCommLabel}>
                        Comisión IGO: <Text style={{ fontWeight: 'bold' }}>{biz.commissionPercentage ?? 10}%</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.editCommBtn}
                        onPress={() => {
                          setEditingBizCommission(biz);
                          setTempCommissionVal(String(biz.commissionPercentage ?? 10));
                          setShowCommissionModal(true);
                        }}
                      >
                        <Ionicons name="pencil" size={12} color="#000" style={{ marginRight: 4 }} />
                        <Text style={styles.editCommBtnText}>Editar %</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Botón Ver Productos */}
                    <TouchableOpacity
                      style={styles.bizProductsBtn}
                      onPress={() => handleOpenBizProducts(biz)}
                    >
                      <Ionicons name="cube-outline" size={16} color="#FFCC00" style={{ marginRight: 6 }} />
                      <Text style={styles.bizProductsBtnText}>Ver y Gestionar Productos</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ===================== TAB 4: REPARTIDORES Y EQUIPO ===================== */}
          {activeTab === 'team' && (
            <View style={styles.section}>
              <View style={styles.sectionTopBar}>
                <Text style={styles.sectionHeaderTitle}>Equipo y Repartidores ({driversList.length})</Text>
                <TouchableOpacity
                  style={styles.createBtn}
                  onPress={() => setShowCreateUserModal(true)}
                >
                  <Ionicons name="person-add" size={18} color="#000" style={{ marginRight: 4 }} />
                  <Text style={styles.createBtnText}>Nuevo Miembro</Text>
                </TouchableOpacity>
              </View>

              {driversList.length === 0 ? (
                <Text style={styles.emptyText}>No hay repartidores o trabajadores registrados.</Text>
              ) : (
                driversList.map((worker) => {
                  const isWorking = worker.employeeStatus === 'active';
                  const isBreak = worker.employeeStatus === 'break';
                  return (
                    <View key={worker.id} style={styles.workerCard}>
                      <View style={styles.workerCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.workerName}>{worker.fullName || 'Repartidor IGO'}</Text>
                          <Text style={styles.workerEmail}>{worker.email}</Text>
                          <Text style={styles.workerVehicle}>
                            Vehículo: {worker.vehicle || 'Moto'} • Tel: {worker.phoneNumber || 'N/A'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteMiniBtn}
                          onPress={() => handleDeleteUser(worker)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>

                      {/* Estado de servicio y Switch Habilitar cuenta */}
                      <View style={styles.workerStatusRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: isWorking ? '#10B981' : isBreak ? '#F59E0B' : '#EF4444' },
                            ]}
                          />
                          <Text style={styles.statusLabelText}>
                            {isWorking ? 'Trabajando' : isBreak ? 'En Descanso' : 'Fuera de Servicio'}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.switchLabel}>Cuenta Activa</Text>
                          <Switch
                            value={worker.isActive !== false}
                            onValueChange={() => handleToggleUserActive(worker)}
                            trackColor={{ false: '#4B5563', true: '#10B981' }}
                            thumbColor="#FFF"
                          />
                        </View>
                      </View>

                      {/* Botones de cambio de estado de servicio */}
                      <View style={styles.workerActionsRow}>
                        <TouchableOpacity
                          style={[styles.statusToggleBtn, isWorking && { backgroundColor: '#10B981' }]}
                          onPress={() => handleChangeEmployeeStatus(worker, 'active')}
                        >
                          <Text style={[styles.statusToggleText, isWorking && { color: '#000', fontWeight: 'bold' }]}>
                            Activo
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.statusToggleBtn, isBreak && { backgroundColor: '#F59E0B' }]}
                          onPress={() => handleChangeEmployeeStatus(worker, 'break')}
                        >
                          <Text style={[styles.statusToggleText, isBreak && { color: '#000', fontWeight: 'bold' }]}>
                            Descanso
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.statusToggleBtn,
                            worker.employeeStatus === 'inactive' && { backgroundColor: '#EF4444' },
                          ]}
                          onPress={() => handleChangeEmployeeStatus(worker, 'inactive')}
                        >
                          <Text
                            style={[
                              styles.statusToggleText,
                              worker.employeeStatus === 'inactive' && { color: '#FFF', fontWeight: 'bold' },
                            ]}
                          >
                            Inactivo
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ===================== TAB 5: DEUDAS Y LIQUIDACIONES ===================== */}
          {activeTab === 'debts' && (
            <View style={styles.section}>
              <Text style={styles.sectionHeaderTitle}>Reporte de Deudas de Comercios</Text>
              <Text style={styles.sectionSubtitle}>
                Control de delivery recaudado y comisiones pendientes por transferir a IGO.
              </Text>

              {debtsReport.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="checkmark-circle-outline" size={40} color="#10B981" />
                  <Text style={styles.emptyText}>No hay deudas pendientes en este momento.</Text>
                </View>
              ) : (
                debtsReport.map((item, idx) => (
                  <View key={item.businessId || idx} style={styles.debtCard}>
                    <Text style={styles.debtBizName}>{item.businessName || 'Comercio'}</Text>
                    <View style={styles.debtRow}>
                      <Text style={styles.debtLabel}>Delivery Recaudado:</Text>
                      <Text style={styles.debtValue}>${Number(item.deliverySubtotal || 0).toFixed(2)}</Text>
                    </View>
                    <View style={styles.debtRow}>
                      <Text style={styles.debtLabel}>Comisión IGO:</Text>
                      <Text style={styles.debtValue}>${Number(item.commissionAmount || 0).toFixed(2)}</Text>
                    </View>
                    <View style={[styles.debtRow, { borderTopWidth: 1, borderColor: '#334155', paddingTop: 6, marginTop: 4 }]}>
                      <Text style={[styles.debtLabel, { color: '#FFCC00', fontWeight: 'bold' }]}>Total Adeudado a IGO:</Text>
                      <Text style={[styles.debtValue, { color: '#FFCC00', fontWeight: 'bold', fontSize: 16 }]}>
                        ${Number(item.totalBizDebt || 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ===================== TAB 6: AJUSTES GLOBALES ===================== */}
          {activeTab === 'settings' && (
            <View style={styles.section}>
              <Text style={styles.sectionHeaderTitle}>Ajustes y Parámetros Globales</Text>

              <View style={styles.settingsForm}>
                <Text style={styles.inputGroupTitle}>Tarifas y Comisiones</Text>

                <View style={styles.inputBox}>
                  <Text style={styles.inputLabel}>Tasa Oficial BCV (Bs/$)</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={settings.BCV_RATE}
                    onChangeText={(v) => setSettings({ ...settings, BCV_RATE: v })}
                  />
                </View>

                <View style={styles.inputBox}>
                  <Text style={styles.inputLabel}>Comisión IGO Delivery (%)</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={settings.COMMISSION_IGO_DELIVERY}
                    onChangeText={(v) => setSettings({ ...settings, COMMISSION_IGO_DELIVERY: v })}
                  />
                </View>

                <View style={styles.inputBox}>
                  <Text style={styles.inputLabel}>Tarifa Base Delivery ($)</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={settings.FEE_BASE_DELIVERY}
                    onChangeText={(v) => setSettings({ ...settings, FEE_BASE_DELIVERY: v })}
                  />
                </View>

                <View style={styles.inputBox}>
                  <Text style={styles.inputLabel}>Tarifa por Km Delivery ($)</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={settings.FEE_KM_DELIVERY}
                    onChangeText={(v) => setSettings({ ...settings, FEE_KM_DELIVERY: v })}
                  />
                </View>

                <Text style={[styles.inputGroupTitle, { marginTop: 16 }]}>Horario Nocturno</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputLabel}>Recargo Nocturno ($)</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={settings.NIGHT_SHIFT_SURCHARGE}
                    onChangeText={(v) => setSettings({ ...settings, NIGHT_SHIFT_SURCHARGE: v })}
                  />
                </View>

                <Text style={[styles.inputGroupTitle, { marginTop: 16 }]}>Datos de Pago Móvil IGO</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputLabel}>Banco Destino</Text>
                  <TextInput
                    style={styles.formInput}
                    value={settings.IGO_PAGO_MOVIL_BANK}
                    onChangeText={(v) => setSettings({ ...settings, IGO_PAGO_MOVIL_BANK: v })}
                  />
                </View>

                <View style={styles.inputBox}>
                  <Text style={styles.inputLabel}>Teléfono Pago Móvil</Text>
                  <TextInput
                    style={styles.formInput}
                    value={settings.IGO_PAGO_MOVIL_PHONE}
                    onChangeText={(v) => setSettings({ ...settings, IGO_PAGO_MOVIL_PHONE: v })}
                  />
                </View>

                <View style={styles.inputBox}>
                  <Text style={styles.inputLabel}>Cédula / RIF</Text>
                  <TextInput
                    style={styles.formInput}
                    value={settings.IGO_PAGO_MOVIL_ID}
                    onChangeText={(v) => setSettings({ ...settings, IGO_PAGO_MOVIL_ID: v })}
                  />
                </View>

                <TouchableOpacity
                  style={styles.saveSettingsBtn}
                  onPress={handleSaveAllSettings}
                  disabled={savingSettings}
                >
                  {savingSettings ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="#000" style={{ marginRight: 6 }} />
                      <Text style={styles.saveSettingsBtnText}>Guardar Ajustes en Servidor</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ===================== MODAL 1: ACTUALIZAR BCV ===================== */}
      <Modal visible={showBcvModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Actualizar Tasa Oficial BCV</Text>
            <Text style={styles.modalSub}>
              Esta tasa se aplicará en tiempo real en los cálculos de precios, pagos móviles y liquidaciones.
            </Text>

            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="Ej: 75.54"
              placeholderTextColor="#64748B"
              value={tempBcvRate}
              onChangeText={setTempBcvRate}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowBcvModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleSaveBcvRate}
                disabled={savingBcv}
              >
                {savingBcv ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.modalConfirmText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================== MODAL 2: GESTIONAR / VER PEDIDO ===================== */}
      <Modal visible={showOrderDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '85%' }]}>
            {selectedOrder ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>
                    Orden #{String(selectedOrder.orderNumber).padStart(4, '0')}
                  </Text>
                  <TouchableOpacity onPress={() => setShowOrderDetailModal(false)}>
                    <Ionicons name="close" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.orderDetailText}>
                  <Text style={styles.boldLabel}>Cliente: </Text>
                  {selectedOrder.user?.fullName || selectedOrder.userIdTemp || 'General'}
                </Text>
                <Text style={styles.orderDetailText}>
                  <Text style={styles.boldLabel}>Teléfono: </Text>
                  {selectedOrder.user?.phoneNumber || 'No especificado'}
                </Text>
                <Text style={styles.orderDetailText}>
                  <Text style={styles.boldLabel}>Comercio: </Text>
                  {selectedOrder.business?.name || 'Envío directo'}
                </Text>
                <Text style={styles.orderDetailText}>
                  <Text style={styles.boldLabel}>Dirección Entrega: </Text>
                  {selectedOrder.deliveryAddress}
                </Text>
                <Text style={styles.orderDetailText}>
                  <Text style={styles.boldLabel}>Total Productos: </Text>${Number(selectedOrder.totalItems || 0).toFixed(2)}
                </Text>
                <Text style={styles.orderDetailText}>
                  <Text style={styles.boldLabel}>Costo Envío: </Text>${Number(selectedOrder.deliveryFee || 0).toFixed(2)}
                </Text>
                <Text style={[styles.orderDetailText, { color: '#FFCC00', fontWeight: 'bold' }]}>
                  Total General: ${Number(selectedOrder.totalAmount || 0).toFixed(2)} USD
                </Text>

                {/* Comprobante de pago si existe */}
                {selectedOrder.paymentCaptureUrl ? (
                  <View style={{ marginVertical: 12 }}>
                    <Text style={[styles.boldLabel, { marginBottom: 6 }]}>Comprobante de Pago:</Text>
                    <Image
                      source={{ uri: selectedOrder.paymentCaptureUrl }}
                      style={styles.paymentCaptureImg}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}

                {/* Referencia de pago */}
                {selectedOrder.paymentReference ? (
                  <Text style={styles.orderDetailText}>
                    <Text style={styles.boldLabel}>Referencia Pago Móvil: </Text>
                    {selectedOrder.paymentReference}
                  </Text>
                ) : null}

                {/* Switch de Pago */}
                <View style={styles.paymentVerifyRow}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Pago Verificado:</Text>
                  <Switch
                    value={selectedOrder.isPaid || selectedOrder.status === 'PAID'}
                    onValueChange={(val) => handleVerifyPayment(selectedOrder.id, val)}
                    trackColor={{ false: '#4B5563', true: '#10B981' }}
                    thumbColor="#FFF"
                  />
                </View>

                {/* Cambiar Estado del Pedido */}
                <Text style={[styles.boldLabel, { marginTop: 14, marginBottom: 8 }]}>Cambiar Estado:</Text>
                <View style={styles.statusChangeGrid}>
                  {[
                    { key: 'PENDING', label: 'Pendiente', color: '#F59E0B' },
                    { key: 'IN_PREPARATION', label: 'En Preparación', color: '#3B82F6' },
                    { key: 'ON_WAY', label: 'En Camino 🛵', color: '#8B5CF6' },
                    { key: 'DELIVERED', label: 'Entregado ✅', color: '#10B981' },
                    { key: 'CANCELLED', label: 'Cancelar ❌', color: '#EF4444' },
                  ].map((st) => (
                    <TouchableOpacity
                      key={st.key}
                      style={[
                        styles.statusBtn,
                        { borderColor: st.color },
                        selectedOrder.status === st.key && { backgroundColor: st.color },
                      ]}
                      onPress={() => handleUpdateOrderStatus(selectedOrder.id, st.key)}
                    >
                      <Text
                        style={[
                          styles.statusBtnText,
                          selectedOrder.status === st.key && { color: '#000', fontWeight: 'bold' },
                        ]}
                      >
                        {st.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ===================== MODAL 3: ASIGNAR REPARTIDOR ===================== */}
      <Modal visible={showAssignDriverModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '75%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Asignar Repartidor</Text>
              <TouchableOpacity onPress={() => setShowAssignDriverModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            {assigningDriver ? (
              <ActivityIndicator size="large" color="#FFCC00" style={{ marginVertical: 30 }} />
            ) : (
              <FlatList
                data={driversList}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isCurrent = orderToAssign?.deliveryUser?.id === item.id;
                  const isWorking = item.employeeStatus === 'active';
                  return (
                    <TouchableOpacity
                      style={[styles.driverSelectCard, isCurrent && { borderColor: '#10B981', borderWidth: 2 }]}
                      onPress={() => handleAssignDriver(orderToAssign?.id, item.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.driverSelectName}>{item.fullName || item.email}</Text>
                        <Text style={styles.driverSelectVeh}>{item.vehicle || 'Moto'} • {item.phoneNumber || 'Sin teléfono'}</Text>
                        <Text style={{ fontSize: 11, color: isWorking ? '#10B981' : '#F59E0B' }}>
                          {isWorking ? '🟢 En línea' : '🟡 Desconectado / Descanso'}
                        </Text>
                      </View>
                      <View style={styles.selectDriverBtn}>
                        <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 12 }}>
                          {isCurrent ? 'Asignado' : 'Asignar'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No hay repartidores registrados en el sistema.</Text>
                }
              />
            )}

            {orderToAssign?.deliveryUser && (
              <TouchableOpacity
                style={styles.unassignBtn}
                onPress={() => handleAssignDriver(orderToAssign.id, null)}
              >
                <Text style={styles.unassignBtnText}>Desasignar Repartidor</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* ===================== MODAL 4: CREAR COMERCIO ===================== */}
      <Modal visible={showCreateBizModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Registrar Nuevo Comercio</Text>
              <TouchableOpacity onPress={() => setShowCreateBizModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Nombre del Comercio (ej: Burguer King)"
              placeholderTextColor="#64748B"
              value={newBizName}
              onChangeText={setNewBizName}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Dirección (ej: Av. Bolívar, Valera)"
              placeholderTextColor="#64748B"
              value={newBizAddress}
              onChangeText={setNewBizAddress}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Teléfono (ej: 0414-1234567)"
              placeholderTextColor="#64748B"
              value={newBizPhone}
              onChangeText={setNewBizPhone}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Comisión IGO % (ej: 10)"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={newBizCommission}
              onChangeText={setNewBizCommission}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowCreateBizModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleCreateBusiness}
                disabled={savingBiz}
              >
                {savingBiz ? <ActivityIndicator color="#000" /> : <Text style={styles.modalConfirmText}>Crear</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================== MODAL 5: GESTIONAR PRODUCTOS DE COMERCIO ===================== */}
      <Modal visible={showBizProductsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '85%' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedBizForProducts?.name}</Text>
                <Text style={styles.modalSub}>Catálogo de Productos ({bizProducts.length})</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBizProductsModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => setShowCreateProdModal(true)}
            >
              <Ionicons name="add-circle" size={16} color="#000" style={{ marginRight: 4 }} />
              <Text style={styles.createBtnText}>Agregar Producto</Text>
            </TouchableOpacity>

            {loadingBizProducts ? (
              <ActivityIndicator color="#FFCC00" style={{ marginVertical: 30 }} />
            ) : (
              <FlatList
                data={bizProducts}
                keyExtractor={(item) => item.id}
                style={{ marginTop: 12 }}
                renderItem={({ item }) => (
                  <View style={styles.prodItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.prodTitle}>{item.title}</Text>
                      <Text style={styles.prodPrice}>${Number(item.price || 0).toFixed(2)} • Stock: {item.stock ?? 10}</Text>
                      {item.description ? <Text style={styles.prodDesc} numberOfLines={1}>{item.description}</Text> : null}
                    </View>
                    <TouchableOpacity
                      style={styles.deleteMiniBtn}
                      onPress={() => handleDeleteProduct(item.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Este comercio aún no tiene productos registrados.</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ===================== MODAL 6: AGREGAR PRODUCTO ===================== */}
      <Modal visible={showCreateProdModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Nuevo Producto</Text>
              <TouchableOpacity onPress={() => setShowCreateProdModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Nombre del Producto"
              placeholderTextColor="#64748B"
              value={newProdTitle}
              onChangeText={setNewProdTitle}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Precio en USD (ej: 4.50)"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={newProdPrice}
              onChangeText={setNewProdPrice}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Stock disponible (ej: 10)"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={newProdStock}
              onChangeText={setNewProdStock}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Descripción opcional"
              placeholderTextColor="#64748B"
              value={newProdDesc}
              onChangeText={setNewProdDesc}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowCreateProdModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleCreateProductInBiz}
                disabled={savingProd}
              >
                {savingProd ? <ActivityIndicator color="#000" /> : <Text style={styles.modalConfirmText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================== MODAL 7: EDITAR COMISIÓN ===================== */}
      <Modal visible={showCommissionModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Editar Comisión (%)</Text>
            <Text style={styles.modalSub}>{editingBizCommission?.name}</Text>

            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="Porcentaje de comisión (ej: 10)"
              placeholderTextColor="#64748B"
              value={tempCommissionVal}
              onChangeText={setTempCommissionVal}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowCommissionModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleSaveCommission}
              >
                <Text style={styles.modalConfirmText}>Actualizar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================== MODAL 8: CREAR USUARIO / REPARTIDOR ===================== */}
      <Modal visible={showCreateUserModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Registrar Miembro / Chofer</Text>
              <TouchableOpacity onPress={() => setShowCreateUserModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Nombre Completo"
              placeholderTextColor="#64748B"
              value={newUserFullName}
              onChangeText={setNewUserFullName}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Correo Electrónico"
              placeholderTextColor="#64748B"
              keyboardType="email-address"
              autoCapitalize="none"
              value={newUserEmail}
              onChangeText={setNewUserEmail}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Contraseña"
              placeholderTextColor="#64748B"
              secureTextEntry
              value={newUserPassword}
              onChangeText={setNewUserPassword}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Teléfono móvil"
              placeholderTextColor="#64748B"
              value={newUserPhone}
              onChangeText={setNewUserPhone}
            />

            {/* Selector de Rol */}
            <View style={{ flexDirection: 'row', gap: 10, marginVertical: 8 }}>
              {['empleado', 'admin'].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.roleChip,
                    newUserRole === r && styles.roleChipActive,
                  ]}
                  onPress={() => setNewUserRole(r)}
                >
                  <Text style={[styles.roleChipText, newUserRole === r && styles.roleChipTextActive]}>
                    {r === 'empleado' ? 'Repartidor / Empleado' : 'Administrador'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Vehículo para empleados */}
            {newUserRole === 'empleado' && (
              <TextInput
                style={styles.modalInput}
                placeholder="Vehículo (Moto, Bicicleta, Carro)"
                placeholderTextColor="#64748B"
                value={newUserVehicle}
                onChangeText={setNewUserVehicle}
              />
            )}

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowCreateUserModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleCreateUser}
                disabled={savingUser}
              >
                {savingUser ? <ActivityIndicator color="#000" /> : <Text style={styles.modalConfirmText}>Registrar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0F0330', // Fondo morado oscuro IGO
  },
  adminHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#1E1238',
    borderBottomWidth: 1,
    borderBottomColor: '#332255',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFCC00',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 4,
  },
  adminBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1A4E',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFCC00',
    gap: 4,
  },
  clientModeBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFCC00',
  },
  soundToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bcvWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#261545',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#FFCC00',
  },
  bcvInfo: {
    flex: 1,
  },
  bcvLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  bcvValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10B981',
  },
  bcvUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFCC00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  bcvUpdateBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1238',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#332255',
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: '#FFCC00',
    borderColor: '#FFCC00',
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabItemTextActive: {
    color: '#000',
  },
  contentContainer: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    width: (width - 42) / 2,
    backgroundColor: '#1E1238',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#332255',
  },
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 14,
  },
  sectionTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFCC00',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  createBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  bizRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1238',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#332255',
    gap: 10,
  },
  bizRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFCC00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bizRankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  bizNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  bizSubText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  bizSalesText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#10B981',
  },
  bizCommText: {
    fontSize: 11,
    color: '#FFCC00',
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1238',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#332255',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 13,
  },
  filterScroll: {
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#1E1238',
    borderWidth: 1,
    borderColor: '#332255',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#FFCC00',
    borderColor: '#FFCC00',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  filterChipTextActive: {
    color: '#000',
  },
  orderCard: {
    backgroundColor: '#1E1238',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#332255',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2B1A4E',
    paddingBottom: 8,
  },
  orderNumberTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
  orderDateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  orderCardInfo: {
    gap: 4,
  },
  orderInfoLine: {
    fontSize: 13,
    color: '#E2E8F0',
  },
  boldLabel: {
    fontWeight: 'bold',
    color: '#94A3B8',
  },
  orderAmountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  orderAmountMain: {
    fontSize: 15,
    fontWeight: '900',
    color: '#10B981',
  },
  orderDeliveryFee: {
    fontSize: 12,
    color: '#FFCC00',
    fontWeight: '700',
  },
  paymentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#261545',
    padding: 8,
    borderRadius: 10,
    marginTop: 10,
  },
  driverText: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  orderActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  orderActionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingVertical: 9,
    borderRadius: 10,
  },
  orderActionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  orderActionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderActionBtnTextPrimary: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bizCard: {
    backgroundColor: '#1E1238',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#332255',
  },
  bizCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bizCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
  bizCardCategory: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  bizCardPhone: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
  },
  deleteMiniBtn: {
    padding: 6,
  },
  bizCommissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#261545',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
  },
  bizCommLabel: {
    fontSize: 12,
    color: '#FFF',
  },
  editCommBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFCC00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editCommBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
  },
  bizProductsBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A1A4E',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFCC00',
  },
  bizProductsBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFCC00',
  },
  workerCard: {
    backgroundColor: '#1E1238',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#332255',
  },
  workerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  workerName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
  workerEmail: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  workerVehicle: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
  },
  workerStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2B1A4E',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusLabelText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
  },
  switchLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginRight: 6,
  },
  workerActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  statusToggleBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#261545',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusToggleText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  debtCard: {
    backgroundColor: '#1E1238',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#332255',
  },
  debtBizName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
  },
  debtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  debtLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  debtValue: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '600',
  },
  settingsForm: {
    backgroundColor: '#1E1238',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#332255',
  },
  inputGroupTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFCC00',
    marginBottom: 10,
  },
  inputBox: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: '#261545',
    color: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#332255',
    fontSize: 14,
  },
  saveSettingsBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFCC00',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  saveSettingsBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
  },
  emptyBox: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 10,
  },
  // ESTILOS DE MODALES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    width: Math.min(width - 32, 450),
    backgroundColor: '#1E1238',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#FFCC00',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
  },
  modalSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: '#261545',
    color: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#332255',
    fontSize: 14,
    marginBottom: 12,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFCC00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
  },
  orderDetailText: {
    fontSize: 13,
    color: '#E2E8F0',
    marginBottom: 4,
  },
  paymentCaptureImg: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCC00',
  },
  paymentVerifyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#261545',
    padding: 12,
    borderRadius: 12,
    marginVertical: 10,
  },
  statusChangeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: '#261545',
  },
  statusBtnText: {
    fontSize: 12,
    color: '#FFF',
  },
  driverSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#261545',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#332255',
  },
  driverSelectName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  driverSelectVeh: {
    fontSize: 12,
    color: '#94A3B8',
  },
  selectDriverBtn: {
    backgroundColor: '#FFCC00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unassignBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  unassignBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  prodItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#261545',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#332255',
  },
  prodTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  prodPrice: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '700',
  },
  prodDesc: {
    fontSize: 11,
    color: '#94A3B8',
  },
  roleChip: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#261545',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#332255',
  },
  roleChipActive: {
    backgroundColor: '#FFCC00',
    borderColor: '#FFCC00',
  },
  roleChipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  roleChipTextActive: {
    color: '#000',
  },
});

export default AdminDashboard;
