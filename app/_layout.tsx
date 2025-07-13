import PermissionCheckerProvider from "@/presentation/providers/PermissionCheckerProvider";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <PermissionCheckerProvider>
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: "#ffffff",
        },
      }}
    >
      <Stack.Screen name="loading" options={{ animation: "slide_from_right", headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="permissions" options={{ headerShown: false }} />
      <Stack.Screen name="map" options={{ headerShown: false }} />
    </Stack>
     </PermissionCheckerProvider>
  )
  
}
