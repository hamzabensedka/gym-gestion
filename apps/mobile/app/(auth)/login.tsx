import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { Button, Card, DemoRow, ErrorBanner, Input, Subtitle, Title } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";

export default function LoginScreen() {
  const { loginStaff, loginMember } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function fill(demoEmail: string, demoPassword: string) {
    setEmail(demoEmail);
    setPassword(demoPassword);
  }

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      try {
        await loginStaff(email.trim(), password);
      } catch {
        await loginMember(email.trim(), password);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("login.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            <Logo size={40} />
            <Text style={styles.appName}>{t("app.name")}</Text>
          </View>
          <LanguageSwitcher />
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <Title>{t("login.title")}</Title>
            <Subtitle>{t("login.subtitle")}</Subtitle>
          </View>

          <Card>
            <Input
              label={t("login.email")}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label={t("login.password")}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            {error ? <ErrorBanner message={error} /> : null}
            <Button
              label={loading ? t("login.signingIn") : t("login.signIn")}
              onPress={handleLogin}
              loading={loading}
              size="lg"
            />
          </Card>

          <Text style={styles.demoLabel}>{t("login.demo")}</Text>
          <View style={styles.demoCard}>
            <DemoRow
              title={t("staff.roleAdmin")}
              subtitle="admin@gym.local"
              onPress={() => fill("admin@gym.local", "admin123")}
            />
            <DemoRow
              title={t("staff.roleStaff")}
              subtitle="staff@gym.local"
              onPress={() => fill("staff@gym.local", "staff123")}
              last
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: spacing.md,
  },
  headerBrand: { flexDirection: "row", alignItems: "center", gap: 10 },
  appName: { fontSize: 16, fontWeight: "600", color: colors.foreground },
  container: {
    paddingHorizontal: 20,
    paddingBottom: spacing.xl,
    flexGrow: 1,
    justifyContent: "center",
    gap: spacing.lg,
  },
  hero: { marginBottom: spacing.sm },
  demoLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    paddingHorizontal: 4,
    marginBottom: spacing.sm,
  },
  demoCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
});
