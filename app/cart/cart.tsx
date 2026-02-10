import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Linking, Alert, TextInput 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCartStore } from '../../src/presentation/store/useCartStore';

const CartScreen = () => {
  const router = useRouter();

  const { items, clearCart, removeItem } = useCartStore();
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  
  // 1. Estados logísticos (CORREGIDO: Ambos estados declarados)
  const [personalData, setPersonalData] = useState('');
  const [addressNotes, setAddressNotes] = useState('');
  
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = 2.00;
  const total = subtotal + delivery;

  const handleCheckout = async () => {
    // 2. Defensa táctica
    if (items.length === 0) {
      Alert.alert("Carrito Vacío", "Agrega productos al carrito antes de proceder al pago.", [{ text: "OK" }]);
      return;
    }

    if (personalData.trim().length === 0) {
      Alert.alert("Falta Información", "Por favor ingresa tus datos personales para el contacto.", [{ text: "Entendido" }]);
      return;
    }

    if (addressNotes.trim().length === 0) {
      Alert.alert("Falta Información", "Por favor ingresa tu dirección de entrega para el envío.", [{ text: "Entendido" }]);
      return;
    }

    // 3. Construcción del recibo (CORREGIDO: Datos personales incluidos)
    let message = `*NUEVO PEDIDO* 🛒\n\n`;

    items.forEach((item) => {
        message += `▪️ ${item.quantity}x ${item.title} - $${(item.price * item.quantity).toFixed(2)}\n`;
    });

    message += `\n*Datos del Cliente:* ${personalData.trim()}`;
    message += `\n*Dirección / Notas:* ${addressNotes.trim()}\n`;
    
    message += `\n*Subtotal:* $${subtotal.toFixed(2)}`;
    message += `\n*Envío:* $${delivery.toFixed(2)}`;
    message += `\n*TOTAL A PAGAR:* $${total.toFixed(2)}\n\n`;
    message += `Hola, me gustaría confirmar este pedido.`;

    const phoneNumber = "573014215155";
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

   try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        
        // 4. Reseteo del ciclo
        clearCart(); 
        setPersonalData(''); // Limpiamos el input de datos
        setAddressNotes(''); // Limpiamos el input de dirección
        router.push('/'); 
        
      } else {
        Alert.alert("Error", "Parece que no tienes WhatsApp instalado en este dispositivo.");
      }
    } catch (error) {
      Alert.alert("Error", "Hubo un problema al intentar abrir WhatsApp.");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Carrito</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" 
      >
        {items.map((item) => (
          <View key={item.id} style={styles.cartItem}>
            <Image source={{ uri: item.image }} style={styles.itemImage} />
            <View style={styles.itemDetails}>
              <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
            </View>
            
            {/* NUEVO: Contenedor de Acciones (Cantidad + Papelera) */}
            <View style={styles.actionContainer}>
              <View style={styles.quantityControls}>
                <TouchableOpacity style={styles.controlBtn} onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                  <Ionicons name="remove" size={18} color="#000" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{item.quantity}</Text>
                <TouchableOpacity style={styles.controlBtn} onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                  <Ionicons name="add" size={18} color="#000" />
                </TouchableOpacity>
              </View>

              {/* EL BOTÓN DE EXTERMINIO */}
              <TouchableOpacity style={styles.deleteBtn} onPress={() => removeItem(item.id)}>
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>

          </View>
        ))}

        {/* DATOS PERSONALES */}
        {items.length > 0 && (
          <View style={styles.inputContainer}>
            <Text style={styles.inputTitle}>Datos de Contacto</Text>
            <TextInput
              style={[styles.textInput, { minHeight: 60 }]} // Un poco más bajo que el de dirección
              placeholder="Nombre y número de teléfono"
              placeholderTextColor="#999"
              multiline={false} // Mejor que sea una línea simple o dos máximo
              value={personalData}
              onChangeText={setPersonalData}
            />
          </View>
        )}

        {/* DIRECCIÓN DE ENTREGA */}
        {items.length > 0 && (
          <View style={styles.inputContainer}>
            <Text style={styles.inputTitle}>Dirección de entrega</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej: Calle 123, casa verde. Sin cebolla por favor."
              placeholderTextColor="#999"
              multiline={true}
              numberOfLines={3}
              value={addressNotes}
              onChangeText={setAddressNotes}
            />
          </View>
        )}

        {/* RESUMEN DE PAGO */}
        {items.length > 0 && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Resumen de Pago</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Envío</Text>
              <Text style={styles.summaryValue}>${delivery.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* BOTÓN DE PAGO */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.checkoutBtn, items.length === 0 && { backgroundColor: '#E0E0E0' }]} 
          onPress={handleCheckout}
          disabled={items.length === 0}
        >
          <Text style={styles.checkoutBtnText}>
            {items.length === 0 ? "Carrito Vacío" : "Proceder al Pago"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  customHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  scrollContent: { padding: 20, paddingBottom: 130, backgroundColor: '#F2F4F7', flexGrow: 1 },
  cartItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  itemImage: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#EEE' },
  itemDetails: { flex: 1, marginLeft: 15 },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  itemPrice: { fontSize: 15, fontWeight: '600', color: '#27AE60' },
  quantityControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 5, paddingVertical: 5 },
  controlBtn: { backgroundColor: '#FFF', borderRadius: 15, padding: 5, shadowColor: '#000', shadowOpacity: 0.1, elevation: 1 },
  quantityText: { marginHorizontal: 12, fontSize: 16, fontWeight: 'bold' },
  
  // Estilos del Input
  inputContainer: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  inputTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 10 },
  textInput: { backgroundColor: '#F9F9F9', borderRadius: 10, padding: 15, fontSize: 15, color: '#333', minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#EEE' },

  summaryContainer: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#1A1A1A' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 15, color: '#666' },
  summaryValue: { fontSize: 15, fontWeight: '500', color: '#333' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 15, marginTop: 5 },
  totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#27AE60' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', padding: 20, borderTopWidth: 1, borderTopColor: '#EEE' },
  checkoutBtn: { backgroundColor: '#FFDB58', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  checkoutBtnText: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
  // Añade estos estilos debajo de quantityText:
  actionContainer: { flexDirection: 'row', alignItems: 'center' },
  deleteBtn: { marginLeft: 12, padding: 6, backgroundColor: '#FFE5E5', borderRadius: 8 },
});

export default CartScreen;