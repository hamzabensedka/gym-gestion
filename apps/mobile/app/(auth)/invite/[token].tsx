import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { API_URL } from "@/lib/api";
import { Button, Input, Title } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { setPasswordFromInvite } = useAuth();
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inviteQuery = useQuery({
    queryKey: ["invite", token],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/auth/member/invite/${token}`);
      if (!res.ok) throw new Error("invalid");
      const json = await res.json();
      return json.data as { gymName: string; memberName: string; email: string };
    },
    enabled: Boolean(token),
  });

  async function handleActivate() {
    setError("");
    setLoading(true);
    try {
      await setPasswordFromInvite(token!, password, confirmPassword);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("member.invite.invalidToken"));
    } finally {
      setLoading(false);
    }
  }

  if (inviteQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (inviteQuery.isError) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>{t("member.invite.invalidToken")}</Text>
      </SafeAreaView>
    );
  }

  const data = inviteQuery.data!;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Title>{t("member.invite.title")}</Title>
        <Text style={styles.gym}>{data.gymName}</Text>
        <Text style={styles.name}>{data.memberName}</Text>

        <Input
          label={t("member.invite.setPassword")}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Input
          label={t("member.invite.confirmPassword")}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={t("member.invite.activate")}
          onPress={handleActivate}
          loading={loading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, flex: 1, justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  gym: { fontSize: 16, color: colors.textMuted, marginBottom: 4 },
  name: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md },
});
