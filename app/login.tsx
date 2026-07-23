import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, 
  Image, KeyboardAvoidingView, Platform, ScrollView, Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/presentation/store/useAuthStore';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  
  const [email, setEmail] = useState('oscar@igo.com'); 
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Atención', 'Por favor ingresa email y contraseña.');
      return;
    }
    setIsSubmitting(true);
    const success = await login(email, password);
    setIsSubmitting(false);
    if (success) {
      router.replace('/'); 
    } else {
      Alert.alert('Error', 'Credenciales incorrectas o servidor no disponible.');
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
          {/* Imagen de textura transparente que solicitaste */}
          <Image 
            source={require('../assets/images/fondo1.jpg')} // Cambia el nombre por tu textura real
            style={styles.bgTexture} 
            resizeMode="cover"
          />
          
          {/* Logo Principal */}
          <Image 
     source={require('../assets/images/logo.jpg')} // Pon aquí tu archivo
     style={{ width: 120, height: 120, marginBottom: 15, borderRadius: 30}} 
     resizeMode="contain"
  />
  
  {/* Si quieres que diga Igo Lat debajo de la imagen */}
  <Text style={styles.appName}>Igo Lat</Text>
</View>
    

        {/* === BLOQUE INFERIOR: TARJETA BLANCA DE FORMULARIO === */}
        <View style={styles.bottomCard}>
          <Text style={styles.greeting}>¡Realiza tus encomiendas!</Text>

          {/* INPUT: EMAIL */}
          <View style={styles.inputWrapper}>
            <Ionicons name="person" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email o Usuario"
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
              placeholder="Contraseña"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            {/* Toggle de visibilidad de contraseña (basado en tu maqueta) */}
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* BOTÓN PRINCIPAL */}
          <TouchableOpacity style={styles.mainButton} onPress={handleLogin}>
            <Text style={styles.mainButtonText}>Iniciar Sesión</Text>
          </TouchableOpacity>

          {/* SEPARADOR LÓGICO */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* BOTONES SOCIALES (Estética geométrica de la maqueta) */}
          <View style={styles.socialContainer}>
             <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#EF4444' }]}>
                <Ionicons name="logo-google" size={20} color="#FFF" />
             </TouchableOpacity>
             <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#F59E0B' }]}>
                <Ionicons name="logo-apple" size={20} color="#FFF" />
             </TouchableOpacity>
             <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#3B82F6' }]}>
                <Ionicons name="logo-facebook" size={20} color="#FFF" />
             </TouchableOpacity>
          </View>

          <Text style={styles.footerText}>
            Inicia sesión con tu <Text style={{fontWeight: 'bold', color: '#1A1A1A'}}>red social</Text>
          </Text>

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
    height: Dimensions.get('window').height * 0.45, // Ocupa el 45% de la pantalla
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bgTexture: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.1, // Esto le da el aspecto "transparentoso" que pediste
  },
  logoContainer: {
    width: 90, height: 90,
    backgroundColor: '#FFF',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 15,
  },
  appName: { fontSize: 28, fontWeight: '800', color: '#1A1A1A', letterSpacing: 0.5 },

  // --- BOTTOM CARD ---
  bottomCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.05,
    elevation: 10,
  },
  greeting: { fontSize: 24, fontWeight: 'bold', color: 'black', textAlign: 'center', marginBottom: 30 },

  // --- INPUTS ---
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 25, // Forma de píldora
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

  // --- SEPARATORS ---
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 25 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { marginHorizontal: 15, color: '#94A3B8', fontSize: 14 },

  // --- SOCIALS ---
  socialContainer: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginBottom: 20 },
  socialBtn: {
    width: 50, height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    elevation: 3,
  },
  footerText: { textAlign: 'center', color: '#64748B', fontSize: 13, marginTop: 10 },
});