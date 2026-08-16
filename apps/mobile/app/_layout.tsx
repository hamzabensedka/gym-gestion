import { Redirect, Stack, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { I18nProvider } from "@/lib/i18n-context";
import { RtlRoot } from "@/components/rtl-root";
import { colors } from "@/lib/theme";
import { Role } from "@gym/shared/auth";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider>
            <RtlRoot>
              <RootNavigator />
            </RtlRoot>
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { state } = useAuth();
  const segments = useSegments();

  if (state.status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  const inAuth = segments[0] === "(auth)";
  const inKiosk = segments[0] === "kiosk";

  if (state.status === "guest" && !inAuth) {
    return <Redirect href="/(auth)/login" />;
  }

  if (state.status === "staff" && inAuth) {
    const route = state.user.role === Role.ADMIN ? "/(admin)/dashboard" : "/(staff)/scan";
    return <Redirect href={route} />;
  }

  if (state.status === "member" && (inAuth || inKiosk)) {
    return <Redirect href="/(member)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(staff)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="(member)" />
      <Stack.Screen name="kiosk" options={{ animation: "fade", gestureEnabled: false }} />
    </Stack>
  );
}
