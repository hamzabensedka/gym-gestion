import { View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { AppTabBar } from "@/components/app-tab-bar";
import { MobileHeader } from "@/components/mobile-header";
import { useI18n } from "@/lib/i18n-context";
import { tabBarScreenOptions, colors } from "@/lib/theme";

export default function StaffLayout() {
  const { t, locale } = useI18n();

  return (
    <View style={styles.root}>
      <MobileHeader />
      <Tabs
        key={locale}
        tabBar={(props) => <AppTabBar {...props} variant="staff" />}
        screenOptions={{
          ...tabBarScreenOptions,
          headerShown: false,
        }}
      >
        <Tabs.Screen name="scan" options={{ title: t("nav.scan") }} />
        <Tabs.Screen name="manual" options={{ title: t("nav.manual") }} />
        <Tabs.Screen name="members" options={{ title: t("nav.members") }} />
        <Tabs.Screen name="today" options={{ title: t("nav.today") }} />
        <Tabs.Screen
          name="account"
          options={{ title: t("nav.account"), href: null }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
