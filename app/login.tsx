import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, 
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Animated, Modal
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/presentation/store/useAuthStore';
import { igoApi, wakeUpBackend, subscribeServerStatus } from '@/infrastructure/api/igo.api';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, loginWithGoogle } = useAuthStore();
  
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSlowWakeUp, setIsSlowWakeUp] = useState(false);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'waking' | 'ready'>('unknown');

  // Estados para recuperación de contraseña con código
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Animación de entrada (Intro Splash)
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const splashDismissedRef = useRef(false);

  const handleFinishSplash = () => {
    if (splashDismissedRef.current) return;
    splashDismissedRef.current = true;
    Animated.timing(splashOpacity, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      setShowSplash(false);
    });
  };

  useEffect(() => {
    wakeUpBackend();
    const unsubscribe = subscribeServerStatus(setServerStatus);

    // Fallback de seguridad para terminar la animación de entrada si no dispara onAnimationFinish
    const fallbackTimer = setTimeout(() => {
      handleFinishSplash();
    }, 4500);

    return () => {
      unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Configuración de Google OAuth en Expo
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', 
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        handleGoogleLogin(id_token);
      }
    }
  }, [response]);

  const handleGoogleLogin = async (idToken: string) => {
    setIsSubmitting(true);
    const success = await loginWithGoogle(idToken);
    setIsSubmitting(false);
    if (success) {
      router.replace('/');
    } else {
      Alert.alert('Error', 'No se pudo iniciar sesión con Google.');
    }
  };

  const handleAppleLogin = () => {
    Alert.alert('Inicio con Apple', 'El inicio de sesión con Apple ID se activará en tu dispositivo Apple.');
  };

  const handleFacebookLogin = () => {
    Alert.alert('Inicio con Facebook', 'El inicio de sesión con Facebook estará disponible próximamente.');
  };

  const handleForgotPassword = () => {
    setForgotEmail(email.trim().toLowerCase());
    setForgotCode('');
    setForgotNewPass('');
    setForgotConfirmPass('');
    setForgotStep(1);
    setShowForgotModal(true);
  };

  const handleRequestResetCode = async () => {
    if (!forgotEmail.trim()) {
      Alert.alert('Atención', 'Por favor ingresa tu correo electrónico.');
      return;
    }
    try {
      setForgotLoading(true);
      const res = await igoApi.post('/auth/forgot-password', { email: forgotEmail.trim().toLowerCase() });
      Alert.alert(
        'Código Enviado',
        res.data?.message || 'Hemos generado y enviado un código de 6 dígitos a tu correo.',
        [{ text: 'Ingresar Código', onPress: () => setForgotStep(2) }]
      );
      setForgotStep(2);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo enviar el código. Intenta de nuevo.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleConfirmResetPassword = async () => {
    if (!forgotCode.trim() || !forgotNewPass.trim() || !forgotConfirmPass.trim()) {
      Alert.alert('Campos Incompletos', 'Por favor ingresa el código de 6 dígitos y tu nueva contraseña.');
      return;
    }
    if (forgotNewPass.length < 6) {
      Alert.alert('Contraseña Corta', 'La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    try {
      setForgotLoading(true);
      const res = await igoApi.post('/auth/reset-password', {
        email: forgotEmail.trim().toLowerCase(),
        code: forgotCode.trim(),
        newPassword: forgotNewPass.trim(),
      });

      Alert.alert('¡Éxito!', res.data?.message || 'Tu contraseña ha sido actualizada con éxito.');
      setEmail(forgotEmail.trim().toLowerCase());
      setPassword(forgotNewPass.trim());
      setShowForgotModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Código incorrecto o expirado.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Atención', 'Por favor ingresa email y contraseña.');
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    setIsSlowWakeUp(false);
    const slowTimer = setTimeout(() => setIsSlowWakeUp(true), 4000);

    try {
      const success = await login(email.trim().toLowerCase(), password);
      if (success) {
        router.replace('/'); 
      } else {
        Alert.alert('Error', 'Credenciales incorrectas o el servidor está tardando en responder. Intenta de nuevo.');
      }
    } finally {
      clearTimeout(slowTimer);
      setIsSubmitting(false);
      setIsSlowWakeUp(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* === ANIMACIÓN DE ENTRADA (SPLASH) === */}
      {showSplash && (
        <Animated.View 
          style={[
            styles.splashOverlay, 
            { opacity: splashOpacity }
          ]} 
          pointerEvents={splashDismissedRef.current ? 'none' : 'auto'}
        >
          <LottieView
            source={require('../assets/igo-splash.json')}
            autoPlay
            loop={false}
            speed={1.25}
            onAnimationFinish={handleFinishSplash}
            onAnimationFailure={() => handleFinishSplash()}
            renderMode={Platform.OS === 'android' ? 'HARDWARE' : 'AUTOMATIC'}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <TouchableOpacity 
            style={[styles.skipSplashBtn, { top: Math.max(insets.top + 10, 40) }]}
            onPress={handleFinishSplash}
            activeOpacity={0.7}
          >
            <Text style={styles.skipSplashText}>Omitir</Text>
            <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* === FONDO DINÁMICO EN LOOP (MAPA + RUTA GPS) === */}
      <LottieView
        source={require('../assets/igo-login-bg.json')}
        autoPlay
        loop
        renderMode={Platform.OS === 'android' ? 'HARDWARE' : 'AUTOMATIC'}
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
            { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom + 12, 24) }
          ]} 
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            {/* === ICONO ANIMADO CON GLOW (PARTE SUPERIOR) === */}
            <View style={styles.topIconSection}>
              <LottieView
                source={require('../assets/igo-login-icon.json')}
                autoPlay
                loop
                renderMode={Platform.OS === 'android' ? 'HARDWARE' : 'AUTOMATIC'}
                style={styles.iconLottie}
                resizeMode="contain"
              />
            </View>

            {/* === TEXTO PRINCIPAL / HEADLINE === */}
            <View style={styles.headerTextContainer}>
              <Text style={styles.tagline}>DELIVERY APP</Text>
              <Text style={styles.headline}>Tu pedido,{"\n"}a un toque.</Text>
            </View>
          </View>

          {/* === FORMULARIO DE ACCESO === */}
          <View style={styles.formContainer}>
            {/* Aviso si el backend en Render se está despertando */}
            {serverStatus === 'waking' && (
              <View style={styles.serverWakeBanner}>
                <ActivityIndicator size="small" color="#FFC93C" style={{ marginRight: 8 }} />
                <Text style={styles.serverWakeText}>
                  Conectando con el servidor IGO, estará listo en unos segundos...
                </Text>
              </View>
            )}

            {/* Input: Email */}
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#8E88A8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="tu@correo.com"
                placeholderTextColor="#6D6789"
                value={email}
                onFocus={() => wakeUpBackend()}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Input: Contraseña */}
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#8E88A8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Tu contraseña"
                placeholderTextColor="#6D6789"
                value={password}
                onFocus={() => wakeUpBackend()}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#8E88A8" 
                />
              </TouchableOpacity>
            </View>

            {/* Enlace: ¿Olvidaste tu contraseña? */}
            <TouchableOpacity 
              style={styles.forgotPasswordBtn}
              onPress={handleForgotPassword}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            {/* Botón Principal: Iniciar sesión */}
            <TouchableOpacity
              style={[styles.mainButton, isSubmitting && { opacity: 0.85 }]}
              onPress={handleLogin}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <View style={styles.loadingButtonContent}>
                  <ActivityIndicator size="small" color="#0F0330" />
                  <Text style={styles.mainButtonText}>
                    {isSlowWakeUp ? 'Despertando servidor...' : 'Iniciando sesión...'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.mainButtonText}>Iniciar sesión</Text>
              )}
            </TouchableOpacity>

            {/* Separador */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o continúa con</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Botones Sociales (Google, Apple, Facebook) */}
            <View style={styles.socialContainer}>
              <TouchableOpacity 
                style={styles.socialBtn}
                onPress={() => promptAsync()}
                disabled={!request}
                activeOpacity={0.75}
              >
                <Ionicons name="logo-google" size={22} color="#EA4335" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.socialBtn}
                onPress={handleAppleLogin}
                activeOpacity={0.75}
              >
                <Ionicons name="logo-apple" size={24} color="#000000" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.socialBtn}
                onPress={handleFacebookLogin}
                activeOpacity={0.75}
              >
                <Ionicons name="logo-facebook" size={24} color="#1877F2" />
              </TouchableOpacity>
            </View>

            {/* Footer: Registro */}
            <TouchableOpacity 
              style={styles.registerContainer} 
              onPress={() => router.push('/register' as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.registerText}>
                ¿No tienes cuenta? <Text style={styles.registerTextBold}>Regístrate</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* === MODAL DE RECUPERACIÓN DE CONTRASEÑA CON CÓDIGO === */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalCard}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {forgotStep === 1 ? 'Recuperar Contraseña' : 'Ingresa tu Código'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowForgotModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {forgotStep === 1
                ? 'Ingresa tu correo electrónico registrado y te enviaremos un código de seguridad de 6 dígitos.'
                : `Ingresa el código de 6 dígitos enviado a "${forgotEmail}" y define tu nueva contraseña.`}
            </Text>

            {forgotStep === 1 ? (
              <View style={{ marginTop: 12 }}>
                <View style={styles.modalInputWrapper}>
                  <Ionicons name="mail-outline" size={18} color="#8E88A8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="tu@correo.com"
                    placeholderTextColor="#6D6789"
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.modalActionBtn, forgotLoading && { opacity: 0.8 }]}
                  onPress={handleRequestResetCode}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator size="small" color="#0F0330" />
                  ) : (
                    <Text style={styles.modalActionBtnText}>Enviar Código</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ marginTop: 12 }}>
                <View style={styles.modalInputWrapper}>
                  <Ionicons name="key-outline" size={18} color="#8E88A8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Código de 6 dígitos"
                    placeholderTextColor="#6D6789"
                    value={forgotCode}
                    onChangeText={setForgotCode}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                <View style={styles.modalInputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color="#8E88A8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Nueva contraseña (mín 6 car.)"
                    placeholderTextColor="#6D6789"
                    value={forgotNewPass}
                    onChangeText={setForgotNewPass}
                    secureTextEntry
                  />
                </View>

                <View style={styles.modalInputWrapper}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#8E88A8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Confirma la nueva contraseña"
                    placeholderTextColor="#6D6789"
                    value={forgotConfirmPass}
                    onChangeText={setForgotConfirmPass}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  style={[styles.modalActionBtn, forgotLoading && { opacity: 0.8 }]}
                  onPress={handleConfirmResetPassword}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator size="small" color="#0F0330" />
                  ) : (
                    <Text style={styles.modalActionBtnText}>Restablecer Contraseña</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ alignSelf: 'center', marginTop: 12, padding: 6 }}
                  onPress={() => setForgotStep(1)}
                >
                  <Text style={{ color: '#FFC93C', fontSize: 13, fontWeight: '600' }}>
                    Reenviar o cambiar correo
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
  },
  topIconSection: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    height: 150,
    marginTop: 8,
  },
  iconLottie: {
    width: 155,
    height: 155,
  },
  headerTextContainer: {
    paddingHorizontal: 28,
    marginTop: 10,
    zIndex: 1,
  },
  tagline: {
    color: '#FFC93C',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  formContainer: {
    paddingHorizontal: 28,
    marginTop: 20,
    zIndex: 1,
  },
  serverWakeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 201, 60, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 201, 60, 0.3)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  serverWakeText: {
    fontSize: 12,
    color: '#FFC93C',
    fontWeight: '600',
    flex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(22, 13, 48, 0.65)',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    height: '100%',
  },
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: 18,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    color: '#A899D3',
    fontSize: 13,
    fontWeight: '600',
  },
  mainButton: {
    backgroundColor: '#FFC93C',
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFC93C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
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
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  dividerText: {
    marginHorizontal: 14,
    color: '#7D7699',
    fontSize: 12,
    fontWeight: '500',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginBottom: 18,
  },
  socialBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  registerContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  registerText: {
    fontSize: 14,
    color: '#8F8AA6',
  },
  registerTextBold: {
    color: '#FFC93C',
    fontWeight: '700',
  },
  splashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F0330',
    zIndex: 9999,
  },
  skipSplashBtn: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10000,
  },
  skipSplashText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#160D30',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 201, 60, 0.3)',
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#A09BB8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  modalInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    height: '100%',
  },
  modalActionBtn: {
    backgroundColor: '#FFC93C',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  modalActionBtnText: {
    color: '#0F0330',
    fontSize: 15,
    fontWeight: '700',
  },
});
