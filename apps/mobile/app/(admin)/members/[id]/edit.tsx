import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n-context";
import { apiFetch } from "@/lib/api";
import { Button, Input, Screen, Title } from "@/components/ui";
import { PlanMonthChips } from "@/components/plan-month-chips";
import { NoticeDialog } from "@/components/confirm-dialog";
import { colors, spacing } from "@/lib/theme";

type SettingsSnapshot = { features: string[] };
type MemberRow = {
  fullName: string;
  phone: string;
  email: string | null;
  subscriptionStart: string;
  subscriptionEnd: string;
  monthlyFee: string;
  notes: string | null;
  inviteStatus: string | null;
  badgeNumber: string | null;
  gender: "MALE" | "FEMALE" | null;
};

function ymd(value: string) {
  return value.slice(0, 10);
}

export default function EditMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [subscriptionStart, setSubscriptionStart] = useState("");
  const [subscriptionEnd, setSubscriptionEnd] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [notes, setNotes] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [sendInvite, setSendInvite] = useState(false);
  const [activePlan, setActivePlan] = useState<number | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const { data: member, isLoading } = useQuery({
    queryKey: ["member", id],
    queryFn: () => apiFetch<MemberRow>(`/members/${id}`),
  });
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<SettingsSnapshot>("/settings"),
  });
  const showBadge = (settings?.features ?? []).includes("badge_numbers");

  useEffect(() => {
    if (!member) return;
    setFullName(member.fullName);
    setPhone(member.phone);
    setEmail(member.email ?? "");
    setBadgeNumber(member.badgeNumber ?? "");
    setSubscriptionStart(ymd(member.subscriptionStart));
    setSubscriptionEnd(ymd(member.subscriptionEnd));
    setMonthlyFee(String(Number(member.monthlyFee)));
    setNotes(member.notes ?? "");
    if (member.gender === "MALE" || member.gender === "FEMALE") {
      setGender(member.gender);
    }
  }, [member]);

  const save = useMutation({
    mutationFn: () =>
      apiFetch(`/members/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          fullName,
          phone,
          email: email || undefined,
          ...(showBadge ? { badgeNumber: badgeNumber.trim() } : {}),
          subscriptionStart,
          subscriptionEnd,
          monthlyFee: Number(monthlyFee),
          notes: notes || undefined,
          gender,
          sendInvite,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["member", id] });
      qc.invalidateQueries({ queryKey: ["members"] });
      router.back();
    },
    onError: (e: Error) => setErrorNotice(e.message),
  });

  if (isLoading || !member) {
    return (
      <Screen>
        <Text style={styles.muted}>{t("common.loading")}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title>{t("detail.editTitle")}</Title>
        <Input label={t("common.name")} value={fullName} onChangeText={setFullName} />
        <Input label={t("common.phone")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Input label={t("members.email")} value={email} onChangeText={setEmail} autoCapitalize="none" />
        <Text style={styles.genderLabel}>{t("members.gender")}</Text>
        <View style={styles.genderRow}>
          {(["MALE", "FEMALE"] as const).map((value) => (
            <Button
              key={value}
              label={t(value === "MALE" ? "members.gender.MALE" : "members.gender.FEMALE")}
              variant={gender === value ? "primary" : "secondary"}
              size="sm"
              onPress={() => setGender(value)}
              style={styles.genderBtn}
            />
          ))}
        </View>
        {showBadge ? (
          <Input
            label={t("form.badgeNumber")}
            value={badgeNumber}
            onChangeText={setBadgeNumber}
            keyboardType="number-pad"
          />
        ) : null}
        {member.inviteStatus !== "ACTIVE" ? (
          <Pressable
            onPress={() => setSendInvite((v) => !v)}
            style={styles.checkRow}
          >
            <View style={[styles.box, sendInvite && styles.boxOn]} />
            <Text style={styles.checkLabel}>{t("members.sendInvite")}</Text>
          </Pressable>
        ) : null}
        <PlanMonthChips
          start={subscriptionStart}
          activePlan={activePlan}
          onChangeEnd={setSubscriptionEnd}
          onChangePlan={setActivePlan}
        />
        <Input
          label={t("common.startDate")}
          value={subscriptionStart}
          onChangeText={(v) => {
            setSubscriptionStart(v);
            setActivePlan(null);
          }}
        />
        <Input
          label={t("common.endDate")}
          value={subscriptionEnd}
          onChangeText={(v) => {
            setSubscriptionEnd(v);
            setActivePlan(null);
          }}
        />
        <Input
          label={t("common.monthlyFee")}
          value={monthlyFee}
          onChangeText={setMonthlyFee}
          keyboardType="numeric"
        />
        <Input label={t("common.notes")} value={notes} onChangeText={setNotes} />
        <Button
          label={t("common.save")}
          onPress={() => save.mutate()}
          loading={save.isPending}
        />
      </ScrollView>
      <NoticeDialog
        visible={errorNotice !== null}
        onClose={() => setErrorNotice(null)}
        title={t("common.error")}
        description={errorNotice ?? undefined}
        tone="critical"
        confirmLabel={t("common.ok")}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xl },
  muted: { padding: spacing.lg, color: colors.textMuted },
  genderLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  genderRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  genderBtn: { flex: 1 },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 44,
    marginVertical: spacing.sm,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  boxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  checkLabel: { color: colors.text, flex: 1 },
});
