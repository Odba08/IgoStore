import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { igoApi } from '@/infrastructure/api/igo.api';

interface ReportIssueModalProps {
  visible: boolean;
  onClose: () => void;
  order: any;
  onSuccess?: () => void;
}

const ISSUE_OPTIONS = [
  '🍔 No me trajeron lo que pedí / Pedido incompleto',
  '📦 El producto llegó en mal estado',
  '📍 El repartidor no encuentra la dirección',
  '⏳ Demora excesiva en la entrega',
  '❓ Otro inconveniente',
];

export const ReportIssueModal = ({
  visible,
  onClose,
  order,
  onSuccess,
}: ReportIssueModalProps) => {
  const [selectedReason, setSelectedReason] = useState<string>(ISSUE_OPTIONS[0]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!order?.id) return;

    setIsSubmitting(true);
    try {
      const response = await igoApi.post(`/orders/${order.id}/report-issue`, {
        reason: selectedReason,
        comment: comment.trim(),
      });

      Alert.alert(
        '🚨 Reporte Enviado',
        'Un administrador de IGO ha recibido tu notificación con máxima prioridad y se pondrá en contacto contigo y con el comercio para solucionar el problema.',
        [
          {
            text: 'Entendido',
            onPress: () => {
              onClose();
              if (onSuccess) onSuccess();
            },
          },
        ]
      );
    } catch (err: any) {
      console.warn('Error enviando reporte:', err);
      Alert.alert(
        'Error',
        err.response?.data?.message || 'No se pudo enviar el reporte. Por favor intenta de nuevo.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.alertIconCircle}>
                <Ionicons name="warning" size={20} color="#b91c1c" />
              </View>
              <View>
                <Text style={styles.title}>Reportar un Problema</Text>
                <Text style={styles.subtitle}>
                  Orden #{String(order?.orderNumber || '').padStart(4, '0')}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            <Text style={styles.sectionLabel}>¿Qué problema tuviste?</Text>

            {ISSUE_OPTIONS.map((opt, idx) => {
              const isSelected = selectedReason === opt;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                  onPress={() => setSelectedReason(opt)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={isSelected ? '#FCD116' : '#9CA3AF'}
                    style={{ marginRight: 10 }}
                  />
                  <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>
              Detalles adicionales (opcional):
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Explica con brevedad qué ocurrió..."
              placeholderTextColor="#9CA3AF"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
              maxLength={300}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color="#000" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Enviar al Soporte IGO</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    backgroundColor: '#FAFAFA',
  },
  reasonOptionSelected: {
    borderColor: '#FCD116',
    backgroundColor: 'rgba(252, 209, 22, 0.1)',
  },
  reasonText: {
    fontSize: 13,
    color: '#4B5563',
    flex: 1,
  },
  reasonTextSelected: {
    color: '#111827',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 70,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  submitButton: {
    backgroundColor: '#FCD116',
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
});
