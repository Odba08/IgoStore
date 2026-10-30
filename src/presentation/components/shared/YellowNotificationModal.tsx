import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationAlertStore } from '@/presentation/store/useNotificationAlertStore';
import SoundService from '@/infrastructure/services/sound.service';

const { width } = Dimensions.get('window');

export const YellowNotificationModal = () => {
  const { isVisible, currentAlert, hideAlert } = useNotificationAlertStore();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isVisible) {
      // Entrada con resorte
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();

      // Pulsación continua del ícono mientras la alerta esté abierta
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();

      return () => {
        pulseLoop.stop();
      };
    } else {
      scaleAnim.setValue(0.85);
    }
  }, [isVisible]);

  if (!isVisible || !currentAlert) return null;

  const handleAction = () => {
    SoundService.stopOrderAlertSound().catch(() => {});
    if (currentAlert.onAction) {
      currentAlert.onAction();
    }
    hideAlert();
  };

  const handleDismiss = () => {
    SoundService.stopOrderAlertSound().catch(() => {});
    hideAlert();
  };

  const formattedOrderNumber = currentAlert.orderNumber
    ? String(currentAlert.orderNumber).padStart(4, '0')
    : null;

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.cardContainer, { transform: [{ scale: scaleAnim }] }]}>
          {/* Header con Badge de Alerta Sonora */}
          <View style={styles.header}>
            <Animated.View style={[styles.iconCircle, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="notifications" size={32} color="#000" />
            </Animated.View>
            <View style={styles.soundBadge}>
              <Ionicons name="volume-high" size={14} color="#000" />
              <Text style={styles.soundBadgeText}>Alerta en Vivo</Text>
            </View>
          </View>

          {/* Título de la Notificación */}
          <Text style={styles.title}>{currentAlert.title}</Text>

          {/* Badge del Pedido y Monto */}
          {(formattedOrderNumber || currentAlert.totalAmount !== undefined) && (
            <View style={styles.orderBadgeRow}>
              {formattedOrderNumber && (
                <View style={styles.orderNumberBadge}>
                  <Text style={styles.orderNumberText}>Orden #{formattedOrderNumber}</Text>
                </View>
              )}
              {currentAlert.totalAmount !== undefined && (
                <View style={styles.amountBadge}>
                  <Text style={styles.amountText}>
                    ${Number(currentAlert.totalAmount).toFixed(2)} USD
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Datos Complementarios */}
          <View style={styles.detailsBox}>
            {currentAlert.clientName && (
              <View style={styles.detailRow}>
                <Ionicons name="person" size={16} color="#1E1238" style={{ marginRight: 6 }} />
                <Text style={styles.detailLabel}>Cliente:</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {currentAlert.clientName}
                </Text>
              </View>
            )}

            {currentAlert.businessName && (
              <View style={styles.detailRow}>
                <Ionicons name="storefront" size={16} color="#1E1238" style={{ marginRight: 6 }} />
                <Text style={styles.detailLabel}>Local:</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {currentAlert.businessName}
                </Text>
              </View>
            )}

            {currentAlert.deliveryAddress && (
              <View style={styles.detailRow}>
                <Ionicons name="location" size={16} color="#1E1238" style={{ marginRight: 6 }} />
                <Text style={styles.detailLabel}>Dirección:</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {currentAlert.deliveryAddress}
                </Text>
              </View>
            )}

            <Text style={styles.messageText}>{currentAlert.message}</Text>
          </View>

          {/* Botones de Acción */}
          <View style={styles.buttonRow}>
            {currentAlert.onAction && (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleAction}
                activeOpacity={0.85}
              >
                <Ionicons name="arrow-forward-circle" size={20} color="#FFCC00" style={{ marginRight: 6 }} />
                <Text style={styles.primaryBtnText}>
                  {currentAlert.actionLabel || 'VER PEDIDO'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                !currentAlert.onAction && { flex: 1, width: '100%' }
              ]}
              onPress={handleDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryBtnText}>ENTENDIDO</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999999,
  },
  cardContainer: {
    width: Math.min(width - 32, 420),
    backgroundColor: '#FFCC00', // Pantalla amarilla vibrante IGO
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 24,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
    marginBottom: 12,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  soundBadge: {
    position: 'absolute',
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  soundBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  orderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  orderNumberBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  orderNumberText: {
    color: '#FFCC00',
    fontSize: 14,
    fontWeight: '800',
  },
  amountBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  amountText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  detailsBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E1238',
    marginRight: 6,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E1238',
    marginTop: 4,
    lineHeight: 18,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'column',
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#000000',
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  primaryBtnText: {
    color: '#FFCC00',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    paddingVertical: 12,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  secondaryBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
});
