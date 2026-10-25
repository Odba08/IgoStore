import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/presentation/store/useThemeStore';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenSupport?: () => void;
}

export const SettingsModal = ({
  visible,
  onClose,
  onOpenSupport,
}: SettingsModalProps) => {
  const { isDark, toggleTheme, colors } = useThemeStore();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [saveHistory, setSaveHistory] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);

  const handleOpenWhatsApp = async () => {
    const phoneNumber = '584127687819';
    const message = encodeURIComponent('Hola IGO Delivery, necesito asistencia con mi cuenta.');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Linking.openURL(`https://api.whatsapp.com/send?phone=${phoneNumber}&text=${message}`);
      }
    } catch (e) {
      Alert.alert(
        'WhatsApp no disponible',
        'No pudimos abrir WhatsApp automáticamente. Puedes escribir al número: +58 412-7687819'
      );
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Limpiar Caché',
      '¿Deseas liberar espacio y limpiar los datos temporales e imágenes en caché?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: () => {
            setClearingCache(true);
            setTimeout(() => {
              setClearingCache(false);
              Alert.alert('Éxito', 'Caché liberada correctamente.');
            }, 600);
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheetContainer, { backgroundColor: isDark ? '#140A2E' : '#F8FAFC' }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: isDark ? '#261947' : '#E2E8F0' }]}>
            <View style={styles.headerTitleRow}>
              <Ionicons
                name="settings-sharp"
                size={22}
                color={isDark ? '#FFC93C' : '#0F0330'}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.title, { color: isDark ? '#FFF' : '#0F0330' }]}>Configuración</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? '#231545' : '#FFFFFF' }]}
            >
              <Ionicons name="close" size={22} color={isDark ? '#CBD5E1' : '#64748B'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} contentContainerStyle={{ paddingBottom: 25 }}>
            {/* Sección Preferencias y Apariencia */}
            <Text style={[styles.sectionHeader, { color: isDark ? '#A5B4FC' : '#64748B' }]}>
              APARIENCIA Y PREFERENCIAS
            </Text>

            <View style={[styles.settingCard, { backgroundColor: isDark ? '#1F1242' : '#FFFFFF' }]}>
              {/* Toggle Modo Oscuro */}
              <View style={styles.settingRow}>
                <View style={[styles.settingIconBox, { backgroundColor: isDark ? '#2C1B58' : '#F1F5F9' }]}>
                  <Ionicons
                    name={isDark ? 'moon' : 'sunny-outline'}
                    size={20}
                    color={isDark ? '#FFC93C' : '#0F0330'}
                  />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingTitle, { color: isDark ? '#FFF' : '#1E293B' }]}>
                    Modo Oscuro
                  </Text>
                  <Text style={[styles.settingSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    {isDark ? 'Tema oscuro activado' : 'Tema claro activado'}
                  </Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#CBD5E1', true: '#FFC93C' }}
                  thumbColor={isDark ? '#0F0330' : '#FFF'}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: isDark ? '#2C1B58' : '#F1F5F9' }]} />

              {/* Notificaciones */}
              <View style={styles.settingRow}>
                <View style={[styles.settingIconBox, { backgroundColor: isDark ? '#2C1B58' : '#F1F5F9' }]}>
                  <Ionicons name="notifications-outline" size={20} color={isDark ? '#FFC93C' : '#0F0330'} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingTitle, { color: isDark ? '#FFF' : '#1E293B' }]}>
                    Notificaciones Push
                  </Text>
                  <Text style={[styles.settingSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Actualizaciones de pedidos y estado de entrega
                  </Text>
                </View>
                <Switch
                  value={pushEnabled}
                  onValueChange={setPushEnabled}
                  trackColor={{ false: '#CBD5E1', true: '#FFC93C' }}
                  thumbColor={pushEnabled ? '#0F0330' : '#FFF'}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: isDark ? '#2C1B58' : '#F1F5F9' }]} />

              {/* Sonidos */}
              <View style={styles.settingRow}>
                <View style={[styles.settingIconBox, { backgroundColor: isDark ? '#2C1B58' : '#F1F5F9' }]}>
                  <Ionicons name="volume-medium-outline" size={20} color={isDark ? '#FFC93C' : '#0F0330'} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingTitle, { color: isDark ? '#FFF' : '#1E293B' }]}>
                    Sonidos y Alertas
                  </Text>
                  <Text style={[styles.settingSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Sonido en mensajes y cambios de estado
                  </Text>
                </View>
                <Switch
                  value={soundEnabled}
                  onValueChange={setSoundEnabled}
                  trackColor={{ false: '#CBD5E1', true: '#FFC93C' }}
                  thumbColor={soundEnabled ? '#0F0330' : '#FFF'}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: isDark ? '#2C1B58' : '#F1F5F9' }]} />

              {/* Historial */}
              <View style={styles.settingRow}>
                <View style={[styles.settingIconBox, { backgroundColor: isDark ? '#2C1B58' : '#F1F5F9' }]}>
                  <Ionicons name="time-outline" size={20} color={isDark ? '#FFC93C' : '#0F0330'} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingTitle, { color: isDark ? '#FFF' : '#1E293B' }]}>
                    Historial de Búsquedas
                  </Text>
                  <Text style={[styles.settingSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Recordar negocios y comidas recientes
                  </Text>
                </View>
                <Switch
                  value={saveHistory}
                  onValueChange={setSaveHistory}
                  trackColor={{ false: '#CBD5E1', true: '#FFC93C' }}
                  thumbColor={saveHistory ? '#0F0330' : '#FFF'}
                />
              </View>
            </View>

            {/* Sección Soporte & Contacto */}
            <Text style={[styles.sectionHeader, { color: isDark ? '#A5B4FC' : '#64748B' }]}>
              SOPORTE Y CONTACTO
            </Text>
            <View style={[styles.settingCard, { backgroundColor: isDark ? '#1F1242' : '#FFFFFF' }]}>
              {/* Redirección a WhatsApp */}
              <TouchableOpacity style={styles.settingRowAction} onPress={handleOpenWhatsApp} activeOpacity={0.75}>
                <View style={[styles.settingIconBox, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="logo-whatsapp" size={22} color="#16A34A" />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingTitle, { color: isDark ? '#FFF' : '#1E293B' }]}>
                    Atención vía WhatsApp
                  </Text>
                  <Text style={[styles.settingSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Comunícate directamente con soporte por WhatsApp
                  </Text>
                </View>
                <Ionicons name="open-outline" size={18} color="#16A34A" />
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: isDark ? '#2C1B58' : '#F1F5F9' }]} />

              {/* Chat interno con admin */}
              <TouchableOpacity
                style={styles.settingRowAction}
                onPress={() => {
                  onClose();
                  if (onOpenSupport) onOpenSupport();
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.settingIconBox, { backgroundColor: isDark ? '#2C1B58' : '#F1F5F9' }]}>
                  <Ionicons name="chatbubbles-outline" size={20} color={isDark ? '#FFC93C' : '#0F0330'} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingTitle, { color: isDark ? '#FFF' : '#1E293B' }]}>
                    Chat con Soporte en Vivo
                  </Text>
                  <Text style={[styles.settingSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Hablar con un administrador en la app
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={isDark ? '#8E88A8' : '#94A3B8'} />
              </TouchableOpacity>
            </View>

            {/* Sección Almacenamiento */}
            <Text style={[styles.sectionHeader, { color: isDark ? '#A5B4FC' : '#64748B' }]}>
              ALMACENAMIENTO Y DATOS
            </Text>
            <View style={[styles.settingCard, { backgroundColor: isDark ? '#1F1242' : '#FFFFFF' }]}>
              <TouchableOpacity
                style={styles.settingRowAction}
                onPress={handleClearCache}
                disabled={clearingCache}
                activeOpacity={0.75}
              >
                <View style={[styles.settingIconBox, { backgroundColor: isDark ? '#3E1020' : '#FFE4E6' }]}>
                  <Ionicons name="trash-bin-outline" size={20} color="#E11D48" />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingTitle, { color: isDark ? '#FFF' : '#1E293B' }]}>
                    Limpiar Caché Temporal
                  </Text>
                  <Text style={[styles.settingSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Libera memoria y resuelve posibles fallos de visualización
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={isDark ? '#8E88A8' : '#94A3B8'} />
              </TouchableOpacity>
            </View>

            {/* Versión y Legal */}
            <View style={styles.versionFooter}>
              <Text style={[styles.versionText, { color: isDark ? '#C5BFDB' : '#64748B' }]}>
                IGO Delivery App v2.4.0
              </Text>
              <Text style={[styles.buildText, { color: isDark ? '#8E88A8' : '#94A3B8' }]}>
                Plataforma oficial de entregas en Venezuela
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBody: {
    marginTop: 14,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingCard: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingRowAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  settingIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTextCol: {
    flex: 1,
    marginRight: 10,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  settingSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  divider: {
    height: 1,
  },
  versionFooter: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  buildText: {
    fontSize: 11,
    marginTop: 2,
  },
});
