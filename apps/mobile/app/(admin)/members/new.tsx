import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { addMonths, format } from "date-fns";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n-context";
import { apiFetch } from "@/lib/api";
import { Button, Input, Screen, Title } from "@/components/ui";
import { NoticeDialog } from "@/components/confirm-dialog";
import { spacing } from "@/lib/theme";

type SettingsSnapshot = {
  features: string[];
};

export default function NewMemberScreen() {
  const { t } = useI18n();
  const today = format(new Date(), "yyyy-MM-dd");
  const defaultEnd = format(addMonths(new Date(), 1), "yyyy-MM-dd");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [subscriptionStart, setSubscriptionStart] = useState(today);
  const [subscriptionEnd, setSubscriptionEnd] = useState(defaultEnd);
  const [monthlyFee, setMonthlyFee] = useState("80");
  const [notes, setNotes] = useState("");
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<SettingsSnapshot>("/settings"),
  });

  const showBadge = (settings?.features ?? []).includes("badge_numbers");

  const create = useMutation({
    mutationFn: () =>
      apiFetch<{ id: string }>("/members", {
        method: "POST",
        body: JSON.stringify({
          fullName,
          phone,
          email: email || undefined,
          ...(showBadge ? { badgeNumber: badgeNumber.trim() } : {}),
          subscriptionStart,
          subscriptionEnd,
          monthlyFee: Number(monthlyFee),
          notes: notes || undefined,
          sendInvite: email.trim().length > 0,
        }),
      }),
    onSuccess: (data) => {
      router.replace(`/(admin)/members/${data.id}`);
    },
    onError: (e: Error) => setErrorNotice(e.message),
  });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title>{t("form.newTitle")}</Title>
        <Input label={t("common.name")} value={fullName} onChangeText={setFullName} />
        <Input label={t("common.phone")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Input label={t("members.email")} value={email} onChangeText={setEmail} autoCapitalize="none" />
        {showBadge ? (
          <Input
            label={t("form.badgeNumber")}
            value={badgeNumber}
            onChangeText={setBadgeNumber}
            keyboardType="number-pad"
          />
        ) : null}
        <Input label={t("common.startDate")} value={subscriptionStart} onChangeText={setSubscriptionStart} />
        <Input label={t("common.endDate")} value={subscriptionEnd} onChangeText={setSubscriptionEnd} />
        <Input label={t("common.monthlyFee")} value={monthlyFee} onChangeText={setMonthlyFee} keyboardType="numeric" />
        <Input label={t("common.notes")} value={notes} onChangeText={setNotes} />
        <Button label={t("form.create")} onPress={() => create.mutate()} loading={create.isPending} />
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
});
