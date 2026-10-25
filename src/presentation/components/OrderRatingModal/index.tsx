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
import { useThemeStore } from '@/presentation/store/useThemeStore';

interface OrderRatingModalProps {
  visible: boolean;
  onClose: () => void;
  order: any;
  onSuccess?: () => void;
}

export const OrderRatingModal = ({
  visible,
  onClose,
  order,
  onSuccess,
}: OrderRatingModalProps) => {
  const { colors, isDark } = useThemeStore();
  const [businessRating, setBusinessRating] = useState(5);
  const [driverRating, setDriverRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!order?.id) return;

    setIsSubmitting(true);
    try {
      await igoApi.post(`/orders/${order.id}/rate`, {
        businessRating,
        driverRating,
        comment: comment.trim(),
      });

      Alert.alert('¡Gracias por tu reseña!', 'Tu calificación ayuda a mejorar la calidad de IGO.', [
        {
          text: 'Genial',
          onPress: () => {
            onClose();
            if (onSuccess) onSuccess();
          },
        },
      ]);
    } catch (err: any) {
      console.warn('Error calificando orden:', err);
      Alert.alert('Error', err.response?.data?.message || 'No se pudo enviar la calificación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStarSelector = (value: number, onChange: (val: number) => void) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onChange(star)}
            activeOpacity={0.7}
            style={styles.starBtn}
          >
            <Ionicons
              name={star <= value ? 'star' : 'star-outline'}
              size={32}
              color={star <= value ? '#FFC93C' : (isDark ? '#4B3F72' : '#D1D5DB')}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const businessName = order?.business?.name || 'el Comercio';
  const driverName = order?.deliveryUser?.fullName || 'el Repartidor';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="sparkles" size={24} color="#0F0330" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>¡Pedido Entregado con Éxito!</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Orden #{String(order?.orderNumber || '').padStart(4, '0')}
            </Text>
          </View>

          {/* Rating Section 1: Business */}
          <View style={styles.ratingSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              ¿Cómo fue tu experiencia con <Text style={{ fontWeight: '700' }}>{businessName}</Text>?
            </Text>
            {renderStarSelector(businessRating, setBusinessRating)}
          </View>

          {/* Rating Section 2: Driver */}
          <View style={styles.ratingSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              ¿Cómo calificarías el servicio de <Text style={{ fontWeight: '700' }}>{driverName}</Text>?
            </Text>
            {renderStarSelector(driverRating, setDriverRating)}
          </View>

          {/* Comment */}
          <TextInput
            style={[styles.commentInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
            placeholder="Escribe un comentario sobre tu experiencia (opcional)..."
            placeholderTextColor={colors.textMuted}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={2}
            maxLength={200}
          />

          {/* Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#0F0330" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.submitButtonText}>Enviar Calificación</Text>
                  <Ionicons name="star" size={16} color="#0F0330" style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={onClose}>
              <Text style={[styles.skipButtonText, { color: colors.textMuted }]}>Calificar más tarde</Text>
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FCD116',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starBtn: {
    padding: 4,
  },
  commentInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 60,
    marginBottom: 18,
  },
  footer: {
    gap: 8,
  },
  submitButton: {
    backgroundColor: '#FCD116',
    height: 48,
    borderRadius: 14,
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
  skipButton: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
});
