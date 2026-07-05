import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FeatherIcon, TabIcon, type TabIconName } from "@/components/icons";
import { useI18n } from "@/lib/i18n-context";
import type { NavItem } from "@/lib/navigation";
import { colors, radius } from "@/lib/theme";

type MoreSheetProps = {
  visible: boolean;
  items: NavItem[];
  activeRoute: string;
  onClose: () => void;
  onSelect: (route: string) => void;
  onLogout: () => void;
};

function MoreNavRow({
  item,
  active,
  onPress,
}: {
  item: NavItem;
  active: boolean;
  onPress: () => void;
}) {
  const { t } = useI18n();
  const iconName = item.icon as TabIconName;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navRow,
        active && styles.navRowActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      <TabIcon name={iconName} color={active ? colors.brand : colors.foreground} size={20} />
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{t(item.labelKey)}</Text>
    </Pressable>
  );
}

export function MoreSheet({ visible, items, activeRoute, onClose, onSelect, onLogout }: MoreSheetProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>{t("nav.more")}</Text>

          <View style={styles.list}>
            {items.map((item) => (
              <MoreNavRow
                key={item.route}
                item={item}
                active={activeRoute === item.route}
                onPress={() => {
                  onClose();
                  onSelect(item.route);
                }}
              />
            ))}
          </View>

          <View style={styles.divider} />

          <Pressable
            onPress={() => {
              onClose();
              onLogout();
            }}
            style={({ pressed }) => [styles.navRow, styles.logoutRow, pressed && { opacity: 0.85 }]}
          >
            <FeatherIcon name="log-out" color={colors.error} size={20} />
            <Text style={styles.logoutLabel}>{t("nav.logout")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.foreground25,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  list: { gap: 4 },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
  },
  navRowActive: {
    borderWidth: 1,
    borderColor: colors.brandBorder,
    backgroundColor: colors.brandMuted,
  },
  navLabel: { fontSize: 14, fontWeight: "500", color: colors.foreground },
  navLabelActive: { color: colors.brand },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  logoutRow: {},
  logoutLabel: { fontSize: 14, fontWeight: "500", color: colors.error },
});
