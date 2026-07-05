import { StyleSheet, View, type ViewStyle } from "react-native";
import { useI18n } from "@/lib/i18n-context";

/** Applies LTR/RTL layout instantly — no I18nManager.forceRTL (needs app reload). */
export function RtlRoot({ children }: { children: React.ReactNode }) {
  const { rtl } = useI18n();

  return <View style={[styles.root, layoutDirection(rtl)]}>{children}</View>;
}

export function layoutDirection(rtl: boolean): ViewStyle {
  return { direction: rtl ? "rtl" : "ltr" };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
