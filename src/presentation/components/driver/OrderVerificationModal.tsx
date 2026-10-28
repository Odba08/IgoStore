import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeStore } from '@/presentation/store/useThemeStore';

interface OrderVerificationModalProps {
  visible: boolean;
  order: any | null;
  onSuccess: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export const OrderVerificationModal: React.FC<OrderVerificationModalProps> = ({
  visible,
  order,
  onSuccess,
  onSkip,
  onClose,
}) => {
  const { colors, isDark } = useThemeStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualPin, setManualPin] = useState('');
  const [scanned, setScanned] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successVerified, setSuccessVerified] = useState(false);

  useEffect(() => {
    if (visible) {
      setManualPin('');
      setScanned(false);
      setErrorMessage(null);
      setSuccessVerified(false);
    }
  }, [visible, order?.id]);

  if (!order) return null;

  const orderNumStr = String(order.orderNumber || '').padStart(4, '0');
  const targetCode = String(order.pickupCode || String((order.orderNumber || 0) % 10000).padStart(4, '0')).trim();

  const handleVerifySuccess = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {}

    setSuccessVerified(true);
    setErrorMessage(null);

    setTimeout(() => {
      onSuccess();
    }, 900);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned || successVerified) return;
    setScanned(true);

    let parsedOrderId: string | null = null;
    let parsedCode: string | null = null;
    let parsedOrderNum: string | null = null;

    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        parsedOrderId = parsed.orderId || null;
        parsedCode = parsed.code ? String(parsed.code).trim() : null;
        parsedOrderNum = parsed.orderNumber ? String(parsed.orderNumber) : null;
      }
    } catch (e) {
      // Si no es JSON, comparar directamente con ID o código
      parsedCode = data.trim();
    }

    // Comprobación de coincidencia
    const isIdMatch = parsedOrderId && parsedOrderId === order.id;
    const isCodeMatch = parsedCode && (parsedCode === targetCode || parsedCode === order.id || parsedCode === orderNumStr);

    if (isIdMatch || isCodeMatch) {
      handleVerifySuccess();
    } else {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      } catch (e) {}

      const foreignDesc = parsedOrderNum ? `del pedido #${parsedOrderNum.padStart(4, '0')}` : 'de otro pedido';
      setErrorMessage(
        `⚠️ ¡CÓDIGO EQUIVOCADO!\nEste QR es ${foreignDesc}.\nTu pedido asignado es el #${orderNumStr}. Verifica la bolsa con el local.`
      );

      // Permitir volver a escanear tras 2.5 segundos
      setTimeout(() => {
        setScanned(false);
      }, 2500);
    }
  };

  const handleManualVerify = () => {
    const cleaned = manualPin.trim();
    if (!cleaned) {
      Alert.alert('PIN requerido', 'Ingresa el código de 4 dígitos proporcionado por el local.');
      return;
    }

    if (cleaned === targetCode || cleaned === orderNumStr || cleaned === order.id) {
      handleVerifySuccess();
    } else {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      } catch (e) {}
      setErrorMessage(`❌ El PIN "${cleaned}" no coincide con el pedido #${orderNumStr}. Pídele al comercio que revise su pantalla.`);
    }
  };

  const handleSkipPrompt = () => {
    Alert.alert(
      '¿Omitir verificación?',
      `¿Confirmas que ya tienes la bolsa correcta del Pedido #${orderNumStr} y deseas continuar sin escanear?`,
      [
        { text: 'Volver a intentar', style: 'cancel' },
        {
          text: 'Sí, ya tengo el pedido',
          style: 'default',
          onPress: onSkip,
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: isDark ? '#18122B' : '#FFFFFF', borderColor: colors.cardBorder }]}>
          {/* BOTÓN CERRAR */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={isDark ? '#E2E8F0' : '#475569'} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* ENCABEZADO */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark" size={28} color="#2563EB" />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Validar Recogida</Text>
              <Text style={styles.orderBadge}>Pedido #{orderNumStr}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {order.business?.name || 'Local'}
              </Text>
            </View>

            {/* ESTADO DE ÉXITO */}
            {successVerified ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={64} color="#10B981" />
                <Text style={styles.successTitle}>¡Pedido Validado!</Text>
                <Text style={styles.successSub}>Bolsa correcta verificada. ¡Iniciando viaje de entrega!</Text>
                <ActivityIndicator size="small" color="#10B981" style={{ marginTop: 10 }} />
              </View>
            ) : (
              <>
                {/* MENSAJE DE ERROR */}
                {errorMessage && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                {/* VISOR DE CÁMARA */}
                <View style={styles.cameraContainer}>
                  {!permission ? (
                    <View style={styles.camFallback}>
                      <ActivityIndicator size="small" color="#2563EB" />
                    </View>
                  ) : !permission.granted ? (
                    <View style={styles.camFallback}>
                      <Ionicons name="camera-outline" size={38} color="#94A3B8" />
                      <Text style={styles.permText}>Se requiere acceso a la cámara para escanear el QR del pedido.</Text>
                      <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                        <Text style={styles.permBtnText}>Permitir Cámara</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.cameraWrapper}>
                      <CameraView
                        style={StyleSheet.absoluteFill}
                        facing="back"
                        barcodeScannerSettings={{
                          barcodeTypes: ['qr'],
                        }}
                        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                      />
                      {/* OVERLAY DEL MARCO DE ESCANEO */}
                      <View style={styles.scanTargetBox}>
                        <View style={[styles.corner, styles.cornerTL]} />
                        <View style={[styles.corner, styles.cornerTR]} />
                        <View style={[styles.corner, styles.cornerBL]} />
                        <View style={[styles.corner, styles.cornerBR]} />
                      </View>
                      <Text style={styles.camHelperText}>Apunta al código QR del comercio</Text>
                    </View>
                  )}
                </View>

                {/* DIVISOR */}
                <View style={styles.dividerRow}>
                  <View style={[styles.dividerLine, { backgroundColor: isDark ? '#33275A' : '#E2E8F0' }]} />
                  <Text style={[styles.dividerText, { color: colors.textMuted }]}>O INGRESA EL PIN</Text>
                  <View style={[styles.dividerLine, { backgroundColor: isDark ? '#33275A' : '#E2E8F0' }]} />
                </View>

                {/* ENTRADA MANUAL DE PIN */}
                <View style={styles.manualPinSection}>
                  <TextInput
                    style={[styles.pinInput, { color: colors.text, borderColor: isDark ? '#4A3B7A' : '#CBD5E1', backgroundColor: isDark ? '#221940' : '#F8FAFC' }]}
                    placeholder="PIN de 4 dígitos"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={manualPin}
                    onChangeText={(val) => {
                      setManualPin(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                  />
                  <TouchableOpacity
                    style={[styles.verifyPinBtn, !manualPin.trim() && { opacity: 0.5 }]}
                    onPress={handleManualVerify}
                    disabled={!manualPin.trim()}
                  >
                    <Text style={styles.verifyPinBtnText}>Verificar</Text>
                  </TouchableOpacity>
                </View>

                {/* BOTÓN OMITIR (NO ES OBLIGATORIO) */}
                <TouchableOpacity style={styles.skipBtn} onPress={handleSkipPrompt} activeOpacity={0.7}>
                  <Ionicons name="arrow-forward-outline" size={16} color={colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>
                    Omitir validación y recoger pedido
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '92%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
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
    marginBottom: 14,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EFF6FF',
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
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 15,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 12,
  },
  successSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  cameraContainer: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#000000',
    marginBottom: 16,
  },
  cameraWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTargetBox: {
    width: 140,
    height: 140,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#FFDB58',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  camHelperText: {
    position: 'absolute',
    bottom: 8,
    color: '#FFFFFF',
    fontSize: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  camFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#1E293B',
  },
  permText: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 10,
  },
  permBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  permBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    letterSpacing: 0.8,
  },
  manualPinSection: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  pinInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  verifyPinBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyPinBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipBtnText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
