import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useThemeStore } from '@/presentation/store/useThemeStore';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { colors, isDark } = useThemeStore();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Política de Privacidad</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.lastUpdate, { color: colors.textMuted }]}>Última actualización: 27 de octubre de 2026</Text>

        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          En <Text style={[styles.bold, { color: colors.text }]}>IGO Delivery</Text> respetamos tu privacidad y nos comprometemos a proteger los datos personales que compartes con nosotros a través de nuestra aplicación móvil.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Información que recopilamos</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Para prestar nuestros servicios de entrega a domicilio, encomiendas y traslados, recopilamos:
        </Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• <Text style={[styles.bold, { color: colors.text }]}>Datos de cuenta:</Text> Nombre completo, correo electrónico y número de teléfono proporcionados al registrarte.</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• <Text style={[styles.bold, { color: colors.text }]}>Ubicación geográfica:</Text> Datos de ubicación precisa y aproximada (GPS) para mostrarte comercios cercanos, calcular rutas y tarifas viales, y permitir el seguimiento en tiempo real de tu repartidor o conductor.</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• <Text style={[styles.bold, { color: colors.text }]}>Imágenes y Cámara:</Text> Fotografías de comprobantes de pago móvil o transferencias que adjuntas voluntariamente para validar tus compras, así como documentos de identidad si solicitas verificación.</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• <Text style={[styles.bold, { color: colors.text }]}>Notificaciones:</Text> Tokens de notificación push para informarte sobre el estado de tus pedidos y mensajes de soporte.</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Uso de la información</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Utilizamos tu información exclusivamente para:
        </Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Procesar, gestionar y entregar tus pedidos de productos, encomiendas o traslados.</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Conectar a clientes con comercios asociados y conductores/repartidores asignados.</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Validar pagos y emitir comprobantes de servicio.</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Brindar asistencia y soporte en tiempo real.</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Uso de la ubicación en segundo plano</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          La aplicación utiliza tu ubicación en primer plano para calcular el origen y destino del servicio. Para repartidores y conductores activos, se requiere acceso a la ubicación para guiar la ruta y mantener al cliente informado del trayecto. No compartimos tu ubicación con terceros con fines publicitarios.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Seguridad de tus datos</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Todas las comunicaciones entre la aplicación móvil y nuestros servidores se realizan a través de conexiones cifradas seguras (HTTPS / TLS). Tus contraseñas se almacenan mediante algoritmos criptográficos irreversibles (hashing).
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Eliminación de cuenta y datos personales</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Tienes el derecho en todo momento de solicitar la eliminación definitiva de tu cuenta y todos tus datos personales asociados. Puedes hacerlo directamente desde la aplicación en <Text style={[styles.bold, { color: colors.text }]}>Mi Perfil &gt; Eliminar mi cuenta</Text>, o escribiendo a nuestro canal de soporte. Al confirmar, tu cuenta y registros personales serán eliminados permanentemente de nuestras bases de datos.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>6. Contacto</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Si tienes preguntas sobre nuestra política de privacidad, puedes contactarnos a través del chat de soporte en vivo de la aplicación o por correo electrónico a soporte@igostore.com.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F0330',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  lastUpdate: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F0330',
    marginTop: 20,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
    marginBottom: 10,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
    marginBottom: 6,
    paddingLeft: 8,
  },
  bold: {
    fontWeight: '700',
    color: '#0F0330',
  },
});
