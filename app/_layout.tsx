import PermissionCheckerProvider from "@/presentation/providers/PermissionCheckerProvider";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function RootLayout() {


  return (
  <GestureHandlerRootView>
    <QueryClientProvider client={queryClient}> 
    <PermissionCheckerProvider>

<Stack
  screenOptions={{
    headerShown: false,
    contentStyle: { backgroundColor: "#ffffff" },
  }}
  // Forzamos que la ruta inicial sea 'index'
  initialRouteName="index" 
>
  {/* Movemos el Index al primer lugar */}
  <Stack.Screen name="index" options={{ headerShown: false }} />
  
  <Stack.Screen name="loading" options={{ animation: "slide_from_right", headerShown: false }} />
  <Stack.Screen name="permissions" options={{ headerShown: false }} />
  <Stack.Screen name="map" options={{ headerShown: false }} />
</Stack>
     </PermissionCheckerProvider>
     </QueryClientProvider>
  </GestureHandlerRootView>
  )
  
}
