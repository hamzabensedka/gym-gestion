import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useI18n } from "@/lib/i18n-context";
import { apiFetch } from "@/lib/api";
import { Badge, Button, Card, Input, Title } from "@/components/ui";
import { FeatherIcon } from "@/components/icons";
import { ConfirmDialog, NoticeDialog } from "@/components/confirm-dialog";
import { colors, spacing } from "@/lib/theme";
import { formatDate, formatCurrency } from "@gym/shared/format";
import { buildWhatsappUrl } from "@gym/shared/subscription";
import { paymentMethods } from "@gym/shared/validations";
import type { TranslationKey } from "@gym/shared/i18n";

type MemberDetail = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  status: string;
  frozenAt: string | null;
  frozenUntil: string | null;
  subscriptionStart: string;
  subscriptionEnd: string;
  monthlyFee: string;
  notes: string | null;
  inviteStatus: string | null;
  checkins: Array<{ id: string; timestamp: string }>;
};

type PaymentRow = {
  id: string;
  amount: string;
  method: (typeof paymentMethods)[number];
  paidAt: string;
  note: string | null;
  recordedBy: { name: string };
};

const methodLabelKey: Record<(typeof paymentMethods)[number], TranslationKey> = {
  CASH: "payments.method.CASH",
  D17: "payments.method.D17",
  BANK_TRANSFER: "payments.method.BANK_TRANSFER",
  CARD: "payments.method.CARD",
  OTHER: "payments.method.OTHER",
};

type MemberDetailScreenProps = {
  canAdmin?: boolean;
  membersListRoute?: "/(admin)/members" | "/(staff)/members";
};

