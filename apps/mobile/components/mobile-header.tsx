import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Role } from "@gym/shared/auth";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { colors } from "@/lib/theme";

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function MobileHeader() {
  const insets = useSafeAreaInsets();
  const { state } = useAuth();
  const { t } = useI18n();

  if (state.status !== "staff") return null;

  const { user } = state;
  const roleLabel = user.role === Role.ADMIN ? t("staff.roleAdmin") : t("staff.roleStaff");
  const initials = getInitials(user.name) || "?";

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.gymName} numberOfLines={1}>
              {user.gymName}
            </Text>
            <Text style={styles.subline} numberOfLines={1}>
              {user.name}
              <Text style={styles.dot}> · </Text>
              <Text style={styles.role}>{roleLabel}</Text>
            </Text>
          </View>
        </View>
        <LanguageSwitcher variant="compact" />
      </View>
      <View style={styles.separator} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.tabBarBg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  left: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minWidth: 0 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandMuted,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 11, fontWeight: "700", color: colors.foreground, letterSpacing: 0.5 },
  meta: { flex: 1, minWidth: 0 },
  gymName: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.3,
    color: colors.foreground,
  },
  subline: { marginTop: 2, fontSize: 12, lineHeight: 14, color: colors.mutedForeground },
  dot: { color: colors.border },
  role: { fontWeight: "500", color: colors.brandText },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    opacity: 0.6,
  },
});
