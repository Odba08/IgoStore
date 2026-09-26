import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { pickImageFromGallery, takePhotoWithCamera, uploadReceiptImage } from '@/infrastructure/services/imageUpload.service';
import { getSocket } from '@/infrastructure/services/socket.service';

interface StorePaymentModalProps {
  visible: boolean;
  onClose: () => void;
  business: any;
  totalAmountUsd: number;
  totalAmountBs: number;
  bcvRate: number;
  onSubmitOrder: (paymentData: { paymentReference: string; paymentCaptureUrl: string }) => Promise<any>;
  onOrderFinished?: () => void;
}

export default function StorePaymentModal({
  visible,
  onClose,
  business,
  totalAmountUsd,
  totalAmountBs,
  bcvRate,
  onSubmitOrder,
  onOrderFinished,
}: StorePaymentModalProps) {
  const [reference, setReference] = useState('');
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [assignedDriver, setAssignedDriver] = useState<any>(null);

  useEffect(() => {
    if (!orderSuccess?.orderId) return;

    try {
      const socket = getSocket();

      const handlePaymentVerified = (data: any) => {
        console.log('⚡ [StorePaymentModal] Pago verificado recibido:', data);
        const orderIdStr = String(orderSuccess.orderId);
        if (String(data?.orderId) === orderIdStr || String(data?.id) === orderIdStr) {
          setPaymentVerified(true);
        }
      };

      const handleDriverAssigned = (data: any) => {
        console.log('⚡ [StorePaymentModal] Conductor asignado recibido:', data);
        const orderIdStr = String(orderSuccess.orderId);
        if (String(data?.orderId) === orderIdStr || String(data?.id) === orderIdStr) {
          setAssignedDriver(data.driver);
        }
      };

      socket.on('order:payment_verified', handlePaymentVerified);
      socket.on('order:driver_assigned', handleDriverAssigned);

      return () => {
        socket.off('order:payment_verified', handlePaymentVerified);
        socket.off('order:driver_assigned', handleDriverAssigned);
      };
    } catch (err) {
      console.warn('Error al suscribir socket en StorePaymentModal:', err);
    }
  }, [orderSuccess?.orderId]);

  const paymentBank = business?.paymentBank || '0102 - Banco de Venezuela';
  const paymentPhone = business?.paymentPhone || '0412-1234567';
  const paymentId = business?.paymentId || business?.rif || 'V-12345678';
  const paymentAccountName = business?.paymentAccountName || business?.legalName || business?.name || 'Comercio Igo';

  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (Clipboard && Clipboard.setStringAsync) {
        await Clipboard.setStringAsync(text);
      }
      Alert.alert('Copiado', `${label} copiado al portapapeles.`);
    } catch {
      Alert.alert('Copiado', `${text}`);
    }
  };

  const handlePickGallery = async () => {
    const uri = await pickImageFromGallery();
    if (uri) setLocalImageUri(uri);
  };

  const handleTakePhoto = async () => {
    const uri = await takePhotoWithCamera();
    if (uri) setLocalImageUri(uri);
  };

  const handleConfirmPayment = async () => {
    if (!reference.trim()) {
      Alert.alert('Falta Referencia', 'Por favor ingresa los últimos 4 a 8 dígitos del número de referencia de tu Pago Móvil.');
      return;
    }

    if (!localImageUri) {
      Alert.alert('Falta Comprobante', 'Por favor adjunta la captura de pantalla o foto del comprobante de tu pago móvil.');
      return;
    }

    setUploading(true);
    try {
      // 1. Subir la imagen del comprobante
      const captureUrl = await uploadReceiptImage(localImageUri);

      // 2. Enviar la orden al backend
      const result = await onSubmitOrder({
        paymentReference: reference.trim(),
        paymentCaptureUrl: captureUrl,
      });

      setOrderSuccess(result || { orderId: 'OK' });
    } catch (err: any) {
      console.error('Error al procesar el pago del pedido:', err);
      Alert.alert('Error', err.message || 'No pudimos registrar tu comprobante. Por favor intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const openWhatsAppSupport = (orderId: string) => {
    const text = `Hola equipo IGO, tengo una consulta sobre el pago de mi pedido #${String(orderId).padStart(4, '0')}.`;
    Linking.openURL(`https://wa.me/573014215155?text=${encodeURIComponent(text)}`);
  };

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
          {orderSuccess ? (
            // PANTALLA DE CONFIRMACIÓN DE ÉXITO
            // PANTALLA DE CONFIRMACIÓN DE ÉXITO CON ESTADO EN TIEMPO REAL
            <ScrollView contentContainerStyle={styles.successContainer}>
              <View style={[styles.successIconBadge, paymentVerified && { backgroundColor: '#DCFCE7' }]}>
                <Ionicons 
                  name={paymentVerified ? "checkmark-circle" : "checkmark-done"} 
                  size={48} 
                  color="#10B981" 
                />
              </View>

              <Text style={styles.successTitle}>
                {paymentVerified ? '¡Pago Aprobado y Confirmado! 🎉' : '¡Gracias por tu compra!'}
              </Text>
              
              <Text style={styles.successSubtitle}>
                Tu pedido{' '}
                <Text style={{ fontWeight: 'bold', color: '#10B981' }}>
                  #{String(orderSuccess.orderId || '').padStart(4, '0')}
                </Text>{' '}
                {paymentVerified 
                  ? 'ha sido verificado por el comercio y está siendo preparado.' 
                  : 'está en proceso de verificación.'}
              </Text>

              {paymentVerified ? (
                <View style={[styles.verificationNoteCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                  <Ionicons name="bag-check" size={24} color="#059669" style={{ marginRight: 10 }} />
                  <Text style={[styles.verificationNoteText, { color: '#065F46' }]}>
                    {assignedDriver 
                      ? `¡Repartidor Asignado! ${assignedDriver.name || 'Conductor Igo'} está en camino.` 
                      : 'Tu pago fue validado exitosamente en tiempo real. La tienda ya está preparando tu orden.'}
                  </Text>
                </View>
              ) : (
                <View style={styles.verificationNoteCard}>
                  <Ionicons name="shield-checkmark" size={24} color="#3B82F6" style={{ marginRight: 10 }} />
                  <Text style={styles.verificationNoteText}>
                    Nuestro equipo validará tu comprobante de pago en los próximos minutos y despacharemos a tu motorizado.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.whatsappSupportBtn}
                onPress={() => openWhatsAppSupport(orderSuccess.orderId)}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" style={{ marginRight: 8 }} />
                <Text style={styles.whatsappSupportText}>¿Dudas o errores en el pago? Escríbenos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.doneBtn, paymentVerified && { backgroundColor: '#10B981' }]}
                onPress={() => {
                  setOrderSuccess(null);
                  setReference('');
                  setLocalImageUri(null);
                  setPaymentVerified(false);
                  setAssignedDriver(null);
                  if (onOrderFinished) {
                    onOrderFinished();
                  } else {
                    onClose();
                  }
                }}
              >
                <Text style={styles.doneBtnText}>
                  {paymentVerified ? 'Seguir Comprando' : 'Entendido / Finalizar'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            // FORMULARIO DE PAGO MÓVIL Y CARGA DE COMPROBANTE
            <>
              {/* Header del Modal */}
              <View style={styles.headerRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="card" size={24} color="#EDB422" style={{ marginRight: 8 }} />
                  <Text style={styles.modalTitle}>Pago Móvil a la Tienda</Text>
                </View>
                <TouchableOpacity onPress={onClose} disabled={uploading}>
                  <Ionicons name="close-circle" size={28} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
                {/* Cuadro de Monto Total */}
                <View style={styles.amountBanner}>
                  <Text style={styles.amountLabel}>Monto Total a Transferir:</Text>
                  <Text style={styles.amountBsText}>Bs. {totalAmountBs.toFixed(2)}</Text>
                  <Text style={styles.amountUsdText}>
                    ${totalAmountUsd.toFixed(2)} USD • Tasa BCV: {bcvRate.toFixed(2)} Bs/$
                  </Text>
                </View>

                {/* Datos Bancarios del Comercio */}
                <View style={styles.bankDataCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={styles.bankCardHeader}>Datos de Pago de {business?.name || 'la Tienda'}:</Text>
                    <TouchableOpacity
                      style={styles.copyAllBtn}
                      onPress={() =>
                        copyToClipboard(
                          `Banco: ${paymentBank}\nTeléfono: ${paymentPhone}\nCédula/RIF: ${paymentId}\nTitular: ${paymentAccountName}\nMonto: Bs. ${totalAmountBs.toFixed(2)}`,
                          'Datos completos de pago'
                        )
                      }
                    >
                      <Ionicons name="copy-outline" size={14} color="#3B82F6" />
                      <Text style={styles.copyAllText}>Copiar Todo</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.bankRow}>
                    <Text style={styles.bankFieldLabel}>Banco:</Text>
                    <Text style={styles.bankFieldValue}>{paymentBank}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.bankRowInteractive}
                    onPress={() => copyToClipboard(paymentPhone, 'Teléfono')}
                  >
                    <Text style={styles.bankFieldLabel}>Teléfono:</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.bankFieldValue, { fontWeight: 'bold' }]}>{paymentPhone}</Text>
                      <Ionicons name="copy-outline" size={14} color="#64748B" style={{ marginLeft: 6 }} />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.bankRowInteractive}
                    onPress={() => copyToClipboard(paymentId, 'Cédula/RIF')}
                  >
                    <Text style={styles.bankFieldLabel}>C.I. / RIF:</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.bankFieldValue, { fontWeight: 'bold' }]}>{paymentId}</Text>
                      <Ionicons name="copy-outline" size={14} color="#64748B" style={{ marginLeft: 6 }} />
                    </View>
                  </TouchableOpacity>

                  <View style={styles.bankRow}>
                    <Text style={styles.bankFieldLabel}>Titular:</Text>
                    <Text style={styles.bankFieldValue}>{paymentAccountName}</Text>
                  </View>
                </View>

                {/* Input de Número de Referencia */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Número de Referencia del Pago Móvil *</Text>
                  <TextInput
                    style={styles.refInput}
                    placeholder="Ej: 849201 o últimos 6 dígitos"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={reference}
                    onChangeText={setReference}
                  />
                </View>

                {/* Selector de Comprobante / Capture */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Capture / Comprobante de Transferencia *</Text>

                  {localImageUri ? (
                    <View style={styles.previewContainer}>
                      <Image source={{ uri: localImageUri }} style={styles.previewImage} resizeMode="contain" />
                      <TouchableOpacity style={styles.removeImageBtn} onPress={() => setLocalImageUri(null)}>
                        <Ionicons name="trash" size={16} color="#FFF" />
                        <Text style={styles.removeImageText}>Cambiar Imagen</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.pickerButtonsRow}>
                      <TouchableOpacity style={styles.pickerBtn} onPress={handlePickGallery}>
                        <Ionicons name="images" size={24} color="#3B82F6" />
                        <Text style={styles.pickerBtnText}>Galería</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.pickerBtn} onPress={handleTakePhoto}>
                        <Ionicons name="camera" size={24} color="#10B981" />
                        <Text style={styles.pickerBtnText}>Cámara</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Botón de Confirmación Final */}
              <View style={styles.footerRow}>
                <TouchableOpacity
                  style={[styles.submitBtn, uploading && { opacity: 0.7 }]}
                  onPress={handleConfirmPayment}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#000" style={{ marginRight: 8 }} />
                      <Text style={styles.submitBtnText}>Enviar Comprobante y Finalizar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
    zIndex: 99999,
    elevation: 25,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 25,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  scrollBody: {
    padding: 20,
    paddingBottom: 10,
  },
  amountBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
  },
  amountBsText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#B45309',
    marginVertical: 4,
  },
  amountUsdText: {
    fontSize: 13,
    color: '#78350F',
    fontWeight: '500',
  },
  bankDataCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  bankCardHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  copyAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  copyAllText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  bankRowInteractive: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  bankFieldLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  bankFieldValue: {
    fontSize: 13,
    color: '#0F172A',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  refInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '600',
  },
  pickerButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerBtn: {
    flex: 1,
    height: 75,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 4,
  },
  previewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    padding: 10,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  removeImageText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  footerRow: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  submitBtn: {
    backgroundColor: '#FFDB58',
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFDB58',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  // SUCCESS VIEW STYLES
  successContainer: {
    padding: 25,
    alignItems: 'center',
  },
  successIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#065F46',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  verificationNoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 20,
  },
  verificationNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  whatsappSupportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 12,
    width: '100%',
    paddingVertical: 14,
    marginBottom: 12,
  },
  whatsappSupportText: {
    fontSize: 13,
    color: '#15803D',
    fontWeight: '700',
  },
  doneBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    width: '100%',
    paddingVertical: 15,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
