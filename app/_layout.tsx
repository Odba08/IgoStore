import PermissionCheckerProvider from "@/presentation/providers/PermissionCheckerProvider";
import { AppState, LogBox } from "react-native";
import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router"; // <-- Importa useRootNavigationState
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuthStore } from "@/presentation/store/useAuthStore";
import { usePushNotifications } from "@/presentation/hooks/usePushNotifications";
import { getSocket } from "@/infrastructure/services/socket.service";
import { wakeUpBackend } from "@/infrastructure/api/igo.api";

// Silenciar advertencias molestas de desarrollo que muestran la barra amarilla abajo
LogBox.ignoreLogs([
  'Response.blob()',
  'expo-notifications',
  'shouldShowAlert',
  'VirtualizedLists should never be nested',
  'Unsupported FormDataPart',
  'Warning: Each child in a list should have a unique',
  'Setting a timer',
  'AxiosError: Request failed with status code 401',
  'Error loading driver dashboard',
]);

const queryClient = new QueryClient();

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const navigationState = useRootNavigationState(); // <-- Obtenemos el estado de la navegación

  // Inicializar servicio y listeners de Notificaciones Push
  usePushNotifications();

  useEffect(() => {
    // Despertar el backend de Render de forma anticipada apenas se abre la app
    wakeUpBackend();
    checkAuth();
    try {
      getSocket();
    } catch (e) {
      console.warn("Error initializing socket:", e);
    }

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        wakeUpBackend();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!navigationState?.key) return;

    // Engañamos a TypeScript convirtiendo el segmento a un string genérico
    const inAuthGroup = (segments[0] as string) === 'login' || (segments[0] as string) === 'register';

    const timeoutId = setTimeout(() => {
      if (!isAuthenticated && !inAuthGroup) {
        // Forzamos la ruta saltando la validación estricta de tipos
        router.replace('/login' as any);
      } else if (isAuthenticated && inAuthGroup) {
        router.replace('/' as any);
      }
    }, 1); 

    return () => clearTimeout(timeoutId);

  }, [isAuthenticated, segments, navigationState]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#f9faeeff" },
      }}
      initialRouteName="index"
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="register" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="loading" options={{ animation: "slide_from_right", headerShown: false }} />
      <Stack.Screen name="permissions" options={{ headerShown: false }} />
      <Stack.Screen name="map" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView>
      <QueryClientProvider client={queryClient}>
        <PermissionCheckerProvider>
          <RootLayoutNav />
        </PermissionCheckerProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
