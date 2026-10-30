import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F0330" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Términos y Condiciones</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdate}>Última actualización: 27 de octubre de 2026</Text>

        <Text style={styles.paragraph}>
          Bienvenido a <Text style={styles.bold}>IGO Delivery</Text>. Al descargar, registrarte o utilizar nuestra aplicación móvil, aceptas cumplir con los siguientes términos y condiciones de uso.
        </Text>

        <Text style={styles.sectionTitle}>1. Naturaleza del Servicio</Text>
        <Text style={styles.paragraph}>
          IGO Delivery es una plataforma tecnológica que conecta a usuarios consumidores con comercios locales (restaurantes, farmacias, tiendas) y prestadores independientes de servicios de transporte, logística y mensajería (repartidores y conductores).
        </Text>

        <Text style={styles.sectionTitle}>2. Cuentas de Usuario</Text>
        <Text style={styles.paragraph}>
          El usuario es responsable de mantener la confidencialidad de sus credenciales de acceso y de toda actividad realizada desde su cuenta. Nos reservamos el derecho de suspender cuentas que proporcionen información falsa o hagan mal uso del servicio.
        </Text>

        <Text style={styles.sectionTitle}>3. Pedidos, Tarifas y Pagos</Text>
        <Text style={styles.paragraph}>
          Los precios de los productos son fijados por cada comercio afiliado. Las tarifas de envío se calculan dinámicamente con base en la distancia y el tipo de transporte seleccionado. Los métodos de pago aceptados incluyen pago móvil, transferencias bancarias y efectivo directo al conductor según el tipo de servicio. El usuario se compromete a adjuntar comprobantes de pago legítimos.
        </Text>

        <Text style={styles.sectionTitle}>4. Cancelaciones y Reembolsos</Text>
        <Text style={styles.paragraph}>
          Las cancelaciones de pedidos de comida solo pueden solicitarse antes de que el restaurante inicie la preparación de los alimentos. Para encomiendas y traslados, aplican las políticas de cancelación antes de que el conductor llegue al punto de recogida.
        </Text>

        <Text style={styles.sectionTitle}>5. Modificaciones</Text>
        <Text style={styles.paragraph}>
          Nos reservamos el derecho de actualizar estos términos en cualquier momento. Las modificaciones entrarán en vigencia desde su publicación en la aplicación.
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
  bold: {
    fontWeight: '700',
    color: '#0F0330',
  },
});
