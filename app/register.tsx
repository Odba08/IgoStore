import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, 
  Image, KeyboardAvoidingView, Platform, ScrollView, Dimensions, ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/presentation/store/useAuthStore';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuthStore();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    // Validaciones básicas en el cliente
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Atención', 'Por favor completa todos los campos.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Atención', 'Por favor ingresa un correo electrónico válido.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Atención', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Atención', 'Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    const success = await register(email.trim().toLowerCase(), password, fullName.trim());
    setIsSubmitting(false);

    if (success) {
      Alert.alert('Éxito', '¡Cuenta creada correctamente!', [
        { text: 'Comenzar', onPress: () => router.replace('/') }
      ]);
    } else {
      Alert.alert('Error', 'No se pudo crear la cuenta. Verifica si el correo ya está registrado.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        
        {/* === BLOQUE SUPERIOR: BRANDING Y FONDO === */}
        <View style={styles.topSection}>
          <Image 
            source={require('../assets/images/fondo1.jpg')} 
            style={styles.bgTexture} 
            resizeMode="cover"
          />
          
          {/* Botón para volver atrás */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>

          {/* Logo Principal */}
          <Image 
            source={require('../assets/images/logo.jpg')} 
            style={styles.logo} 
            resizeMode="contain"
          />
          
          <Text style={styles.appName}>IGO APP</Text>
          <Text style={styles.appSubtitle}>Crea tu cuenta para comenzar</Text>
        </View>

        {/* === BLOQUE INFERIOR: FORMULARIO === */}
        <View style={styles.bottomCard}>
          <Text style={styles.greeting}>Registrarse</Text>

          {/* INPUT: NOMBRE COMPLETO */}
          <View style={styles.inputWrapper}>
            <Ionicons name="person" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nombre Completo"
              placeholderTextColor="#94A3B8"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          {/* INPUT: EMAIL */}
          <View style={styles.inputWrapper}>
            <Ionicons name="mail" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Correo Electrónico"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* INPUT: CONTRASEÑA */}
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña (mín. 6 caracteres)"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* INPUT: CONFIRMAR CONTRASEÑA */}
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirmar Contraseña"
              placeholderTextColor="#94A3B8"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* BOTÓN PRINCIPAL */}
          <TouchableOpacity 
            style={styles.mainButton} 
            onPress={handleRegister}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.mainButtonText}>Crear Cuenta</Text>
            )}
          </TouchableOpacity>

          {/* VOLVER AL LOGIN */}
          <TouchableOpacity 
            style={styles.loginLink} 
            onPress={() => router.back()}
          >
            <Text style={styles.loginLinkText}>
              ¿Ya tienes una cuenta? <Text style={{ fontWeight: 'bold', color: '#1A1A1A' }}>Inicia Sesión</Text>
            </Text>
          </TouchableOpacity>

        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFDB58' },
  scrollContent: { flexGrow: 1 },
  
  // --- TOP SECTION ---
  topSection: {
    height: Dimensions.get('window').height * 0.40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingTop: 40,
  },
  bgTexture: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  logo: { 
    width: 100, 
    height: 100, 
    marginBottom: 10, 
    borderRadius: 25 
  },
  appName: { fontSize: 28, fontWeight: '800', color: '#1A1A1A', letterSpacing: 0.5 },
  appSubtitle: { fontSize: 14, color: '#475569', marginTop: 4, fontWeight: '500' },

  // --- BOTTOM CARD ---
  bottomCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 30,
    paddingTop: 30,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.05,
    elevation: 10,
  },
  greeting: { fontSize: 22, fontWeight: 'bold', color: 'black', textAlign: 'center', marginBottom: 25 },

  // --- INPUTS ---
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 25,
    paddingHorizontal: 20,
    height: 55,
    marginBottom: 15,
    backgroundColor: '#FFF',
  },
  inputIcon: { marginRight: 15 },
  input: { flex: 1, fontSize: 15, color: '#1E293B', height: '100%' },

  // --- BUTTON ---
  mainButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 25,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    shadowColor: "#1A1A1A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  mainButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // --- FOOTER LINK ---
  loginLink: {
    marginTop: 25,
    alignItems: 'center',
    paddingVertical: 5,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#64748B',
  },
});
