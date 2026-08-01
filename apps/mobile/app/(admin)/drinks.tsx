import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useI18n } from "@/lib/i18n-context";
import { colors, spacing } from "@/lib/theme";

/** Placeholder — full UI in Task 6 */
export default function DrinksScreen() {
  const { t } = useI18n();

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <View style={styles.content}>
        <Text style={styles.title}>{t("drinks.title")}</Text>
        <Text style={styles.subtitle}>{t("drinks.subtitle")}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg, gap: spacing.sm },
  title: { fontSize: 22, fontWeight: "700", color: colors.foreground },
  subtitle: { fontSize: 14, color: colors.foreground50 },
});
