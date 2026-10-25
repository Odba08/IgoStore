import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/presentation/store/useAuthStore';
import { uploadImage } from '@/infrastructure/services/imageUpload.service';
import { igoApi } from '@/infrastructure/api/igo.api';
import { useThemeStore } from '@/presentation/store/useThemeStore';

interface IdentityVerificationModalProps {
  visible: boolean;
  onClose: () => void;
}

export const IdentityVerificationModal = ({
  visible,
  onClose,
}: IdentityVerificationModalProps) => {
  const { colors, isDark } = useThemeStore();
  const { user, updateUserLocal } = useAuthStore();

  const [cedulaNumber, setCedulaNumber] = useState(user?.cedulaNumber || '');
  const [residenceAddress, setResidenceAddress] = useState(user?.residenceAddress || '');
  const [cedulaUri, setCedulaUri] = useState<string | null>(user?.cedulaPhotoUrl || null);
  const [faceUri, setFaceUri] = useState<string | null>(user?.facePhotoUrl || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const status = user?.identityStatus || 'UNVERIFIED';

  const pickCedulaPhoto = async () => {
    Alert.alert(
      'Foto del Documento',
      'Elige cómo deseas adjuntar la foto de tu Cédula o DNI:',
      [
        {
          text: 'Cámara',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permiso Denegado', 'Se requiere acceso a la cámara.');
              return;
            }
            const res = await ImagePicker.launchCameraAsync({
              quality: 0.8,
              allowsEditing: true,
              aspect: [4, 3],
            });
            if (!res.canceled && res.assets[0]?.uri) {
              setCedulaUri(res.assets[0].uri);
            }
          },
        },
        {
          text: 'Galería',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permiso Denegado', 'Se requiere acceso a la galería.');
              return;
            }
            const res = await ImagePicker.launchImageLibraryAsync({
              quality: 0.8,
              allowsEditing: true,
              aspect: [4, 3],
            });
            if (!res.canceled && res.assets[0]?.uri) {
              setCedulaUri(res.assets[0].uri);
            }
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const pickFacePhoto = async () => {
    Alert.alert(
      'Foto de Rostro (Selfie)',
      'Tómate una foto frontal con buena iluminación donde se vea claramente tu rostro:',
      [
        {
          text: 'Tomar Selfie',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permiso Denegado', 'Se requiere acceso a la cámara.');
              return;
            }
            const res = await ImagePicker.launchCameraAsync({
              cameraType: ImagePicker.CameraType.front,
              quality: 0.8,
              allowsEditing: true,
              aspect: [1, 1],
            });
            if (!res.canceled && res.assets[0]?.uri) {
              setFaceUri(res.assets[0].uri);
            }
          },
        },
        {
          text: 'Elegir de Galería',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permiso Denegado', 'Se requiere acceso a la galería.');
              return;
            }
            const res = await ImagePicker.launchImageLibraryAsync({
              quality: 0.8,
              allowsEditing: true,
              aspect: [1, 1],
            });
            if (!res.canceled && res.assets[0]?.uri) {
              setFaceUri(res.assets[0].uri);
            }
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!cedulaNumber.trim()) {
      Alert.alert('Falta Cédula', 'Por favor ingresa tu número de cédula o documento.');
      return;
    }
    if (!residenceAddress.trim()) {
      Alert.alert('Falta Residencia', 'Por favor ingresa tu dirección de residencia.');
      return;
    }
    if (!cedulaUri) {
      Alert.alert('Falta Foto de Cédula', 'Por favor adjunta la foto legible de tu cédula.');
      return;
    }
    if (!faceUri) {
      Alert.alert('Falta Selfie', 'Por favor tómate una foto de tu rostro para validar tu identidad.');
      return;
    }

    try {
      setIsSubmitting(true);
      let uploadedCedulaUrl = cedulaUri;
      let uploadedFaceUrl = faceUri;

      // Subir foto cédula si es URI local
      if (cedulaUri.startsWith('file:') || cedulaUri.startsWith('content:')) {
        setUploadProgress('Subiendo foto del documento...');
        uploadedCedulaUrl = await uploadImage(cedulaUri, 'cedula_doc.jpg');
      }

      // Subir selfie si es URI local
      if (faceUri.startsWith('file:') || faceUri.startsWith('content:')) {
        setUploadProgress('Subiendo selfie de verificación...');
        uploadedFaceUrl = await uploadImage(faceUri, 'rostro_selfie.jpg');
      }

      setUploadProgress('Guardando información...');

      const payload = {
        cedulaNumber: cedulaNumber.trim(),
        residenceAddress: residenceAddress.trim(),
        cedulaPhotoUrl: uploadedCedulaUrl,
        facePhotoUrl: uploadedFaceUrl,
        identityStatus: 'PENDING',
      };

      await igoApi.patch(`/users/${user?.id}`, payload);
      await updateUserLocal(payload as any);

      Alert.alert(
        '¡Solicitud Enviada!',
        'Tus datos y fotos fueron cargados correctamente. Nuestro equipo validará tu identidad a la brevedad.',
        [{ text: 'Aceptar', onPress: onClose }]
      );
    } catch (err: any) {
      console.error('Error enviando verificación:', err);
      Alert.alert('Error', err?.response?.data?.message || 'No se pudo enviar la verificación.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheetContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="shield-checkmark" size={24} color="#FFC93C" style={{ marginRight: 8 }} />
              <Text style={[styles.title, { color: colors.text }]}>Verificación de Identidad</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} contentContainerStyle={{ paddingBottom: 30 }}>
            {/* Status Card */}
            {status === 'VERIFIED' && (
              <View style={[styles.statusBanner, styles.verifiedBanner]}>
                <Ionicons name="checkmark-circle" size={28} color="#16A34A" />
                <View style={styles.statusTextCol}>
                  <Text style={styles.verifiedTitle}>Cuenta Verificada</Text>
                  <Text style={styles.statusSub}>Tu identidad fue validada con éxito. Tienes acceso completo a pedidos.</Text>
                </View>
              </View>
            )}

            {status === 'PENDING' && (
              <View style={[styles.statusBanner, styles.pendingBanner]}>
                <Ionicons name="time" size={28} color="#D97706" />
                <View style={styles.statusTextCol}>
                  <Text style={styles.pendingTitle}>Verificación en Proceso</Text>
                  <Text style={styles.statusSub}>Tus documentos están siendo revisados por nuestro equipo. Te notificaremos pronto.</Text>
                </View>
              </View>
            )}

            {status === 'UNVERIFIED' && (
              <View style={[styles.statusBanner, styles.unverifiedBanner]}>
                <Ionicons name="information-circle" size={26} color="#4F46E5" />
                <View style={styles.statusTextCol}>
                  <Text style={styles.unverifiedTitle}>Requisito de Seguridad</Text>
                  <Text style={styles.statusSub}>
                    Para garantizar la seguridad de compradores y repartidores, completa los siguientes datos para habilitar tus pedidos.
                  </Text>
                </View>
              </View>
            )}

            {/* Input Cédula */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Número de Cédula o DNI *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="Ej. V-27.123.456"
              placeholderTextColor={colors.textMuted}
              value={cedulaNumber}
              onChangeText={setCedulaNumber}
              editable={!isSubmitting && status !== 'VERIFIED'}
            />

            {/* Input Dirección */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Dirección de Residencia Completa *</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="Ej. Av. Principal, Edificio Los Robles, Apto 4B, Sector Centro"
              placeholderTextColor={colors.textMuted}
              value={residenceAddress}
              onChangeText={setResidenceAddress}
              multiline
              numberOfLines={3}
              editable={!isSubmitting && status !== 'VERIFIED'}
            />

            {/* Upload Cédula */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Foto de la Cédula (Frente) *</Text>
            <TouchableOpacity
              style={[styles.uploadCard, { backgroundColor: isDark ? '#190E38' : '#F8FAFC', borderColor: colors.cardBorder }]}
              onPress={pickCedulaPhoto}
              disabled={isSubmitting || status === 'VERIFIED'}
              activeOpacity={0.8}
            >
              {cedulaUri ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: cedulaUri }} style={styles.previewImage} />
                  <View style={styles.previewOverlay}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    <Text style={styles.previewText}>Documento seleccionado</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="card-outline" size={36} color="#6366F1" />
                  <Text style={[styles.uploadMainText, { color: colors.text }]}>Presiona para subir foto de tu Cédula</Text>
                  <Text style={[styles.uploadSubText, { color: colors.textMuted }]}>Asegúrate de que los datos y la foto sean legibles</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Upload Selfie */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Foto de Rostro / Selfie *</Text>
            <TouchableOpacity
              style={[styles.uploadCard, { backgroundColor: isDark ? '#190E38' : '#F8FAFC', borderColor: colors.cardBorder }]}
              onPress={pickFacePhoto}
              disabled={isSubmitting || status === 'VERIFIED'}
              activeOpacity={0.8}
            >
              {faceUri ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: faceUri }} style={styles.previewImage} />
                  <View style={styles.previewOverlay}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    <Text style={styles.previewText}>Selfie seleccionada</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="person-circle-outline" size={38} color="#6366F1" />
                  <Text style={[styles.uploadMainText, { color: colors.text }]}>Presiona para tomar o subir tu Selfie</Text>
                  <Text style={[styles.uploadSubText, { color: colors.textMuted }]}>Rostro visible de frente, sin gorra ni lentes oscuros</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Submit Button */}
            {status !== 'VERIFIED' && (
              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <View style={styles.submittingRow}>
                    <ActivityIndicator size="small" color="#0F0330" />
                    <Text style={styles.submitBtnText}>{uploadProgress || 'Procesando...'}</Text>
                  </View>
                ) : (
                  <Text style={styles.submitBtnText}>
                    {status === 'PENDING' ? 'Actualizar Documentos' : 'Enviar Verificación'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F0330',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBody: {
    marginTop: 14,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  verifiedBanner: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  pendingBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  unverifiedBanner: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  statusTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  verifiedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#15803D',
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B45309',
  },
  unverifiedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3730A3',
  },
  statusSub: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 65,
    textAlignVertical: 'top',
  },
  uploadCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  uploadPlaceholder: {
    alignItems: 'center',
    padding: 16,
  },
  uploadMainText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 6,
  },
  uploadSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  previewContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  previewText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  submitBtn: {
    backgroundColor: '#FFC93C',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#FFC93C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F0330',
    marginLeft: 8,
  },
});
