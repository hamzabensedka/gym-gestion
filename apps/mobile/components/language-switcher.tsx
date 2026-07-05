import { Pressable, StyleSheet, Text, View } from "react-native";
import { locales, type Locale } from "@gym/shared/i18n";
import { useI18n } from "@/lib/i18n-context";
import { colors, radius } from "@/lib/theme";

const labels: Record<Locale, string> = {
  fr: "FR",
  ar: "ع",
};

export function LanguageSwitcher({ variant = "default" }: { variant?: "default" | "compact" }) {
  const { locale, setLocale } = useI18n();
  const compact = variant === "compact";

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {locales.map((code) => {
        const active = locale === code;
        return (
          <Pressable
            key={code}
            onPress={() => {
              if (locale !== code) setLocale(code);
            }}
            style={[styles.btn, compact && styles.btnCompact, active && (compact ? styles.btnActiveCompact : styles.btnActive)]}
          >
            <Text
              style={[
                styles.label,
                compact && styles.labelCompact,
                active && (compact ? styles.labelActiveCompact : styles.labelActive),
              ]}
            >
              {labels[code]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
    padding: 2,
  },
  wrapCompact: {
    borderWidth: 0,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 999,
  },
  btn: {
    minWidth: 40,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    paddingHorizontal: 10,
  },
  btnCompact: {
    minWidth: 30,
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  btnActive: {
    borderWidth: 1,
    borderColor: colors.brandBorder,
    backgroundColor: colors.brandMuted,
  },
  btnActiveCompact: {
    backgroundColor: colors.brand,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.mutedForeground,
  },
  labelCompact: {
    fontSize: 11,
    fontWeight: "600",
  },
  labelActive: {
    color: colors.brand,
  },
  labelActiveCompact: {
    color: colors.primaryForeground,
  },
});
