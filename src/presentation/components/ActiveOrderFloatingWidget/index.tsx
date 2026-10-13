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

interface ActiveOrderFloatingWidgetProps {
  order: any;
  currentUser: any;
  onRefreshOrders?: () => void;
}

const STEPS = [
  { key: 'PAYMENT', label: 'Pago', icon: 'card-outline' },
  { key: 'PREPARING', label: 'Cocina', icon: 'restaurant-outline' },
  { key: 'ON_WAY', label: 'En Camino', icon: 'bicycle-outline' },
  { key: 'ARRIVED', label: 'Llegó', icon: 'location-outline' },
  { key: 'DELIVERED', label: 'Entregado', icon: 'checkmark-circle-outline' },
];

export const ActiveOrderFloatingWidget = ({
  order,
  currentUser,
  onRefreshOrders,
}: ActiveOrderFloatingWidgetProps) => {
  const router = useRouter();
  const [showChat, setShowChat] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showRating, setShowRating] = useState(false);

  if (!order) return null;

  const status = order.status || 'PENDING';
  const isPaid = order.isPaid;

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
    // PENDING
    currentStepIndex = isPaid ? 1 : 0;
  }

  // Título dinámico explicativo estilo Quik
  let statusMessage = 'Tu pago está en verificación...';
  let statusColor = '#F59E0B';

  switch (currentStepIndex) {
    case 0:
      statusMessage = 'Verificando pago...';
      statusColor = '#F59E0B';
      break;
    case 1:
      statusMessage = 'Negocio preparando tu pedido 👨‍🍳';
      statusColor = '#3B82F6';
      break;
    case 2:
      statusMessage = 'Repartidor en camino a tu puerta 🛵';
      statusColor = '#8B5CF6';
      break;
    case 3:
      statusMessage = '¡El repartidor ha llegado! 📍';
      statusColor = '#10B981';
      break;
    case 4:
      statusMessage = 'Pedido entregado ✅';
      statusColor = '#059669';
      break;
  }

  const businessName = order.business?.name || order.category || 'Pedido IGO';
  const driver = order.deliveryUser;

  return (
    <View style={styles.cardContainer}>
      {/* Header del Widget */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.pulseDot, { backgroundColor: statusColor }]} />
          <View>
            <Text style={styles.businessTitle} numberOfLines={1}>
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
        {STEPS.map((step, idx) => {
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
                    isPending && styles.circlePending,
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={14} color="#000" />
                  ) : (
                    <Ionicons
                      name={step.icon as any}
                      size={13}
                      color={isCurrent ? '#000' : '#9CA3AF'}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isCurrent && styles.stepLabelCurrent,
                    isCompleted && styles.stepLabelCompleted,
                  ]}
                  numberOfLines={1}
                >
                  {step.label}
                </Text>
              </View>

              {/* Línea conectora entre círculos */}
              {idx < STEPS.length - 1 && (
                <View
                  style={[
                    styles.connectorLine,
                    idx < currentStepIndex ? styles.connectorLineFilled : styles.connectorLineEmpty,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Barra de Acciones: Chat con motorizado, Reportar Error */}
      <View style={styles.actionBar}>
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
          <View style={styles.waitingDriverBox}>
            <Ionicons name="hourglass-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
            <Text style={styles.waitingDriverText}>Asignando repartidor...</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.reportActionBtn}
          onPress={() => setShowReport(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="alert-circle-outline" size={15} color="#DC2626" style={{ marginRight: 4 }} />
          <Text style={styles.reportActionText}>Reportar Error</Text>
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
