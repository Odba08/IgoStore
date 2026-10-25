import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { useAuthStore } from '@/presentation/store/useAuthStore';
import { validateRealEmail } from '@/presentation/utils/emailValidator';
import { wakeUpBackend } from '@/infrastructure/api/igo.api';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Campos Incompletos', 'Por favor llena todos los campos obligatorios.');
      return;
    }

    const emailValidation = validateRealEmail(email);
    if (!emailValidation.valid) {
      Alert.alert('Correo Inválido', emailValidation.error || 'Por favor ingresa un correo real.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Contraseña Corta', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Contraseñas no coinciden', 'Por favor verifica que ambas contraseñas sean idénticas.');
      return;
    }

    try {
      setIsSubmitting(true);
      wakeUpBackend();
      const success = await register(
        email.trim().toLowerCase(),
        password,
        fullName.trim(),
        phone.trim() || undefined
      );

      if (success) {
        Alert.alert('¡Bienvenido a IGO!', 'Tu cuenta ha sido creada exitosamente.', [
          { text: 'Comenzar', onPress: () => router.replace('/') },
        ]);
      } else {
        Alert.alert(
          'Error al registrarse',
          'No se pudo completar el registro. Verifica si este correo ya se encuentra registrado.'
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Ocurrió un error inesperado al registrar tu cuenta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* === FONDO DINÁMICO EN LOOP (MAPA + RUTA GPS) === */}
      <LottieView
        source={require('../assets/igo-login-bg.json')}
        autoPlay
        loop
        style={styles.bgLottie}
        resizeMode="cover"
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top + 8, 20),
              paddingBottom: Math.max(insets.bottom + 16, 28),
            },
          ]}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Bar: Botón Atrás */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.75}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Icono animado superior */}
          <View style={styles.topIconSection}>
            <LottieView
              source={require('../assets/igo-login-icon.json')}
              autoPlay
              loop
              style={styles.iconLottie}
              resizeMode="contain"
            />
          </View>

          {/* Encabezado */}
          <View style={styles.headerTextContainer}>
            <Text style={styles.tagline}>CREA TU CUENTA</Text>
            <Text style={styles.headline}>Únete a IGO,{"\n"}comienza hoy.</Text>
          </View>

          {/* Formulario */}
          <View style={styles.formContainer}>
            {/* Input: Nombre Completo */}
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#8E88A8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nombre Completo"
                placeholderTextColor="#6D6789"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>

            {/* Input: Correo Electrónico */}
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#8E88A8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="tu@correo.com"
                placeholderTextColor="#6D6789"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Input: Teléfono / WhatsApp */}
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color="#8E88A8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Teléfono / WhatsApp (Opcional)"
                placeholderTextColor="#6D6789"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            {/* Input: Contraseña */}
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#8E88A8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Contraseña (mínimo 6 caracteres)"
                placeholderTextColor="#6D6789"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#8E88A8"
                />
              </TouchableOpacity>
            </View>

            {/* Input: Confirmar Contraseña */}
            <View style={styles.inputWrapper}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#8E88A8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirma tu contraseña"
                placeholderTextColor="#6D6789"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#8E88A8"
                />
              </TouchableOpacity>
            </View>

            {/* Botón Principal: Registrarme */}
            <TouchableOpacity
              style={[styles.mainButton, isSubmitting && { opacity: 0.85 }]}
              onPress={handleRegister}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <View style={styles.loadingButtonContent}>
                  <ActivityIndicator size="small" color="#0F0330" />
                  <Text style={styles.mainButtonText}>Creando tu cuenta...</Text>
                </View>
              ) : (
                <Text style={styles.mainButtonText}>Crear mi cuenta</Text>
              )}
            </TouchableOpacity>

            {/* Separador */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o regístrate con</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Botones Sociales */}
            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => Alert.alert('Google', 'Usa el botón de Google en el Inicio de Sesión para registrarte automáticamente.')}
                activeOpacity={0.75}
              >
                <Ionicons name="logo-google" size={22} color="#EA4335" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => Alert.alert('Apple', 'Inicio con Apple ID disponible en iOS.')}
                activeOpacity={0.75}
              >
                <Ionicons name="logo-apple" size={24} color="#000000" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => Alert.alert('Facebook', 'Registro con Facebook próximamente disponible.')}
                activeOpacity={0.75}
              >
                <Ionicons name="logo-facebook" size={24} color="#1877F2" />
              </TouchableOpacity>
            </View>

            {/* Footer: Ya tengo cuenta */}
            <TouchableOpacity
              style={styles.loginContainer}
              onPress={() => router.replace('/login')}
              activeOpacity={0.7}
            >
              <Text style={styles.loginText}>
                ¿Ya tienes una cuenta? <Text style={styles.loginTextBold}>Inicia sesión</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0330',
  },
  bgLottie: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  scrollContent: {
    flexGrow: 1,
  },
  topBar: {
    paddingHorizontal: 24,
    zIndex: 2,
    marginBottom: 4,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topIconSection: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    height: 110,
    marginTop: 0,
  },
  iconLottie: {
    width: 120,
    height: 120,
  },
  headerTextContainer: {
    paddingHorizontal: 28,
    marginTop: 6,
    zIndex: 1,
  },
  tagline: {
    color: '#FFC93C',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  formContainer: {
    paddingHorizontal: 28,
    marginTop: 18,
    zIndex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(22, 13, 48, 0.65)',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    height: '100%',
  },
  mainButton: {
    backgroundColor: '#FFC93C',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFC93C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    marginTop: 8,
  },
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mainButtonText: {
    color: '#0F0330',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  dividerText: {
    color: '#8E88A8',
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 14,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
  },
  socialBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  loginContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  loginText: {
    color: '#C5BFDB',
    fontSize: 14,
  },
  loginTextBold: {
    color: '#FFC93C',
    fontWeight: '700',
  },
});
