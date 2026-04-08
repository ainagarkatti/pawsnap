import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { StoreProvider } from "../lib/store";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="pet/new"
            options={{
              headerShown: true,
              title: "Add Pet",
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="pet/[id]"
            options={{ headerShown: true, title: "Pet Profile" }}
          />
          <Stack.Screen
            name="snap/[id]"
            options={{
              headerShown: true,
              title: "Scan Results",
              presentation: "modal",
            }}
          />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