export function MemberDetailScreen({
  canAdmin = true,
  membersListRoute = "/(admin)/members",
}: MemberDetailScreenProps) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const qc = useQueryClient();

  const { data: member, isLoading } = useQuery({
    queryKey: ["member", id],
    queryFn: () => apiFetch<MemberDetail>(`/members/${id}`),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["member-payments", id],
    queryFn: () => apiFetch<PaymentRow[]>(`/members/${id}/payments`),
    enabled: Boolean(id),
  });

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof paymentMethods)[number]>("CASH");
  const [note, setNote] = useState("");
  const [freezeUntil, setFreezeUntil] = useState("");
  const [pendingMonths, setPendingMonths] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notice, setNotice] = useState<{
    title: string;
    description?: string;
    tone: "success" | "critical";
  } | null>(null);

  useEffect(() => {
    if (member?.monthlyFee) {
      setAmount(String(Number(member.monthlyFee)));
    }
  }, [member?.monthlyFee]);

  const recordPayment = useMutation({
    mutationFn: () =>
      apiFetch(`/members/${id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(amount),
          method,
          paidAt: format(new Date(), "yyyy-MM-dd"),
          note: note || undefined,
        }),
      }),
    onSuccess: () => {
      setNote("");
      qc.invalidateQueries({ queryKey: ["member-payments", id] });
    },
  });

  const renew = useMutation({
    mutationFn: (months: number) =>
      apiFetch(`/members/${id}/renew`, { method: "POST", body: JSON.stringify({ months }) }),
    onSuccess: () => {
      setPendingMonths(null);
      qc.invalidateQueries({ queryKey: ["member", id] });
    },
  });

  const remove = useMutation({
    mutationFn: () => apiFetch(`/members/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setDeleteOpen(false);
      router.replace(membersListRoute);
    },
  });

  const resendInvite = useMutation({
    mutationFn: () => apiFetch(`/members/${id}/invite/resend`, { method: "POST", body: "{}" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["member", id] });
      setNotice({ title: t("members.inviteSent"), tone: "success" });
    },
    onError: (e: Error) =>
      setNotice({ title: e.message || t("members.inviteSendFailed"), tone: "critical" }),
  });

  const freeze = useMutation({
    mutationFn: () =>
      apiFetch(`/members/${id}/freeze`, {
        method: "POST",
        body: JSON.stringify({ until: freezeUntil || undefined }),
      }),
    onSuccess: () => {
      setFreezeUntil("");
      qc.invalidateQueries({ queryKey: ["member", id] });
      setNotice({ title: t("freeze.freezeDone"), tone: "success" });
    },
  });

  const unfreeze = useMutation({
    mutationFn: () => apiFetch(`/members/${id}/unfreeze`, { method: "POST", body: "{}" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["member", id] });
      setNotice({ title: t("freeze.unfreezeDone"), tone: "success" });
    },
  });

  if (isLoading || !member) {
    return <Text style={{ padding: spacing.lg }}>{t("common.loading")}</Text>;
  }

  const waMessage =
    member.status === "ACTIVE"
      ? t("detail.waActive", {
          name: member.fullName,
          gym: "",
          date: formatDate(member.subscriptionEnd, locale),
        })
      : t("detail.waExpired", {
          name: member.fullName,
          gym: "",
          date: formatDate(member.subscriptionEnd, locale),
        });

  const statusLabel =
    member.status === "FROZEN"
      ? t("common.frozen")
      : member.status === "ACTIVE"
        ? t("common.active")
        : t("common.expired");
  const statusTone =
    member.status === "FROZEN" ? "danger" : member.status === "ACTIVE" ? "success" : "danger";

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Title>{member.fullName}</Title>
      <View style={styles.badgeWrap}>
        <Badge label={statusLabel} tone={statusTone} />
      </View>

      <Card>
        <Text style={styles.label}>{t("common.phone")}</Text>
        <Text style={styles.value}>{member.phone}</Text>
        {member.email ? (
          <>
            <Text style={styles.label}>{t("members.email")}</Text>
            <Text style={styles.value}>{member.email}</Text>
          </>
        ) : null}
        <Text style={styles.label}>{t("common.monthlyFee")}</Text>
        <Text style={styles.value}>{formatCurrency(member.monthlyFee)}</Text>
        <Text style={styles.label}>{t("detail.cardValid")}</Text>
        <Text style={styles.value}>{formatDate(member.subscriptionEnd, locale)}</Text>
      </Card>

      {canAdmin ? (
      <Card>
        <Text style={styles.section}>{t("freeze.title")}</Text>
        {member.status === "FROZEN" ? (
          <>
            {member.frozenAt ? (
              <Text style={styles.muted}>
                {t("freeze.frozenSince")} {formatDate(member.frozenAt, locale)}
              </Text>
            ) : null}
            <Button
              label={t("freeze.unfreeze")}
              variant="danger"
              onPress={() => unfreeze.mutate()}
              loading={unfreeze.isPending}
            />
            <Text style={styles.muted}>{t("freeze.unfreezeHint")}</Text>
          </>
        ) : (
          <>
            <Input
              label={t("freeze.untilOptional")}
              value={freezeUntil}
              onChangeText={setFreezeUntil}
              placeholder="YYYY-MM-DD"
            />
            <Button
              label={t("freeze.freeze")}
              variant="primary"
              onPress={() => freeze.mutate()}
              loading={freeze.isPending}
            />
          </>
        )}
      </Card>
      ) : null}

      <View style={styles.actions}>
        {[1, 3, 6, 12].map((m) => (
          <Button
            key={m}
            label={`+${m}m`}
            variant="secondary"
            onPress={() => setPendingMonths(m)}
          />
        ))}
      </View>

      <Card>
        <Text style={styles.section}>{t("payments.record")}</Text>
        <Input
          label={t("payments.amount")}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />
        <Text style={styles.label}>{t("payments.method")}</Text>
        <View style={styles.methodRow}>
          {paymentMethods.map((m) => (
            <Button
              key={m}
              label={t(methodLabelKey[m])}
              variant={method === m ? "primary" : "secondary"}
              size="sm"
              onPress={() => setMethod(m)}
            />
          ))}
        </View>
        <Input
          label={t("payments.note")}
          value={note}
          onChangeText={setNote}
        />
        <Button
          label={t("payments.record")}
          onPress={() => recordPayment.mutate()}
          loading={recordPayment.isPending}
          disabled={!amount || Number(amount) <= 0}
        />
      </Card>

      <View style={styles.actionRow}>
        <Button
          label={t("detail.whatsapp")}
          variant="whatsapp"
          iconOnly
          icon={<Ionicons name="logo-whatsapp" size={20} color="#fff" />}
          onPress={() => Linking.openURL(buildWhatsappUrl(member.phone, waMessage))}
        />
        <Button
          label={t("members.resendInvite")}
          variant="secondary"
          iconOnly
          icon={<FeatherIcon name="mail" size={20} color={colors.foreground} />}
          disabled={!member.email}
          onPress={() => resendInvite.mutate()}
          loading={resendInvite.isPending}
        />
        {canAdmin ? (
        <Button
          label={t("detail.deleteMember")}
          variant="danger"
          iconOnly
          icon={<FeatherIcon name="trash-2" size={20} color={colors.criticalForeground} />}
          onPress={() => setDeleteOpen(true)}
        />
        ) : null}
      </View>

      <Card>
        <Text style={styles.section}>{t("detail.history")}</Text>
        {member.checkins.length === 0 ? (
          <Text style={styles.muted}>{t("detail.noVisits")}</Text>
        ) : (
          member.checkins.map((c) => (
            <Text key={c.id} style={styles.visit}>
              {new Date(c.timestamp).toLocaleString(locale === "ar" ? "ar-TN" : "fr-FR")}
            </Text>
          ))
        )}
      </Card>

      <Card>
        <Text style={styles.section}>{t("payments.history")}</Text>
        {payments.length === 0 ? (
          <Text style={styles.muted}>{t("payments.noPayments")}</Text>
        ) : (
          payments.map((payment) => (
            <View key={payment.id} style={styles.paymentRow}>
              <View>
                <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                <Text style={styles.muted}>
                  {t(methodLabelKey[payment.method])} · {formatDate(payment.paidAt, locale)}
                </Text>
                {payment.note ? <Text style={styles.muted}>{payment.note}</Text> : null}
              </View>
              <Text style={styles.muted}>{payment.recordedBy.name}</Text>
            </View>
          ))
        )}
      </Card>
    </ScrollView>

    <ConfirmDialog
      visible={pendingMonths !== null}
      onClose={() => setPendingMonths(null)}
      tone="brand"
      title={t("renew.confirmTitle")}
      description={
        pendingMonths !== null
          ? t("renew.confirmBody", { name: member.fullName, months: String(pendingMonths) })
          : ""
      }
      confirmLabel={t("renew.confirm")}
      cancelLabel={t("common.cancel")}
      loading={renew.isPending}
      onConfirm={() => {
        if (pendingMonths !== null) renew.mutate(pendingMonths);
      }}
    />

    {canAdmin ? (
    <ConfirmDialog
      visible={deleteOpen}
      onClose={() => setDeleteOpen(false)}
      tone="critical"
      icon="trash-2"
      title={t("common.confirmDelete")}
      description={t("detail.confirmDeleteBody", { name: member.fullName })}
      confirmLabel={t("detail.deleteMember")}
      cancelLabel={t("common.cancel")}
      loading={remove.isPending}
      onConfirm={() => remove.mutate()}
    />
    ) : null}

    <NoticeDialog
      visible={notice !== null}
      onClose={() => setNotice(null)}
      title={notice?.title ?? ""}
      description={notice?.description}
      tone={notice?.tone ?? "success"}
      confirmLabel={t("common.ok")}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  badgeWrap: { marginBottom: spacing.md },
  actionRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.sm,
    marginBottom: spacing.md,
    width: "100%",
  },
  label: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
  value: { fontSize: 16, color: colors.text, fontWeight: "500" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginVertical: spacing.md },
  methodRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  section: { fontSize: 16, fontWeight: "600", marginBottom: spacing.sm },
  muted: { color: colors.textMuted },
  visit: { fontSize: 14, color: colors.text, paddingVertical: 4 },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paymentAmount: { fontSize: 16, fontWeight: "600", color: colors.text },
});
