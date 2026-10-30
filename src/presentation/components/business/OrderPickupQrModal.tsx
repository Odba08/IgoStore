import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/presentation/store/useThemeStore';

interface OrderPickupQrModalProps {
  visible: boolean;
  order: any | null;
  onClose: () => void;
}

export const OrderPickupQrModal: React.FC<OrderPickupQrModalProps> = ({
  visible,
  order,
  onClose,
}) => {
  const { colors, isDark } = useThemeStore();

  if (!order) return null;

  const orderNumStr = String(order.orderNumber || '').padStart(4, '0');
  const pickupCode = order.pickupCode || String((order.orderNumber || 0) % 10000).padStart(4, '0');

  const qrData = JSON.stringify({
    type: 'IGO_PICKUP',
    orderId: order.id,
    orderNumber: order.orderNumber,
    code: pickupCode,
  });

  const driverName = order.deliveryUser?.fullName || order.deliveryUser?.fullname;
  const driverPhone = order.deliveryUser?.phoneNumber || order.deliveryUser?.phone;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: isDark ? '#1C1635' : '#FFFFFF', borderColor: colors.cardBorder }]}>
          {/* BOTÓN CERRAR */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={isDark ? '#E2E8F0' : '#475569'} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* ENCABEZADO */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Ionicons name="qr-code" size={28} color="#7E22CE" />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>QR de Despacho</Text>
              <Text style={styles.orderBadge}>Pedido #{orderNumStr}</Text>
            </View>

            {/* INFO DEL CLIENTE */}
            <View style={[styles.clientBox, { backgroundColor: isDark ? '#261D47' : '#F8FAFC' }]}>
              <Text style={[styles.clientLabel, { color: colors.textMuted }]}>Cliente:</Text>
              <Text style={[styles.clientName, { color: colors.text }]}>
                {order.user?.fullName || order.userIdTemp || 'Cliente IGO'}
              </Text>
              {order.deliveryAddress ? (
                <Text style={[styles.clientAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                  📍 {order.deliveryAddress}
                </Text>
              ) : null}
            </View>

            {/* CÓDIGO QR */}
            <View style={styles.qrWrapper}>
              <View style={styles.qrContainer}>
                <QRCode
                  value={qrData}
                  size={190}
                  color="#0F0330"
                  backgroundColor="#FFFFFF"
                />
              </View>
            </View>

            {/* PIN DE SEGURIDAD EN GRANDE */}
            <View style={styles.pinSection}>
              <Text style={styles.pinLabel}>PIN DE RETIRO MANUAL</Text>
              <View style={styles.pinDigitsRow}>
                {pickupCode.split('').map((digit: string, index: number) => (
                  <View key={index} style={styles.pinDigitBox}>
                    <Text style={styles.pinDigitText}>{digit}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.pinHelper}>
                El repartidor puede escanear este QR con su cámara o tú puedes dictarle este PIN de 4 dígitos.
              </Text>
            </View>

            {/* INFO DEL REPARTIDOR ASIGNADO */}
            <View style={[styles.driverBox, { backgroundColor: driverName ? (isDark ? '#1E293B' : '#EFF6FF') : (isDark ? '#2E2010' : '#FFFBEB') }]}>
              <Ionicons
                name={driverName ? 'bicycle' : 'time-outline'}
                size={22}
                color={driverName ? '#2563EB' : '#D97706'}
                style={{ marginRight: 10 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.driverTitle, { color: driverName ? '#1E40AF' : '#B45309' }]}>
                  {driverName ? 'Repartidor Asignado' : 'Esperando Motorizado'}
                </Text>
                <Text style={[styles.driverSub, { color: colors.textSecondary }]}>
                  {driverName ? `${driverName}${driverPhone ? ` • ${driverPhone}` : ''}` : 'El sistema está asignando el repartidor más cercano.'}
                </Text>
              </View>
            </View>

            {/* BOTÓN ENTENDIDO */}
            <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.doneBtnText}>Listo / Cerrar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  orderBadge: {
    backgroundColor: '#7E22CE',
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  clientBox: {
    width: '100%',
    borderRadius: 12,
    padding: 10,
    marginBottom: 15,
  },
  clientLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 2,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '700',
  },
  clientAddress: {
    fontSize: 12,
    marginTop: 2,
  },
  qrWrapper: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginBottom: 15,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinSection: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B21A8',
    letterSpacing: 1,
    marginBottom: 6,
  },
  pinDigitsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  pinDigitBox: {
    width: 44,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#7E22CE',
  },
  pinDigitText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#581C87',
  },
  pinHelper: {
    fontSize: 11,
    color: '#6B21A8',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  driverBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  driverTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  driverSub: {
    fontSize: 11,
    marginTop: 2,
  },
  doneBtn: {
    width: '100%',
    backgroundColor: '#0F0330',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFDB58',
    fontSize: 15,
    fontWeight: '800',
  },
});
