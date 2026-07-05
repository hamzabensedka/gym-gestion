import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { colors, radius, spacing } from "@/lib/theme";
import { useI18n } from "@/lib/i18n-context";
import { layoutDirection } from "@/components/rtl-root";

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { rtl } = useI18n();
  return <View style={[styles.screen, layoutDirection(rtl), style]}>{children}</View>;
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { rtl } = useI18n();
  const align = rtl ? "right" : "left";

  return (
    <View style={styles.pageHeader}>
      <Text style={[styles.title, { textAlign: align }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { textAlign: align }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function Title({ children }: { children: string }) {
  const { rtl } = useI18n();
  return <Text style={[styles.title, { textAlign: rtl ? "right" : "left" }]}>{children}</Text>;
}

export function Subtitle({ children }: { children: string }) {
  const { rtl } = useI18n();
  return <Text style={[styles.subtitle, { textAlign: rtl ? "right" : "left" }]}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  style,
  icon,
  iconOnly = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost" | "whatsapp";
  size?: "md" | "lg" | "sm";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
  iconOnly?: boolean;
}) {
  const variantStyle =
    variant === "primary"
      ? styles.btnPrimary
      : variant === "danger"
        ? styles.btnDanger
        : variant === "whatsapp"
          ? styles.btnWhatsapp
          : variant === "outline"
            ? styles.btnOutline
            : variant === "ghost"
              ? styles.btnGhost
              : styles.btnSecondary;

  const sizeStyle =
    iconOnly
      ? styles.btnIcon
      : size === "lg"
        ? styles.btnLg
        : size === "sm"
          ? styles.btnSm
          : styles.btnMd;

  const textStyle =
    variant === "primary"
      ? styles.btnTextPrimary
      : variant === "whatsapp"
        ? styles.btnTextWhatsapp
        : variant === "secondary" || variant === "danger"
          ? styles.btnTextLight
          : styles.btnTextLight;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        variantStyle,
        sizeStyle,
        style,
        (pressed || disabled) && { opacity: 0.7, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" || variant === "whatsapp" ? "#ffffff" : colors.foreground} />
      ) : iconOnly ? (
        icon
      ) : (
        <View style={styles.buttonContent}>
          {icon}
          <Text
            style={[styles.buttonText, textStyle, size === "lg" && styles.buttonTextLg, size === "sm" && styles.buttonTextSm]}
            numberOfLines={2}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={styles.inputWrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...rest}
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, style]}
      />
    </View>
  );
}

export function Card({
  children,
  style,
  compact,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  compact?: boolean;
}) {
  return <View style={[styles.card, compact && styles.cardCompact, style]}>{children}</View>;
}

export function CardTitle({ children }: { children: string }) {
  return <Text style={styles.cardTitle}>{children}</Text>;
}

export function StatCard({
  label,
  value,
  tone = "default",
  icon,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "danger" | "brand";
  icon?: React.ReactNode;
}) {
  const valueColor =
    tone === "success" || tone === "brand"
      ? colors.brand
      : tone === "danger"
        ? colors.critical
        : colors.foreground;

  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
        {icon ? (
          <View
            style={[
              styles.statIconWrap,
              tone === "danger" && {
                backgroundColor: colors.criticalMuted,
              },
            ]}
          >
            {icon}
          </View>
        ) : null}
      </View>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

export function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "danger" | "warning" | "brand";
}) {
  const toneStyle =
    tone === "success"
      ? styles.badgeSuccess
      : tone === "brand"
        ? styles.badgeBrand
        : tone === "warning"
          ? styles.badgeWarning
          : tone === "danger"
            ? styles.badgeDanger
            : styles.badgeNeutral;

  return (
    <View style={[styles.badge, toneStyle]}>
      <Text
        style={[
          styles.badgeText,
          tone === "success" && { color: colors.brand },
          tone === "brand" && { color: colors.primaryForeground },
          tone === "danger" && { color: colors.critical },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function ListRow({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const content = (
    <View style={[styles.listRow, style]}>{children}</View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.85 }}>
        {content}
      </Pressable>
    );
  }
  return content;
}

export function GroupedCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.groupedCard}>{children}</View>;
}

export function DemoRow({
  title,
  subtitle,
  onPress,
  last,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.demoRow,
        !last && styles.demoRowBorder,
        pressed && { backgroundColor: colors.accent },
      ]}
    >
      <Text style={styles.demoTitle}>{title}</Text>
      <Text style={styles.demoSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorBannerText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  pageHeader: { marginBottom: spacing.md },
  title: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  subtitle: { fontSize: 14, color: colors.mutedForeground, marginBottom: spacing.lg },
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  btnMd: { minHeight: 44, paddingHorizontal: spacing.md },
  btnLg: { minHeight: 48, paddingHorizontal: spacing.lg, borderRadius: radius.xl },
  btnSm: { minHeight: 36, paddingHorizontal: 12, borderRadius: radius.md },
  btnIcon: { minHeight: 44, flex: 1, paddingHorizontal: 0 },
  btnPrimary: { backgroundColor: colors.primary },
  btnSecondary: { backgroundColor: colors.secondary },
  btnDanger: { backgroundColor: colors.destructive },
  btnWhatsapp: { backgroundColor: "#25D366" },
  btnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnGhost: { backgroundColor: "transparent" },
  buttonText: { fontSize: 14, fontWeight: "600", flexShrink: 1, textAlign: "center" },
  buttonTextLg: { fontSize: 16 },
  buttonTextSm: { fontSize: 11 },
  btnTextPrimary: { color: colors.primaryForeground },
  btnTextWhatsapp: { color: "#ffffff" },
  btnTextLight: { color: colors.foreground },
  inputWrap: { marginBottom: spacing.md },
  label: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.foreground,
    minHeight: 44,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  cardCompact: { padding: spacing.md },
  cardTitle: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: "45%",
    gap: spacing.sm,
  },
  statHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.brandMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
    color: colors.mutedForeground,
    flex: 1,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  badgeNeutral: {
    backgroundColor: colors.muted,
    borderColor: "transparent",
  },
  badgeSuccess: {
    backgroundColor: colors.brandMuted,
    borderColor: colors.brandBorder,
  },
  badgeBrand: {
    backgroundColor: colors.brand,
    borderColor: "transparent",
  },
  badgeWarning: {
    backgroundColor: colors.accent,
    borderColor: colors.border,
  },
  badgeDanger: {
    backgroundColor: colors.criticalMuted,
    borderColor: colors.criticalBorder,
  },
  badgeText: { fontSize: 12, fontWeight: "500", color: colors.mutedForeground },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing.sm,
  },
  groupedCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  demoRow: { paddingHorizontal: spacing.md, paddingVertical: 12 },
  demoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  demoTitle: { fontSize: 14, fontWeight: "500", color: colors.foreground },
  demoSubtitle: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  errorBanner: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.criticalBorder,
    backgroundColor: colors.criticalMuted,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  errorBannerText: { fontSize: 14, fontWeight: "500", color: colors.critical },
});
