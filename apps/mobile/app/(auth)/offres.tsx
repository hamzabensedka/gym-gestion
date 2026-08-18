import { useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Plan } from "@prisma/client";
import type { TranslationKey } from "@gym/shared/i18n";
import { ApiClientError, apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { PlanCards } from "@/components/plan-cards";
import { FeatherIcon } from "@/components/icons";
import { Button, ErrorBanner, Input, Subtitle, Title } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";

const PLAN_ERROR_KEYS = new Set<string>([
  "plans.invalidLead",
  "plans.alreadyCurrent",
  "plans.rateLimited",
]);

function planErrorKey(error: unknown): TranslationKey {
  if (error instanceof ApiClientError) {
    if (error.status === 429 || error.code === "RATE_LIMITED") return "plans.rateLimited";
    if (PLAN_ERROR_KEYS.has(error.message)) return error.message as TranslationKey;
  }
  return "plans.invalidLead";
}

function whatsappUrl(gymName: string, plan: Plan): string | null {
  const number = process.env.EXPO_PUBLIC_LEADS_WHATSAPP?.trim() ?? "";
  if (!number) return null;
  const text = encodeURIComponent(`Bonjour, salle ${gymName}, offre ${plan}`);
  return `https://wa.me/${number}?text=${text}`;
}

export default function OffresScreen() {
  const { t, rtl } = useI18n();
  const [plan, setPlan] = useState<Plan>(Plan.GROWTH);
  const [gymName, setGymName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      apiFetch("/plan-requests", {
        method: "POST",
        body: JSON.stringify({
          gymName: gymName.trim(),
          city: city.trim(),
          phone: phone.trim(),
          email: email.trim(),
          plan,
        }),
      }),
  });

  const waHref = whatsappUrl(gymName, plan);
  const align = rtl ? "right" : "left";

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
          <Link href="/(auth)/login" asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={t("common.back")}
              style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}
            >
              <FeatherIcon
                name={rtl ? "chevron-right" : "chevron-left"}
                color={colors.foreground}
                size={20}
              />
              <Text style={styles.backText}>{t("common.back")}</Text>
            </Pressable>
          </Link>

          <Title>{t("plans.title")}</Title>
          <Subtitle>{t("plans.subtitle")}</Subtitle>

          {submit.isSuccess ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.success, { textAlign: align }]}
            >
              {t("plans.success")}
            </Text>
          ) : (
            <View>
              <PlanCards selected={plan} onSelect={setPlan} mode="public" />

              <View style={styles.fields}>
                <Input
                  label={t("plans.leadName")}
                  value={gymName}
                  onChangeText={setGymName}
                  autoComplete="organization"
                />
                <Input
                  label={t("plans.leadCity")}
                  value={city}
                  onChangeText={setCity}
                  autoComplete="postal-address-locality"
                />
                <Input
                  label={t("plans.leadPhone")}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                />
                <Input
                  label={t("plans.leadEmail")}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>

              {submit.isError ? <ErrorBanner message={t(planErrorKey(submit.error))} /> : null}

              <Button
                label={t("plans.submit")}
                onPress={() => submit.mutate()}
                loading={submit.isPending}
                disabled={submit.isPending}
                size="lg"
              />

              {waHref ? (
                <Button
                  label={t("plans.whatsapp")}
                  variant="outline"
                  size="lg"
                  onPress={() => void Linking.openURL(waHref)}
                  style={styles.whatsapp}
                />
              ) : null}
            </View>
          )}
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
    gap: spacing.sm,
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    gap: 4,
    alignSelf: "flex-start",
  },
  backText: { fontSize: 14, color: colors.foreground },
  success: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.foreground,
    marginTop: spacing.sm,
  },
  fields: { marginTop: spacing.lg },
  whatsapp: { marginTop: spacing.md },
});
