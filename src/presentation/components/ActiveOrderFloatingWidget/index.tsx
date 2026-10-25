import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { OrderChatModal } from '../OrderChatModal';
import { ReportIssueModal } from '../ReportIssueModal';
import { OrderRatingModal } from '../OrderRatingModal';
import { useThemeStore } from '@/presentation/store/useThemeStore';

interface ActiveOrderFloatingWidgetProps {
  order: any;
  currentUser: any;
  onRefreshOrders?: () => void;
}

export const ActiveOrderFloatingWidget = ({
  order,
  currentUser,
  onRefreshOrders,
}: ActiveOrderFloatingWidgetProps) => {
  const router = useRouter();
  const { colors, isDark } = useThemeStore();
  const [showChat, setShowChat] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showRating, setShowRating] = useState(false);

  if (!order) return null;

  const category = order.category || 'General';
  const isTaxi = category === 'IgoTaxi' || order.shippingType === 'Carro';
  const isFavor = category === 'IgoFavor';
  const isFood = category === 'Comida' || category === 'Restaurantes';

  const status = order.status || 'PENDING';
  const isPaid = order.isPaid;
  const driver = order.deliveryUser;

  // Pasos dinámicos según el tipo de servicio
  const steps = isTaxi
    ? [
        { key: 'REQUEST', label: 'Solicitud', icon: 'car-sport-outline' },
        { key: 'ASSIGNED', label: 'Asignado', icon: 'person-outline' },
        { key: 'ON_WAY', label: 'En Viaje', icon: 'navigate-outline' },
        { key: 'ARRIVED', label: 'Llegó', icon: 'location-outline' },
        { key: 'DELIVERED', label: 'Completado', icon: 'checkmark-circle-outline' },
      ]
    : isFavor
    ? [
        { key: 'REQUEST', label: 'Solicitud', icon: 'cube-outline' },
        { key: 'ASSIGNED', label: 'Buscando', icon: 'archive-outline' },
        { key: 'ON_WAY', label: 'En Ruta', icon: 'bicycle-outline' },
        { key: 'ARRIVED', label: 'Llegó', icon: 'location-outline' },
        { key: 'DELIVERED', label: 'Entregado', icon: 'checkmark-circle-outline' },
      ]
    : isFood
    ? [
        { key: 'PAYMENT', label: 'Pago', icon: 'card-outline' },
        { key: 'PREPARING', label: 'Cocina', icon: 'restaurant-outline' },
        { key: 'ON_WAY', label: 'En Camino', icon: 'bicycle-outline' },
        { key: 'ARRIVED', label: 'Llegó', icon: 'location-outline' },
        { key: 'DELIVERED', label: 'Entregado', icon: 'checkmark-circle-outline' },
      ]
    : [
        { key: 'PAYMENT', label: 'Pago', icon: 'card-outline' },
        { key: 'PREPARING', label: 'Empaque', icon: 'bag-handle-outline' },
        { key: 'ON_WAY', label: 'En Camino', icon: 'bicycle-outline' },
        { key: 'ARRIVED', label: 'Llegó', icon: 'location-outline' },
        { key: 'DELIVERED', label: 'Entregado', icon: 'checkmark-circle-outline' },
      ];

  // Determinar paso actual (0 a 4)
  let currentStepIndex = 0;
  if (status === 'DELIVERED') {
    currentStepIndex = 4;
  } else if (status === 'ARRIVED') {
    currentStepIndex = 3;
  } else if (status === 'ON_WAY') {
    currentStepIndex = 2;
  } else if (status === 'PAID' || status === 'PREPARING' || status === 'READY') {
    currentStepIndex = 1;
  } else {
    // PENDING / CREATED
    if (isTaxi || isFavor) {
      currentStepIndex = driver ? 1 : 0;
    } else {
      currentStepIndex = isPaid ? 1 : 0;
    }
  }

  // Título dinámico explicativo adaptado a cada categoría
  let statusMessage = 'Procesando tu solicitud...';
  let statusColor = '#F59E0B';

  if (isTaxi) {
    switch (currentStepIndex) {
      case 0:
        statusMessage = 'Buscando conductor cercano 🚕...';
        statusColor = '#F59E0B';
        break;
      case 1:
        statusMessage = 'Conductor asignado, en camino al punto A 📍';
        statusColor = '#3B82F6';
        break;
      case 2:
        statusMessage = 'En viaje hacia tu destino 🛣️';
        statusColor = '#8B5CF6';
        break;
      case 3:
        statusMessage = '¡Tu taxi ha llegado a la ubicación! 📍';
        statusColor = '#EC4899';
        break;
      case 4:
        statusMessage = 'Viaje completado exitosamente ✅';
        statusColor = '#059669';
        break;
    }
  } else if (isFavor) {
    switch (currentStepIndex) {
      case 0:
        statusMessage = 'Solicitud de encomienda recibida 📦';
        statusColor = '#F59E0B';
        break;
      case 1:
        statusMessage = 'Mensajero en camino a recoger el paquete 🛵';
        statusColor = '#3B82F6';
        break;
      case 2:
        statusMessage = 'Mensajero en ruta con tu paquete 📦';
        statusColor = '#8B5CF6';
        break;
      case 3:
        statusMessage = '¡El mensajero llegó al destino! 📍';
        statusColor = '#EC4899';
        break;
      case 4:
        statusMessage = 'Encomienda entregada con éxito ✅';
        statusColor = '#059669';
        break;
    }
  } else if (isFood) {
    switch (currentStepIndex) {
      case 0:
        statusMessage = isPaid ? 'Pago recibido, confirmando con restaurante...' : 'Verificando pago móvil...';
        statusColor = '#F59E0B';
        break;
      case 1:
        statusMessage = 'Restaurante preparando tu comida';
        statusColor = '#3B82F6';
        break;
      case 2:
        statusMessage = 'Repartidor en camino a tu puerta';
        statusColor = '#8B5CF6';
        break;
      case 3:
        statusMessage = '¡El repartidor ha llegado con tu comida!';
        statusColor = '#EC4899';
        break;
      case 4:
        statusMessage = 'Comida entregada ¡Buen provecho!';
        statusColor = '#059669';
        break;
    }
  } else {
    // Tiendas generales (Mercado, Farmacia, etc.)
    switch (currentStepIndex) {
      case 0:
        statusMessage = isPaid ? 'Pago verificado exitosamente' : 'Verificando pago móvil...';
        statusColor = '#F59E0B';
        break;
      case 1:
        statusMessage = 'Tienda preparando y empacando tu pedido';
        statusColor = '#3B82F6';
        break;
      case 2:
        statusMessage = 'Repartidor en camino a tu dirección';
        statusColor = '#8B5CF6';
        break;
      case 3:
        statusMessage = '¡El repartidor ha llegado a tu ubicación!';
        statusColor = '#EC4899';
        break;
      case 4:
        statusMessage = 'Pedido entregado con éxito';
        statusColor = '#059669';
        break;
    }
  }

  const businessName = order.business?.name || order.category || 'Pedido IGO';

  return (
    <View style={[styles.cardContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {/* Header del Widget */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.pulseDot, { backgroundColor: statusColor }]} />
          <View>
            <Text style={[styles.businessTitle, { color: colors.text }]} numberOfLines={1}>
              {businessName} • #{String(order.orderNumber || '').padStart(4, '0')}
            </Text>
            <Text style={[styles.statusSubtitle, { color: statusColor }]}>
              {statusMessage}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={() => router.push('/orders' as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.detailsBtnText}>Ver Pedido</Text>
          <Ionicons name="chevron-forward" size={14} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Stepper flotante con bolitas interconectadas estilo Quik */}
      <View style={styles.stepperContainer}>
        {steps.map((step: any, idx: number) => {
          const isCompleted = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const isPending = idx > currentStepIndex;

          return (
            <React.Fragment key={step.key}>
              {/* Círculo del paso */}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.circle,
                    isCompleted && styles.circleCompleted,
                    isCurrent && styles.circleCurrent,
                    isPending && [styles.circlePending, { backgroundColor: isDark ? '#281754' : '#F3F4F6', borderColor: colors.cardBorder }],
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={14} color="#000" />
                  ) : (
                    <Ionicons
                      name={step.icon as any}
                      size={13}
                      color={isCurrent ? '#000' : colors.textMuted}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    { color: colors.textMuted },
                    isCurrent && [styles.stepLabelCurrent, { color: colors.text }],
                    isCompleted && [styles.stepLabelCompleted, { color: colors.textSecondary }],
                  ]}
                  numberOfLines={1}
                >
                  {step.label}
                </Text>
              </View>

              {/* Línea conectora entre círculos */}
              {idx < steps.length - 1 && (
                <View
                  style={[
                    styles.connectorLine,
                    idx < currentStepIndex ? styles.connectorLineFilled : [styles.connectorLineEmpty, { backgroundColor: isDark ? '#2E2059' : '#E5E7EB' }],
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Barra de Acciones: Chat con motorizado, Reportar Error */}
      <View style={[styles.actionBar, { borderTopColor: colors.cardBorder }]}>
        {driver ? (
          <TouchableOpacity
            style={styles.chatActionBtn}
            onPress={() => setShowChat(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubbles" size={16} color="#000" style={{ marginRight: 6 }} />
            <Text style={styles.chatActionText}>Chat con Conductor</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.waitingDriverBox, { backgroundColor: isDark ? '#190E38' : '#F3F4F6' }]}>
            <Ionicons name="hourglass-outline" size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.waitingDriverText, { color: colors.textMuted }]}>Asignando repartidor...</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.reportActionBtn, { backgroundColor: isDark ? '#3D1414' : '#FEE2E2', borderColor: isDark ? '#5C2222' : '#FCA5A5' }]}
          onPress={() => setShowReport(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="alert-circle-outline" size={15} color={isDark ? '#F87171' : '#DC2626'} style={{ marginRight: 4 }} />
          <Text style={[styles.reportActionText, { color: isDark ? '#F87171' : '#DC2626' }]}>Reportar Error</Text>
        </TouchableOpacity>

        {status === 'DELIVERED' && !order.businessRating && (
          <TouchableOpacity
            style={styles.rateActionBtn}
            onPress={() => setShowRating(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="star" size={14} color="#000" style={{ marginRight: 4 }} />
            <Text style={styles.rateActionText}>Calificar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modales Interactivos */}
      <OrderChatModal
        visible={showChat}
        onClose={() => setShowChat(false)}
        order={order}
        currentUser={currentUser}
      />

      <ReportIssueModal
        visible={showReport}
        onClose={() => setShowReport(false)}
        order={order}
        onSuccess={onRefreshOrders}
      />

      <OrderRatingModal
        visible={showRating}
        onClose={() => setShowRating(false)}
        order={order}
        onSuccess={onRefreshOrders}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  businessTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  statusSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCD116',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 2,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  stepItem: {
    alignItems: 'center',
    width: 52,
  },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  circleCompleted: {
    backgroundColor: '#FCD116',
  },
  circleCurrent: {
    backgroundColor: '#FCD116',
    borderWidth: 2,
    borderColor: '#000000',
  },
  circlePending: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stepLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
    textAlign: 'center',
  },
  stepLabelCurrent: {
    color: '#111827',
    fontWeight: '700',
  },
  stepLabelCompleted: {
    color: '#374151',
    fontWeight: '600',
  },
  connectorLine: {
    flex: 1,
    height: 3,
    marginBottom: 18,
    borderRadius: 2,
  },
  connectorLineFilled: {
    backgroundColor: '#FCD116',
  },
  connectorLineEmpty: {
    backgroundColor: '#E5E7EB',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  chatActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCD116',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  chatActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  waitingDriverBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  waitingDriverText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  reportActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  reportActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  rateActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCD116',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  rateActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
});
