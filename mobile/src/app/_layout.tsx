import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SessionProvider, useSession } from "../ctx/AuthContext";

SplashScreen.preventAutoHideAsync();

function SplashScreenController() {
  const { isLoading } = useSession();
  if (!isLoading) SplashScreen.hide();
  return null;
}

function RootNavigator() {
  const { user } = useSession();
  const authed = !!user;
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Protected guard={authed}>
        <Stack.Screen name="index" />
        <Stack.Screen name="home" />
      </Stack.Protected>
      <Stack.Protected guard={!authed}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <SplashScreenController />
      <StatusBar style="auto" />
      <RootNavigator />
    </SessionProvider>
  );
}
