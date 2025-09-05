import PermissionCheckerProvider from "@/presentation/providers/PermissionCheckerProvider";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { bussines } from "./core/actions/bussines/bussines.actions";

export default function RootLayout() {

  bussines();

  return (
  <GestureHandlerRootView>
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
  </GestureHandlerRootView>
  )
  
}
