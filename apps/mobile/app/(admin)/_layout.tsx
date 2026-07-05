import { View, StyleSheet } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { Role } from "@gym/shared/auth";
import { AppTabBar } from "@/components/app-tab-bar";
import { MobileHeader } from "@/components/mobile-header";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { tabBarScreenOptions } from "@/lib/theme";
import { colors } from "@/lib/theme";

export default function AdminLayout() {
  const { state } = useAuth();
  const { t, locale } = useI18n();

  if (state.status === "staff" && state.user.role !== Role.ADMIN) {
    return <Redirect href="/(staff)/scan" />;
  }

  return (
    <View style={styles.root}>
      <MobileHeader />
      <Tabs
        key={locale}
        tabBar={(props) => <AppTabBar {...props} variant="admin" />}
        screenOptions={{
          ...tabBarScreenOptions,
          headerShown: false,
        }}
      >
        <Tabs.Screen name="dashboard" options={{ title: t("nav.dashboard") }} />
        <Tabs.Screen name="members" options={{ title: t("nav.members") }} />
        <Tabs.Screen name="scan" options={{ title: t("nav.scan") }} />
        <Tabs.Screen name="attendance" options={{ title: t("nav.attendance") }} />
        <Tabs.Screen
          name="manual"
          options={{ title: t("nav.manual"), href: null }}
        />
        <Tabs.Screen
          name="staff"
          options={{ title: t("nav.staff"), href: null }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: t("nav.settings"), href: null }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
