import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { apiFetch } from "@/lib/api";
import { Button, Input, Subtitle, Title } from "@/components/ui";
import { ConfirmDialog, NoticeDialog } from "@/components/confirm-dialog";
import { colors, spacing } from "@/lib/theme";

type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function StaffScreen() {
  const { t } = useI18n();
  const { state } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [showForm, setShowForm] = useState(false);
  const [deletingUser, setDeletingUser] = useState<StaffUser | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["staff"],
    queryFn: () => apiFetch<StaffUser[]>("/staff"),
  });

  const create = useMutation({
    mutationFn: () =>
      apiFetch("/staff", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      setShowForm(false);
      setName("");
      setEmail("");
      setPassword("");
    },
    onError: (e: Error) => setErrorNotice(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/staff/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      setDeletingUser(null);
    },
  });

  const currentId = state.status === "staff" ? state.user.id : "";

  return (
    <SafeAreaView style={styles.safe}>
      <Title>{t("staff.title")}</Title>
      <Subtitle>{t("staff.subtitle")}</Subtitle>

      <Button
        label={showForm ? t("common.cancel") : t("staff.add")}
        variant="secondary"
        onPress={() => setShowForm(!showForm)}
      />

      {showForm ? (
        <View style={styles.form}>
          <Input label={t("common.name")} value={name} onChangeText={setName} />
          <Input label={t("login.email")} value={email} onChangeText={setEmail} autoCapitalize="none" />
          <Input label={t("login.password")} value={password} onChangeText={setPassword} secureTextEntry />
          <View style={styles.roleRow}>
            {(["STAFF", "ADMIN"] as const).map((r) => (
              <Button
                key={r}
                label={r === "ADMIN" ? t("staff.roleAdmin") : t("staff.roleStaff")}
                variant={role === r ? "primary" : "secondary"}
                onPress={() => setRole(r)}
              />
            ))}
          </View>
          <Button label={t("staff.create")} onPress={() => create.mutate()} loading={create.isPending} />
        </View>
      ) : null}

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: spacing.md }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {item.name} {item.id === currentId ? `(${t("staff.you")})` : ""}
              </Text>
              <Text style={styles.email}>{item.email}</Text>
              <Text style={styles.role}>
                {item.role === "ADMIN" ? t("staff.roleAdmin") : t("staff.roleStaff")}
              </Text>
            </View>
            {item.id !== currentId ? (
              <Button
                label={t("staff.remove")}
                variant="danger"
                onPress={() => setDeletingUser(item)}
              />
            ) : null}
          </View>
        )}
      />

      <ConfirmDialog
        visible={deletingUser !== null}
        onClose={() => setDeletingUser(null)}
        tone="critical"
        icon="trash-2"
        title={t("common.confirmDelete")}
        description={
          deletingUser
            ? t("staff.confirmDeleteBody", { name: deletingUser.name })
            : ""
        }
        confirmLabel={t("staff.remove")}
        cancelLabel={t("common.cancel")}
        loading={remove.isPending}
        onConfirm={() => {
          if (deletingUser) remove.mutate(deletingUser.id);
        }}
      />

      <NoticeDialog
        visible={errorNotice !== null}
        onClose={() => setErrorNotice(null)}
        title={t("common.error")}
        description={errorNotice ?? undefined}
        tone="critical"
        confirmLabel={t("common.ok")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  form: { marginTop: spacing.md },
  roleRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  row: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  email: { fontSize: 14, color: colors.textMuted },
  role: { fontSize: 13, color: colors.brandDark, fontWeight: "500" },
});
