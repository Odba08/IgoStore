import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Image 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMyOrdersApi } from '@/infrastructure/api/orders.api';

export default function MyOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const response = await getMyOrdersApi();
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.warn('Error fetching my orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000); // Actualiza estado de mis pedidos cada 8s
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getStatusBadge = (status: string, isPaid: boolean, category?: string) => {
    let color = '#3B82F6';
    let label = status;

    switch (status) {
      case 'PENDING':
      case 'CREATED':
        color = '#F59E0B';
        label = 'Pendiente';
        break;
      case 'PAID':
      case 'PREPARING':
        color = '#3B82F6';
        label = 'En preparación';
        break;
      case 'ON_WAY':
        color = '#8B5CF6';
        label = 'En camino 🛵';
        break;
      case 'DELIVERED':
        color = '#10B981';
        label = 'Entregado ✅';
        break;
      case 'CANCELLED':
        color = '#EF4444';
        label = 'Cancelado';
        break;
    }

    const isTaxi = category === 'IgoTaxi';

    return (
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <View style={[styles.badge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.badgeText, { color }]}>{label}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: isPaid ? '#10B98120' : (isTaxi ? '#3B82F620' : '#F59E0B20') }]}>
          <Text style={[styles.badgeText, { color: isPaid ? '#10B981' : (isTaxi ? '#3B82F6' : '#F59E0B') }]}>
            {isPaid ? 'Pagado' : (isTaxi ? 'Pago directo' : 'En revisión')}
          </Text>
        </View>
      </View>
    );
  };

  const getCategoryTitle = (item: any) => {
    if (item.category === 'IgoTaxi') return '🚕 IGO Taxi (Traslado)';
    if (item.category === 'IgoFavor') return '🛵 IGO Favor (Encomienda)';
    return item.business?.name || `🛍️ Pedido ${item.category || 'Tienda'}`;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Pedidos y Servicios</Text>
        <TouchableOpacity onPress={onRefresh} style={{ width: 40, alignItems: 'flex-end' }}>
          <Ionicons name="refresh" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FFDB58" />
          <Text style={styles.loadingText}>Cargando tus pedidos...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FFDB58']} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Sin pedidos registrados</Text>
              <Text style={styles.emptySub}>Tus pedidos y solicitudes de viaje aparecerán aquí en tiempo real.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderNumber}>Orden #{String(item.orderNumber).padStart(4, '0')}</Text>
                  <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                {getStatusBadge(item.status, item.isPaid, item.category)}
              </View>

              <View style={styles.divider} />

              <View style={styles.businessRow}>
                <Ionicons 
                  name={item.category === 'IgoTaxi' ? 'car-sport' : item.category === 'IgoFavor' ? 'cube' : 'storefront-sharp'} 
                  size={18} 
                  color="#EDB422" 
                />
                <Text style={styles.businessName}>{getCategoryTitle(item)}</Text>
              </View>

              {item.pickupAddress && (item.category === 'IgoFavor' || item.category === 'IgoTaxi') && (
                <Text style={styles.addressText} numberOfLines={1}>
                  🏢 <Text style={{ fontWeight: 'bold' }}>Origen:</Text> {item.pickupAddress}
                </Text>
              )}

              <Text style={styles.addressText} numberOfLines={1}>
                📍 <Text style={{ fontWeight: 'bold' }}>Destino:</Text> {item.deliveryAddress}
              </Text>

              {item.deliveryUser && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, backgroundColor: '#F3E8FF', padding: 8, borderRadius: 8 }}>
                  <Ionicons name="bicycle" size={16} color="#6200EE" />
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6200EE' }}>
                    Conductor asignado: {item.deliveryUser.fullName || item.deliveryUser.email}
                  </Text>
                </View>
              )}

              <View style={styles.itemsSummary}>
                <Text style={styles.itemsCount}>
                  {item.items && item.items.length > 0 ? `${item.items.length} producto(s)` : `${item.shippingType || 'Vehículo'} • ${item.paymentRecipient || 'Pago'}`}
                </Text>
                <Text style={styles.totalAmount}>${parseFloat(item.totalAmount).toFixed(2)}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFF'
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },
  listContent: { padding: 15, paddingBottom: 40 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#334155', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#94A3B8', marginTop: 6 },
  orderCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 15,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderNumber: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  orderDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  businessRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  businessName: { fontSize: 14, fontWeight: '600', color: '#334155' },
  addressText: { fontSize: 13, color: '#64748B', marginBottom: 12 },
  itemsSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10 },
  itemsCount: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  totalAmount: { fontSize: 16, fontWeight: 'bold', color: '#10B981' }
});
