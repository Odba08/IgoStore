import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F0330" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Política de Privacidad</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdate}>Última actualización: 27 de octubre de 2026</Text>

        <Text style={styles.paragraph}>
          En <Text style={styles.bold}>IGO Delivery</Text> respetamos tu privacidad y nos comprometemos a proteger los datos personales que compartes con nosotros a través de nuestra aplicación móvil.
        </Text>

        <Text style={styles.sectionTitle}>1. Información que recopilamos</Text>
        <Text style={styles.paragraph}>
          Para prestar nuestros servicios de entrega a domicilio, encomiendas y traslados, recopilamos:
        </Text>
        <Text style={styles.bullet}>• <Text style={styles.bold}>Datos de cuenta:</Text> Nombre completo, correo electrónico y número de teléfono proporcionados al registrarte.</Text>
        <Text style={styles.bullet}>• <Text style={styles.bold}>Ubicación geográfica:</Text> Datos de ubicación precisa y aproximada (GPS) para mostrarte comercios cercanos, calcular rutas y tarifas viales, y permitir el seguimiento en tiempo real de tu repartidor o conductor.</Text>
        <Text style={styles.bullet}>• <Text style={styles.bold}>Imágenes y Cámara:</Text> Fotografías de comprobantes de pago móvil o transferencias que adjuntas voluntariamente para validar tus compras, así como documentos de identidad si solicitas verificación.</Text>
        <Text style={styles.bullet}>• <Text style={styles.bold}>Notificaciones:</Text> Tokens de notificación push para informarte sobre el estado de tus pedidos y mensajes de soporte.</Text>

        <Text style={styles.sectionTitle}>2. Uso de la información</Text>
        <Text style={styles.paragraph}>
          Utilizamos tu información exclusivamente para:
        </Text>
        <Text style={styles.bullet}>• Procesar, gestionar y entregar tus pedidos de productos, encomiendas o traslados.</Text>
        <Text style={styles.bullet}>• Conectar a clientes con comercios asociados y conductores/repartidores asignados.</Text>
        <Text style={styles.bullet}>• Validar pagos y emitir comprobantes de servicio.</Text>
        <Text style={styles.bullet}>• Brindar asistencia y soporte en tiempo real.</Text>

        <Text style={styles.sectionTitle}>3. Uso de la ubicación en segundo plano</Text>
        <Text style={styles.paragraph}>
          La aplicación utiliza tu ubicación en primer plano para calcular el origen y destino del servicio. Para repartidores y conductores activos, se requiere acceso a la ubicación para guiar la ruta y mantener al cliente informado del trayecto. No compartimos tu ubicación con terceros con fines publicitarios.
        </Text>

        <Text style={styles.sectionTitle}>4. Seguridad de tus datos</Text>
        <Text style={styles.paragraph}>
          Todas las comunicaciones entre la aplicación móvil y nuestros servidores se realizan a través de conexiones cifradas seguras (HTTPS / TLS). Tus contraseñas se almacenan mediante algoritmos criptográficos irreversibles (hashing).
        </Text>

        <Text style={styles.sectionTitle}>5. Eliminación de cuenta y datos personales</Text>
        <Text style={styles.paragraph}>
          Tienes el derecho en todo momento de solicitar la eliminación definitiva de tu cuenta y todos tus datos personales asociados. Puedes hacerlo directamente desde la aplicación en <Text style={styles.bold}>Mi Perfil &gt; Eliminar mi cuenta</Text>, o escribiendo a nuestro canal de soporte. Al confirmar, tu cuenta y registros personales serán eliminados permanentemente de nuestras bases de datos.
        </Text>

        <Text style={styles.sectionTitle}>6. Contacto</Text>
        <Text style={styles.paragraph}>
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
