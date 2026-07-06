import PermissionCheckerProvider from "@/presentation/providers/PermissionCheckerProvider";
import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router"; // <-- Importa useRootNavigationState
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuthStore } from "@/presentation/store/useAuthStore";

const queryClient = new QueryClient();

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated } = useAuthStore();
  const navigationState = useRootNavigationState(); // <-- Obtenemos el estado de la navegación

  useEffect(() => {
    if (!navigationState?.key) return;

    // Engañamos a TypeScript convirtiendo el segmento a un string genérico
    const inAuthGroup = (segments[0] as string) === 'login';

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