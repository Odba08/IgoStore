import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePermissionsStore } from '@/presentation/store/usePermissions';
import { PermissionStatus } from '@/core/entities/location.entity';
import { useLocationStore } from '@/presentation/store/useLocationStore';

const PermissionScreen = () => {
  const router = useRouter();
  const { locationStatus, requestLocationPermission } = usePermissionsStore();
  const getLocation = useLocationStore((state) => state.getLocation);
  const [isLoading, setIsLoading] = useState(false);

  const handleRequest = async () => {
    setIsLoading(true);
    try {
      const status = await requestLocationPermission();
      if (status === PermissionStatus.GRANTED) {
        // Obtenemos ubicación actual en el store
        await getLocation();
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      }
    } catch (e) {
      console.warn('Error solicitando permisos:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  const handleContinueManual = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const isDenied = locationStatus === PermissionStatus.DENIED;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9faeeff" />

      {/* Header con botón de volver */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleContinueManual}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color="#111" />
        </TouchableOpacity>
      </View>

      {/* Contenido Central */}
      <View style={styles.content}>
        <View style={styles.iconCircleOuter}>
          <View style={styles.iconCircleInner}>
            <Ionicons name="location" size={48} color="#000" />
          </View>
        </View>

        <Text style={styles.title}>Habilitar Ubicación</Text>
        <Text style={styles.description}>
          Para mostrarte los negocios más cercanos, calcular la tarifa exacta de
          delivery y permitirte rastrear a tu repartidor en tiempo real, IGO
          necesita acceso a tu ubicación.
        </Text>

        {isDenied && (
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#b45309" style={{ marginRight: 8 }} />
            <Text style={styles.warningText}>
              El permiso de ubicación fue denegado. Para activarlo, abre los
              ajustes de tu teléfono.
            </Text>
          </View>
        )}
      </View>

      {/* Botones de Acción */}
      <View style={styles.footer}>
        {isDenied ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleOpenSettings}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={20} color="#000" style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>Abrir Configuración</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, isLoading && { opacity: 0.8 }]}
            onPress={handleRequest}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="navigate-outline" size={20} color="#000" style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>Permitir Ubicación</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleContinueManual}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>
            Elegir dirección en el mapa / Continuar
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9faeeff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconCircleOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(252, 209, 22, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircleInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FCD116',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#FCD116',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 14,
  },
  description: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 30,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#FCD116',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PermissionScreen;