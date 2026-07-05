import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FeatherIcon } from "@/components/icons";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { colors } from "@/lib/theme";

export function MemberShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { logout } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Logo size={36} />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title ?? t("member.wallet.title")}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <LanguageSwitcher variant="compact" />
          <Pressable
            onPress={() => setLogoutOpen(true)}
            accessibilityLabel={t("nav.logout")}
            style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
          >
            <FeatherIcon name="log-out" color={colors.mutedForeground} size={16} />
          </Pressable>
        </View>
      </View>
      <View style={styles.main}>{children}</View>

      <ConfirmDialog
        visible={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        tone="critical"
        icon="log-out"
        title={t("nav.logout")}
        description={t("nav.logoutConfirm")}
        confirmLabel={t("nav.logout")}
        cancelLabel={t("common.cancel")}
        onConfirm={() => {
          setLogoutOpen(false);
          logout();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 },
  headerTitle: { fontSize: 14, fontWeight: "600", color: colors.foreground, flexShrink: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  main: { flex: 1, paddingHorizontal: 20, paddingBottom: 32 },
});
